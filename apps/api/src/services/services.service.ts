import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(teamId: string) {
    return this.prisma.service.findMany({
      where: { teamId },
      include: {
        environments: {
          orderBy: { order: 'asc' },
          include: {
            currentDeployment: true,
          },
        },
        // Get the most recent deployment for each service
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, teamId },
      include: {
        environments: {
          orderBy: { order: 'asc' },
          include: {
            currentDeployment: true,
          },
        },
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
        pipelineRuns: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async create(teamId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        ...dto,
        teamId,
      },
    });
  }

  async update(id: string, teamId: string, data: UpdateServiceDto) {
    // Verify the service belongs to this team
    await this.findOne(id, teamId);

    return this.prisma.service.update({
      where: { id, teamId },
      data,
    });
  }

  async delete(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.service.delete({
      where: { id, teamId },
    });
  }
}
