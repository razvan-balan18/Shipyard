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
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import {
  CurrentUser,
  type JwtUser,
} from '../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';

@ApiBearerAuth()
@Controller('api/notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // === In-app notifications ===

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    let take: number | undefined;
    if (limit) {
      const parsed = parseInt(limit, 10);
      take = Number.isNaN(parsed) ? undefined : Math.min(parsed, 100);
    }
    return this.notificationsService.findForUser(user.id, user.teamId, take);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: JwtUser) {
    return this.notificationsService.getUnreadCount(user.id, user.teamId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.notificationsService.markAsRead(id, user.id, user.teamId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: JwtUser) {
    return this.notificationsService.markAllAsRead(user.id, user.teamId);
  }

  // === Notification channels (Slack, Discord, Webhook) ===

  @Get('channels')
  findAllChannels(@CurrentUser() user: JwtUser) {
    return this.notificationsService.findAllChannels(user.teamId);
  }

  @Get('channels/:id')
  findChannel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.notificationsService.findChannel(id, user.teamId);
  }

  @Post('channels')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createChannel(
    @Body() dto: CreateNotificationChannelDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.createChannel(user.teamId, dto);
  }

  @Patch('channels/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateChannel(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationChannelDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.updateChannel(id, user.teamId, dto);
  }

  @Delete('channels/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  deleteChannel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.notificationsService.deleteChannel(id, user.teamId);
  }

  @Post('channels/:id/test')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  testChannel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.notificationsService.testChannel(id, user.teamId);
  }
}
