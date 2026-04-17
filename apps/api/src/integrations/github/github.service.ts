import { Injectable, Logger } from '@nestjs/common';
import { PipelineStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { WsEventType } from '@shipyard/shared';

export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  head_branch: string;
  head_sha: string;
  name: string;
  html_url: string;
  run_started_at: string;
  updated_at: string | null;
}

export interface Repository {
  html_url: string;
  full_name: string;
}

export interface WorkflowRunPayload {
  workflow_run: WorkflowRun;
  repository: Repository;
}

export interface GitHubDeployment {
  id: number;
  environment: string;
  ref: string;
  sha: string;
  creator: { login: string } | null;
}

export interface DeploymentPayload {
  deployment: GitHubDeployment;
  repository: Repository;
  sender: { login: string } | null;
}

export interface DeploymentStatusPayload {
  deployment_status: { state: string };
  deployment: { id: number };
  repository: Repository;
}

export interface PushPayload {
  repository: Repository;
  ref: string;
  after: string;
  commits?: Array<{ message: string }>;
  pusher?: { name: string };
}

export interface GitHubIntegrationStatus {
  eventsReceived: number;
  lastEventAt: string | null;
  connectedServices: Array<{ id: string; name: string; repositoryUrl: string }>;
}

@Injectable()
export class GitHubService {
  private logger = new Logger('GitHubService');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async handleWorkflowRun(payload: WorkflowRunPayload) {
    const { workflow_run, repository } = payload;

    const service = await this.prisma.service.findFirst({
      where: { repositoryUrl: repository.html_url },
    });

    if (!service) {
      this.logger.log(
        `No service found for repo: ${String(repository.html_url ?? '').slice(0, 200)}`,
      );
      return;
    }

    const statusMap: Record<string, PipelineStatus> = {
      queued: PipelineStatus.PENDING,
      in_progress: PipelineStatus.RUNNING,
      completed:
        workflow_run.conclusion === 'success'
          ? PipelineStatus.SUCCESS
          : workflow_run.conclusion === 'cancelled'
            ? PipelineStatus.CANCELLED
            : PipelineStatus.FAILED,
    };

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
        status: statusMap[workflow_run.status] ?? PipelineStatus.FAILED,
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
        status: statusMap[workflow_run.status] ?? PipelineStatus.FAILED,
        finishedAt: workflow_run.updated_at
          ? new Date(workflow_run.updated_at)
          : null,
      },
    });

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

    this.eventsGateway.emitToTeam(
      service.teamId,
      WsEventType.PIPELINE_UPDATED,
      pipelineRun,
    );
  }

  async handleDeploymentEvent(payload: DeploymentPayload) {
    const { deployment, repository } = payload;

    const service = await this.prisma.service.findFirst({
      where: { repositoryUrl: repository.html_url },
    });

    if (!service) {
      this.logger.log(
        `No service found for deployment on ${String(repository?.full_name ?? '').slice(0, 200)}`,
      );
      return;
    }

    // Strip newlines from webhook-supplied string to prevent log injection
    const envName = String(deployment.environment ?? '')
      .slice(0, 100)
      .replace(/\r?\n/g, ' ');
    const environment = await this.prisma.environment.findFirst({
      where: {
        serviceId: service.id,
        name: { equals: envName, mode: 'insensitive' },
      },
    });

    if (!environment) {
      this.logger.warn(
        `No environment matching '${envName}' for service ${service.name} — skipping auto-deployment`,
      );
      return;
    }

    const triggeredBy = String(
      payload.sender?.login ?? deployment.creator?.login ?? 'github',
    ).slice(0, 200);
    const commitSha = String(deployment.sha ?? '').slice(0, 40);
    const branch = String(deployment.ref ?? 'main')
      .slice(0, 200)
      .replace(/\r?\n/g, ' ');

    const dep = await this.prisma.deployment.create({
      data: {
        serviceId: service.id,
        environmentId: environment.id,
        teamId: service.teamId,
        status: 'IN_PROGRESS',
        commitSha,
        // envName is attacker-controlled webhook data — stored in DB, never rendered as HTML
        commitMessage: `GitHub deployment to ${envName} (${commitSha.slice(0, 7)})`,
        branch,
        triggeredBy,
        startedAt: new Date(),
        // Store GitHub's deployment ID so deployment_status events can find this record
        metadata: { githubDeploymentId: String(deployment.id) },
      },
      include: {
        service: { select: { name: true, displayName: true } },
        environment: { select: { name: true, displayName: true } },
      },
    });

    this.eventsGateway.emitToTeam(
      service.teamId,
      WsEventType.DEPLOYMENT_STARTED,
      dep,
    );

    this.logger.log(
      `Auto-created deployment ${dep.id} for GitHub deployment ${deployment.id} → ${service.name}/${environment.name}`,
    );
  }

  async handleDeploymentStatusEvent(payload: DeploymentStatusPayload) {
    const state = String(payload.deployment_status?.state ?? '').slice(0, 50);

    // Only act on terminal states — intermediate states (queued, pending, in_progress, waiting) are no-ops
    if (!['success', 'failure', 'error'].includes(state)) {
      this.logger.log(
        `Deployment status update (non-terminal state: ${state}) — skipping`,
      );
      return;
    }

    const githubDeploymentId = String(payload.deployment?.id ?? '');

    // Resolve teamId from the repository URL so the lookup is scoped to one team,
    // preventing a crafted webhook from completing another team's deployment (IDOR).
    const service = await this.prisma.service.findFirst({
      where: { repositoryUrl: payload.repository?.html_url },
    });

    if (!service) {
      this.logger.warn(
        `deployment_status: no service found for repo ${String(payload.repository?.full_name ?? '').slice(0, 200)}`,
      );
      return;
    }

    const shipyardDeployment = await this.prisma.deployment.findFirst({
      where: {
        teamId: service.teamId,
        metadata: {
          path: ['githubDeploymentId'],
          equals: githubDeploymentId,
        },
        status: 'IN_PROGRESS',
      },
    });

    if (!shipyardDeployment) {
      this.logger.warn(
        `No IN_PROGRESS deployment found for GitHub deployment ID ${githubDeploymentId}`,
      );
      return;
    }

    const newStatus = state === 'success' ? 'SUCCESS' : 'FAILED';
    const finishedAt = new Date();
    const duration = Math.round(
      (finishedAt.getTime() - shipyardDeployment.startedAt.getTime()) / 1000,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const dep = await tx.deployment.update({
        where: { id: shipyardDeployment.id },
        data: { status: newStatus, finishedAt, duration },
        include: {
          service: { select: { name: true, displayName: true } },
          environment: { select: { name: true, displayName: true } },
        },
      });

      if (newStatus === 'SUCCESS') {
        await tx.environment.update({
          where: { id: shipyardDeployment.environmentId },
          data: { currentDeploymentId: shipyardDeployment.id },
        });
      }

      return dep;
    });

    const eventType =
      newStatus === 'SUCCESS'
        ? WsEventType.DEPLOYMENT_COMPLETED
        : WsEventType.DEPLOYMENT_FAILED;

    this.eventsGateway.emitToTeam(
      shipyardDeployment.teamId,
      eventType,
      updated,
    );

    this.logger.log(
      `Deployment ${shipyardDeployment.id} → ${newStatus} (GitHub deployment ${githubDeploymentId})`,
    );
  }

  async handlePushEvent(payload: PushPayload) {
    const fullName = String(payload.repository?.full_name ?? '').slice(0, 200);
    const ref = String(payload.ref ?? '').slice(0, 200);

    const service = await this.prisma.service.findFirst({
      where: { repositoryUrl: payload.repository?.html_url },
    });

    if (!service) {
      this.logger.log(`Push received for unknown repo: ${fullName}:${ref}`);
      return;
    }

    this.logger.log(
      `Push to ${fullName}:${ref} matched service ${service.name}`,
    );
  }

  async getStatus(teamId: string): Promise<GitHubIntegrationStatus> {
    const [eventsReceived, lastRun, connectedServices] = await Promise.all([
      this.prisma.pipelineRun.count({ where: { teamId, provider: 'GITHUB' } }),
      this.prisma.pipelineRun.findFirst({
        where: { teamId, provider: 'GITHUB' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.service.findMany({
        where: { teamId, repositoryProvider: 'GITHUB' },
        select: { id: true, name: true, repositoryUrl: true },
      }),
    ]);

    return {
      eventsReceived,
      lastEventAt: lastRun?.createdAt?.toISOString() ?? null,
      connectedServices,
    };
  }
}
