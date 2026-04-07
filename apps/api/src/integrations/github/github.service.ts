import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';

@Injectable()
export class GitHubService {
  private logger = new Logger('GitHubService');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async handleWorkflowRun(payload: any) {
    const { workflow_run, repository } = payload;

    // Find the service that matches this repository
    const service = await this.prisma.service.findFirst({
      where: {
        repositoryUrl: repository.html_url,
      },
    });

    if (!service) {
      this.logger.log(
        `No service found for repo: ${String(repository.html_url ?? '').slice(0, 200)}`,
      );
      return;
    }

    // Map GitHub's status to our enum
    const statusMap: Record<string, string> = {
      queued: 'PENDING',
      in_progress: 'RUNNING',
      completed:
        workflow_run.conclusion === 'success'
          ? 'SUCCESS'
          : workflow_run.conclusion === 'cancelled'
            ? 'CANCELLED'
            : 'FAILED',
    };

    // Upsert the pipeline run (create if new, update if existing)
    const pipelineRun = await this.prisma.pipelineRun.upsert({
      where: {
        externalId_provider: {
          externalId: String(workflow_run.id),
          provider: 'GITHUB',
        },
      },
      create: {
        externalId: String(workflow_run.id),
        provider: 'GITHUB',
        status: (statusMap[workflow_run.status] ?? 'FAILED') as any,
        branch: workflow_run.head_branch,
        commitSha: workflow_run.head_sha,
        workflowName: workflow_run.name,
        url: workflow_run.html_url,
        startedAt: new Date(workflow_run.run_started_at),
        finishedAt: workflow_run.updated_at
          ? new Date(workflow_run.updated_at)
          : null,
        serviceId: service.id,
        teamId: service.teamId,
      },
      update: {
        status: (statusMap[workflow_run.status] ?? 'FAILED') as any,
        finishedAt: workflow_run.updated_at
          ? new Date(workflow_run.updated_at)
          : null,
      },
    });

    // Calculate duration if completed
    if (pipelineRun.finishedAt && pipelineRun.startedAt) {
      const duration = Math.round(
        (pipelineRun.finishedAt.getTime() - pipelineRun.startedAt.getTime()) /
          1000,
      );
      await this.prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: { duration },
      });
    }

    // Broadcast real-time update
    this.eventsGateway.emitToTeam(
      service.teamId,
      'pipeline:updated',
      pipelineRun,
    );
  }

  async handleDeploymentEvent(payload: any) {
    const repo = String(payload.repository?.full_name ?? 'unknown').slice(
      0,
      200,
    );
    const env = String(payload.deployment?.environment ?? 'unknown').slice(
      0,
      100,
    );
    this.logger.log(`Deployment event for ${repo}: ${env}`);
    // GitHub deployment events can be used to create Deployment records
    // This integrates with teams using GitHub's deployment API
  }

  async handleDeploymentStatusEvent(payload: any) {
    const state = String(payload.deployment_status?.state ?? 'unknown').slice(
      0,
      50,
    );
    this.logger.log(`Deployment status: ${state}`);
    // Update deployment status based on GitHub's deployment status events
  }

  async handlePushEvent(payload: any) {
    const repo = String(payload.repository?.full_name ?? 'unknown').slice(
      0,
      200,
    );
    const ref = String(payload.ref ?? 'unknown').slice(0, 200);
    this.logger.log(`Push to ${repo}:${ref}`);
    // Could trigger a status update or record the push event
  }
}
