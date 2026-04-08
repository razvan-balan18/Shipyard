import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDeploymentStats(teamId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const deployments = await this.prisma.deployment.findMany({
      where: { teamId, startedAt: { gte: since } },
      select: {
        status: true,
        duration: true,
        startedAt: true,
        service: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'asc' },
    });

    const total = deployments.length;
    const successful = deployments.filter((d) => d.status === 'SUCCESS').length;
    const failed = deployments.filter((d) => d.status === 'FAILED').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const durations = deployments
      .filter((d) => d.duration !== null)
      .map((d) => d.duration!);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    // Deployment frequency per day
    const dailyCounts = new Map<string, number>();
    for (const d of deployments) {
      const day = d.startedAt.toISOString().split('T')[0];
      dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
    }
    const frequency = Array.from(dailyCounts.entries()).map(
      ([date, count]) => ({
        date,
        count,
      }),
    );

    // Per-service breakdown
    const serviceMap = new Map<
      string,
      {
        id: string;
        name: string;
        total: number;
        successful: number;
        failed: number;
      }
    >();
    for (const d of deployments) {
      const existing = serviceMap.get(d.service.id) ?? {
        id: d.service.id,
        name: d.service.name,
        total: 0,
        successful: 0,
        failed: 0,
      };
      existing.total++;
      if (d.status === 'SUCCESS') existing.successful++;
      if (d.status === 'FAILED') existing.failed++;
      serviceMap.set(d.service.id, existing);
    }

    return {
      period: { days, since: since.toISOString() },
      totals: {
        total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
      },
      avgDuration,
      frequency,
      byService: Array.from(serviceMap.values()),
    };
  }

  async getMttr(teamId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // MTTR: average time between a FAILED deployment and the next SUCCESS
    // for the same service+environment
    const deployments = await this.prisma.deployment.findMany({
      where: { teamId, startedAt: { gte: since } },
      select: {
        status: true,
        startedAt: true,
        finishedAt: true,
        serviceId: true,
        environmentId: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    const recoveryTimes: number[] = [];
    const failureMap = new Map<string, Date>();

    for (const d of deployments) {
      const key = `${d.serviceId}:${d.environmentId}`;
      if (d.status === 'FAILED') {
        if (!failureMap.has(key)) {
          failureMap.set(key, d.startedAt);
        }
      } else if (d.status === 'SUCCESS' && failureMap.has(key)) {
        const failedAt = failureMap.get(key)!;
        const recoveredAt = d.finishedAt ?? d.startedAt;
        recoveryTimes.push(
          Math.round((recoveredAt.getTime() - failedAt.getTime()) / 1000),
        );
        failureMap.delete(key);
      }
    }

    const avgMttr =
      recoveryTimes.length > 0
        ? Math.round(
            recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length,
          )
        : null;

    return {
      period: { days, since: since.toISOString() },
      avgMttrSeconds: avgMttr,
      recoveryCount: recoveryTimes.length,
    };
  }
}
