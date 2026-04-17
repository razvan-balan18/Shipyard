import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PipelinesService } from './pipelines.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiBearerAuth()
@Controller('api/pipelines')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PipelinesController {
  constructor(private pipelinesService: PipelinesService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

    return this.pipelinesService.findAll(user.teamId, {
      serviceId,
      status,
      limit:
        parsedLimit && !Number.isNaN(parsedLimit)
          ? Math.min(parsedLimit, 100)
          : undefined,
      offset:
        parsedOffset && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.pipelinesService.findOne(id, user.teamId);
  }
}
