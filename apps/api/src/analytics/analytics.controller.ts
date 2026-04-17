import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiBearerAuth()
@Controller('api/analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('deployments')
  getDeploymentStats(
    @CurrentUser() user: JwtUser,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : undefined;
    return this.analyticsService.getDeploymentStats(
      user.teamId,
      parsedDays && !Number.isNaN(parsedDays) ? Math.min(parsedDays, 365) : 30,
    );
  }

  @Get('mttr')
  getMttr(@CurrentUser() user: JwtUser, @Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : undefined;
    return this.analyticsService.getMttr(
      user.teamId,
      parsedDays && !Number.isNaN(parsedDays) ? Math.min(parsedDays, 365) : 30,
    );
  }
}
