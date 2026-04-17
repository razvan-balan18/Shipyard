import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TeamsService } from './teams.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { UpdateTeamDto } from './dto/update-team.dto';

@ApiBearerAuth()
@Controller('api/teams')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  findOne(@CurrentUser() user: JwtUser) {
    return this.teamsService.findOne(user.teamId);
  }

  @Patch()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(@Body() dto: UpdateTeamDto, @CurrentUser() user: JwtUser) {
    return this.teamsService.update(user.teamId, dto);
  }
}
