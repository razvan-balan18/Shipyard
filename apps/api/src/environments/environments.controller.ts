import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnvironmentsService } from './environments.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Controller('api/environments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EnvironmentsController {
  constructor(private environmentsService: EnvironmentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.environmentsService.findAll(user.teamId, serviceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.environmentsService.findOne(id, user.teamId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  create(@Body() dto: CreateEnvironmentDto, @CurrentUser() user: JwtUser) {
    return this.environmentsService.create(user.teamId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEnvironmentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.environmentsService.update(id, user.teamId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  delete(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.environmentsService.delete(id, user.teamId);
  }
}
