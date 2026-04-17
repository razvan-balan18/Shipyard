import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { HealthChecksService } from './health-checks.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';

@ApiBearerAuth()
@Controller('api/health-checks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HealthChecksController {
  constructor(private healthChecksService: HealthChecksService) {}

  @Get()
  getLatest(@CurrentUser() user: JwtUser) {
    return this.healthChecksService.getLatestByTeam(user.teamId);
  }

  @Get(':environmentId/history')
  getHistory(
    @Param('environmentId') environmentId: string,
    @CurrentUser() user: JwtUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.healthChecksService.getHistory(user.teamId, environmentId, {
      limit: limit
        ? Math.max(1, Math.min(parseInt(limit, 10), 100)) || undefined
        : undefined,
      offset: offset
        ? Math.max(0, Math.min(parseInt(offset, 10), 10000)) || undefined
        : undefined,
    });
  }

  @Post(':environmentId/trigger')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  triggerCheck(
    @Param('environmentId') environmentId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.healthChecksService.triggerManualCheck(
      user.teamId,
      environmentId,
    );
  }
}
