import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiBearerAuth()
@Controller('api/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.usersService.findAll(user.teamId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.usersService.findOne(id, user.teamId);
  }

  @Post('invite')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  invite(@Body() dto: InviteUserDto, @CurrentUser() user: JwtUser) {
    return this.usersService.invite(user.teamId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.usersService.update(id, user.teamId, dto);
  }

  @Patch(':id/role')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.usersService.updateRole(id, user.teamId, dto.role, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.usersService.remove(id, user.teamId, user.id);
  }
}
