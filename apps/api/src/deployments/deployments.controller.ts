import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeploymentsService } from './deployments.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { DeploymentStatus } from '@shipyard/shared';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { CompleteDeploymentDto } from './dto/complete-deployment.dto';

@Controller('api/deployments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DeploymentsController {
  constructor(private deploymentsService: DeploymentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('serviceId') serviceId?: string,
    @Query('environmentId') environmentId?: string,
    @Query('status') status?: DeploymentStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.deploymentsService.findAll(user.teamId, {
      serviceId,
      environmentId,
      status,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  create(@Body() dto: CreateDeploymentDto, @CurrentUser() user: JwtUser) {
    return this.deploymentsService.create(user.teamId, {
      ...dto,
      triggeredBy: user.email,
    });
  }

  @Patch(':id/complete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteDeploymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.deploymentsService.complete(id, user.teamId, dto.status);
  }

  @Post(':id/rollback')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  rollback(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.deploymentsService.rollback(id, user.teamId, user.email);
  }
}
