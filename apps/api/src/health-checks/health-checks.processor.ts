import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { EnvironmentStatus } from '../generated/prisma/client';
import { WsEventType } from '@shipyard/shared';
import { isUrlSafe } from './url-validator';

@Processor('health-checks')
export class HealthChecksProcessor extends WorkerHost {
  private logger = new Logger('HealthChecks');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<{ environmentId: string }>) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: job.data.environmentId },
      include: { service: true },
    });

    if (!environment?.healthCheckUrl) return;

    if (!(await isUrlSafe(environment.healthCheckUrl))) {
      this.logger.warn(
        `Blocked health check for ${environment.name}: URL resolves to private/reserved address`,
      );
      return;
    }

    let status: EnvironmentStatus = EnvironmentStatus.DOWN;
    let responseTime: number | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(environment.healthCheckUrl, {
        signal: controller.signal,
        redirect: 'manual',
      });
      clearTimeout(timeout);

      responseTime = Date.now() - startTime;
      statusCode = response.status;

      if (response.status >= 300 && response.status < 400) {
        // Redirects are blocked to prevent SSRF bypass via open redirects
        status = EnvironmentStatus.DEGRADED;
        errorMessage = `Redirect not followed (${response.status})`;
      } else if (response.ok) {
        status =
          responseTime > 5000
            ? EnvironmentStatus.DEGRADED
            : EnvironmentStatus.HEALTHY;
      } else if (response.status >= 500) {
        status = EnvironmentStatus.DOWN;
      } else {
        status = EnvironmentStatus.DEGRADED;
      }
    } catch (error) {
      responseTime = Date.now() - startTime;
      errorMessage = error instanceof Error ? error.message : String(error);
      status = EnvironmentStatus.DOWN;
    }

    await this.prisma.healthCheckResult.create({
      data: {
        status,
        responseTime,
        statusCode,
        errorMessage,
        environmentId: environment.id,
      },
    });

    await this.prisma.environment.update({
      where: { id: environment.id },
      data: {
        status,
        lastHealthCheckAt: new Date(),
      },
    });

    const previousStatus = environment.status;
    if (status !== previousStatus) {
      this.eventsGateway.emitToTeam(
        environment.teamId,
        WsEventType.HEALTH_CHECK_UPDATED,
        {
          environmentId: environment.id,
          environmentName: environment.displayName,
          serviceName: environment.service.displayName,
          previousStatus,
          currentStatus: status,
          responseTime,
        },
      );

      this.logger.log(
        `${environment.service.name}/${environment.name}: ${previousStatus} → ${status}`,
      );
    }
  }
}
