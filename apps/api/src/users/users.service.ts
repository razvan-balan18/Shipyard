import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, Prisma } from '../generated/prisma/client';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(teamId: string) {
    return this.prisma.user.findMany({
      where: { teamId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, teamId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        githubUsername: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async invite(teamId: string, dto: InviteUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          role: dto.role ?? 'MEMBER',
          teamId,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
      });

      return user;
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async update(id: string, teamId: string, dto: UpdateUserDto) {
    await this.findOne(id, teamId);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  async updateRole(
    id: string,
    teamId: string,
    role: UserRole,
    currentUserId: string,
  ) {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot change your own role');
    }

    const targetUser = await this.findOne(id, teamId);

    if (targetUser.role === 'OWNER') {
      throw new BadRequestException('Cannot change the role of the team owner');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });
  }

  async remove(id: string, teamId: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot remove yourself from the team');
    }

    const targetUser = await this.findOne(id, teamId);

    if (targetUser.role === 'OWNER') {
      throw new BadRequestException('Cannot remove the team owner');
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
