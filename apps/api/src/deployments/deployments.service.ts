import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { WsEventType, DeploymentStatus } from '@shipyard/shared';

@Injectable()
export class DeploymentsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll(
    teamId: string,
    filters?: {
      serviceId?: string;
      environmentId?: string;
      status?: DeploymentStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { teamId };
    if (filters?.serviceId) where.serviceId = filters.serviceId;
    if (filters?.environmentId) where.environmentId = filters.environmentId;
    if (
      filters?.status &&
      Object.values(DeploymentStatus).includes(filters.status)
    ) {
      where.status = filters.status;
    }

    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        include: {
          service: { select: { name: true, displayName: true } },
          environment: { select: { name: true, displayName: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
      this.prisma.deployment.count({ where }),
    ]);

    return { deployments, total };
  }

  async create(
    teamId: string,
    data: {
      serviceId: string;
      environmentId: string;
      commitSha: string;
      commitMessage: string;
      branch: string;
      imageTag?: string;
      triggeredBy: string;
      pipelineRunId?: string;
    },
  ) {
    // Verify serviceId and environmentId belong to this team before creating.
    // Without this check, a user could reference another team's resources (IDOR).
    const [service, environment] = await Promise.all([
      this.prisma.service.findFirst({ where: { id: data.serviceId, teamId } }),
      this.prisma.environment.findFirst({
        where: { id: data.environmentId, teamId },
      }),
    ]);

    if (!service) throw new BadRequestException('Service not found');
    if (!environment) throw new BadRequestException('Environment not found');

    const deployment = await this.prisma.deployment.create({
      data: {
        ...data,
        teamId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        service: { select: { name: true, displayName: true } },
        environment: { select: { name: true, displayName: true } },
      },
    });

    // Broadcast to the team in real-time
    this.eventsGateway.emitToTeam(
      teamId,
      WsEventType.DEPLOYMENT_STARTED,
      deployment,
    );

    return deployment;
  }

  async complete(id: string, teamId: string, status: 'SUCCESS' | 'FAILED') {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id, teamId },
    });

    if (!deployment) throw new NotFoundException('Deployment not found');
    if (deployment.status !== 'IN_PROGRESS') {
      throw new ConflictException('Deployment is already completed');
    }

    const finishedAt = new Date();
    // Calculate duration in seconds
    const duration = Math.round(
      (finishedAt.getTime() - deployment.startedAt.getTime()) / 1000,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update the deployment record
      const dep = await tx.deployment.update({
        where: { id },
        data: { status, finishedAt, duration },
        include: {
          service: { select: { name: true, displayName: true } },
          environment: { select: { name: true, displayName: true } },
        },
      });

      // If successful, update the environment's current deployment
      if (status === 'SUCCESS') {
        await tx.environment.update({
          where: { id: deployment.environmentId, teamId },
          data: { currentDeploymentId: id },
        });
      }

      return dep;
    });

    // Broadcast the completion event
    const eventType =
      status === 'SUCCESS'
        ? WsEventType.DEPLOYMENT_COMPLETED
        : WsEventType.DEPLOYMENT_FAILED;

    this.eventsGateway.emitToTeam(teamId, eventType, updated);

    return updated;
  }

  async rollback(
    deploymentId: string,
    teamId: string,
    triggeredByEmail: string,
  ) {
    // Find the deployment we want to rollback to
    const targetDeployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, teamId, status: 'SUCCESS' },
    });

    if (!targetDeployment) {
      throw new NotFoundException(
        'Target deployment not found or was not successful',
      );
    }

    // Create a new deployment that represents the rollback
    const rollbackDeployment = await this.create(teamId, {
      serviceId: targetDeployment.serviceId,
      environmentId: targetDeployment.environmentId,
      commitSha: targetDeployment.commitSha,
      commitMessage: `Rollback to ${targetDeployment.commitSha.substring(0, 7)}`,
      branch: targetDeployment.branch,
      imageTag: targetDeployment.imageTag ?? undefined,
      triggeredBy: triggeredByEmail,
    });

    // In a real scenario, you'd trigger the actual rollback here
    // (e.g., telling Docker to pull and run the old image tag)
    // For now, we immediately mark it as successful
    // TODO: Integrate with Docker to actually rollback

    return this.complete(rollbackDeployment.id, teamId, 'SUCCESS');
  }
}
