import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineStatus, Prisma } from '../generated/prisma/client';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    teamId: string,
    filters?: {
      serviceId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.PipelineRunWhereInput = { teamId };
    if (filters?.serviceId) where.serviceId = filters.serviceId;
    if (
      filters?.status &&
      Object.values(PipelineStatus).includes(filters.status as PipelineStatus)
    ) {
      where.status = filters.status as PipelineStatus;
    }

    const [pipelineRuns, total] = await Promise.all([
      this.prisma.pipelineRun.findMany({
        where,
        include: {
          service: { select: { name: true, displayName: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
      this.prisma.pipelineRun.count({ where }),
    ]);

    return { pipelineRuns, total };
  }

  async findOne(id: string, teamId: string) {
    const pipelineRun = await this.prisma.pipelineRun.findFirst({
      where: { id, teamId },
      include: {
        service: { select: { name: true, displayName: true } },
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!pipelineRun) {
      throw new NotFoundException('Pipeline run not found');
    }

    return pipelineRun;
  }
}
