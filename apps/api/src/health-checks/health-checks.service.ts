import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthChecksService implements OnModuleInit {
  private logger = new Logger('HealthChecksService');

  constructor(
    @InjectQueue('health-checks') private healthQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.scheduleAllHealthChecks();
  }

  async scheduleAllHealthChecks() {
    const existing = await this.healthQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.healthQueue.removeRepeatableByKey(job.key);
    }

    const environments = await this.prisma.environment.findMany({
      where: {
        healthCheckUrl: { not: null },
      },
    });

    for (const env of environments) {
      await this.healthQueue.add(
        'check',
        { environmentId: env.id },
        {
          repeat: {
            every: (env.healthCheckInterval || 30) * 1000,
          },
          jobId: `health-${env.id}`,
        },
      );

      this.logger.log(
        `Scheduled health check for ${env.name} every ${env.healthCheckInterval}s`,
      );
    }
  }

  async rescheduleForEnvironment(environmentId: string) {
    const repeatableJobs = await this.healthQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(
      (j) => j.id === `health-${environmentId}`,
    );
    if (existing) {
      await this.healthQueue.removeRepeatableByKey(existing.key);
    }

    const env = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });

    if (env?.healthCheckUrl) {
      await this.healthQueue.add(
        'check',
        { environmentId: env.id },
        {
          repeat: { every: (env.healthCheckInterval || 30) * 1000 },
          jobId: `health-${env.id}`,
        },
      );
      this.logger.log(
        `Rescheduled health check for ${env.name} every ${env.healthCheckInterval}s`,
      );
    }
  }

  async removeForEnvironment(environmentId: string) {
    const repeatableJobs = await this.healthQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(
      (j) => j.id === `health-${environmentId}`,
    );
    if (existing) {
      await this.healthQueue.removeRepeatableByKey(existing.key);
      this.logger.log(`Removed health check for environment ${environmentId}`);
    }
  }

  async getHistory(
    teamId: string,
    environmentId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, teamId },
    });

    if (!environment) throw new NotFoundException('Environment not found');

    const [results, total] = await Promise.all([
      this.prisma.healthCheckResult.findMany({
        where: { environmentId },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.healthCheckResult.count({ where: { environmentId } }),
    ]);

    return { results, total };
  }

  async getLatestByTeam(teamId: string) {
    const environments = await this.prisma.environment.findMany({
      where: { teamId, healthCheckUrl: { not: null } },
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
        lastHealthCheckAt: true,
        healthCheckUrl: true,
        healthCheckInterval: true,
        service: { select: { id: true, name: true, displayName: true } },
        healthCheckResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return environments.map((env) => ({
      environmentId: env.id,
      environmentName: env.displayName,
      serviceId: env.service.id,
      serviceName: env.service.displayName,
      status: env.status,
      lastCheckAt: env.lastHealthCheckAt,
      healthCheckUrl: env.healthCheckUrl,
      healthCheckInterval: env.healthCheckInterval,
      lastResult: env.healthCheckResults[0] ?? null,
    }));
  }

  async triggerManualCheck(teamId: string, environmentId: string) {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, teamId, healthCheckUrl: { not: null } },
    });

    if (!environment) {
      throw new NotFoundException(
        'Environment not found or has no health check URL',
      );
    }

    // Per-environment cooldown: reject if last check was < 10s ago
    const recentResult = await this.prisma.healthCheckResult.findFirst({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
    });

    if (
      recentResult &&
      Date.now() - recentResult.createdAt.getTime() < 10_000
    ) {
      throw new ConflictException(
        'Health check was run recently, please wait before triggering again',
      );
    }

    await this.healthQueue.add(
      'check',
      { environmentId },
      { jobId: `health-manual-${environmentId}-${Date.now()}` },
    );

    return { message: 'Health check triggered', environmentId };
  }
}
