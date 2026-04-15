import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthChecksService } from '../health-checks/health-checks.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(
    private prisma: PrismaService,
    private healthChecksService: HealthChecksService,
  ) {}

  async findAll(teamId: string, serviceId?: string) {
    return this.prisma.environment.findMany({
      where: { teamId, ...(serviceId ? { serviceId } : {}) },
      include: {
        currentDeployment: true,
        service: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const environment = await this.prisma.environment.findFirst({
      where: { id, teamId },
      include: {
        currentDeployment: true,
        service: { select: { id: true, name: true, displayName: true } },
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        healthCheckResults: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    return environment;
  }

  async create(teamId: string, dto: CreateEnvironmentDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, teamId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const environment = await this.prisma.environment.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        order: dto.order,
        url: dto.url,
        healthCheckUrl: dto.healthCheckUrl,
        healthCheckInterval: dto.healthCheckInterval ?? 30,
        serviceId: dto.serviceId,
        teamId,
      },
      include: {
        service: { select: { id: true, name: true, displayName: true } },
      },
    });

    if (dto.healthCheckUrl) {
      await this.healthChecksService.rescheduleForEnvironment(environment.id);
    }

    return environment;
  }

  async update(id: string, teamId: string, dto: UpdateEnvironmentDto) {
    await this.findOne(id, teamId);

    const environment = await this.prisma.environment.update({
      where: { id },
      data: dto,
      include: {
        service: { select: { id: true, name: true, displayName: true } },
      },
    });

    if (
      dto.healthCheckUrl !== undefined ||
      dto.healthCheckInterval !== undefined
    ) {
      await this.healthChecksService.rescheduleForEnvironment(id);
    }

    return environment;
  }

  async delete(id: string, teamId: string) {
    await this.findOne(id, teamId);
    await this.healthChecksService.removeForEnvironment(id);

    return this.prisma.environment.delete({ where: { id } });
  }
}
