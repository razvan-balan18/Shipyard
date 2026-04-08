import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { Prisma } from '../generated/prisma/client';
import { WsEventType } from '@shipyard/shared';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';

const FETCH_TIMEOUT_MS = 10_000;

// Block requests to private/reserved IP ranges and cloud metadata endpoints
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]/,
  /^\[fc/i,
  /^\[fd/i,
  /^\[fe80:/i,
];

@Injectable()
export class NotificationsService {
  private logger = new Logger('NotificationsService');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // === In-app notifications ===

  async notify(params: {
    teamId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
    userId?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || {},
        userId: params.userId,
        teamId: params.teamId,
      },
    });

    this.eventsGateway.emitToTeam(
      params.teamId,
      WsEventType.NOTIFICATION_NEW,
      notification,
    );

    // Fire-and-forget — don't block the caller on external HTTP calls
    this.sendToExternalChannels(
      params.teamId,
      params.type,
      params.title,
      params.message,
    ).catch((error) => {
      this.logger.error(
        `Failed to fan-out external channels: ${error instanceof Error ? error.message : error}`,
      );
    });

    return notification;
  }

  async findForUser(userId: string, teamId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: {
        teamId,
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string, teamId: string) {
    const count = await this.prisma.notification.count({
      where: {
        teamId,
        read: false,
        OR: [{ userId }, { userId: null }],
      },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string, teamId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        teamId,
        OR: [{ userId }, { userId: null }],
      },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string, teamId: string) {
    return this.prisma.notification.updateMany({
      where: {
        teamId,
        OR: [{ userId }, { userId: null }],
        read: false,
      },
      data: { read: true },
    });
  }

  // === Notification channels ===

  async findAllChannels(teamId: string) {
    return this.prisma.notificationChannel.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findChannel(id: string, teamId: string) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id, teamId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');
    return channel;
  }

  async createChannel(teamId: string, dto: CreateNotificationChannelDto) {
    this.validateChannelConfig(dto.type, dto.config);

    return this.prisma.notificationChannel.create({
      data: {
        type: dto.type,
        name: dto.name,
        config: dto.config,
        events: dto.events,
        enabled: dto.enabled ?? true,
        teamId,
      },
    });
  }

  async updateChannel(
    id: string,
    teamId: string,
    dto: UpdateNotificationChannelDto,
  ) {
    const channel = await this.findChannel(id, teamId);

    if (dto.config !== undefined) {
      this.validateChannelConfig(channel.type, dto.config);
    }

    const data: Prisma.NotificationChannelUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.events !== undefined) data.events = dto.events;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;

    return this.prisma.notificationChannel.update({
      where: { id },
      data,
    });
  }

  async deleteChannel(id: string, teamId: string) {
    await this.findChannel(id, teamId);

    return this.prisma.notificationChannel.delete({
      where: { id },
    });
  }

  async testChannel(id: string, teamId: string) {
    const channel = await this.findChannel(id, teamId);
    const config = this.validateChannelConfig(channel.type, channel.config);

    switch (channel.type) {
      case 'SLACK':
        await this.sendSlackNotification(
          config.webhookUrl,
          'Shipyard Test',
          'This is a test notification from Shipyard.',
        );
        break;
      case 'DISCORD':
        await this.sendDiscordNotification(
          config.webhookUrl,
          'Shipyard Test',
          'This is a test notification from Shipyard.',
        );
        break;
      case 'WEBHOOK':
        await this.sendWebhookNotification(config.url, {
          eventType: 'test',
          title: 'Shipyard Test',
          message: 'This is a test notification from Shipyard.',
        });
        break;
    }

    return { success: true };
  }

  // === External channel senders ===

  private async sendToExternalChannels(
    teamId: string,
    eventType: string,
    title: string,
    message: string,
  ) {
    const channels = await this.prisma.notificationChannel.findMany({
      where: {
        teamId,
        enabled: true,
        events: { has: eventType },
      },
    });

    const results = await Promise.allSettled(
      channels.map(async (channel) => {
        const config = this.validateChannelConfig(channel.type, channel.config);

        switch (channel.type) {
          case 'SLACK':
            await this.sendSlackNotification(config.webhookUrl, title, message);
            break;
          case 'DISCORD':
            await this.sendDiscordNotification(
              config.webhookUrl,
              title,
              message,
            );
            break;
          case 'WEBHOOK':
            await this.sendWebhookNotification(config.url, {
              eventType,
              title,
              message,
            });
            break;
        }
      }),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to send to channel ${channels[i].name}: ${result.reason instanceof Error ? result.reason.message : result.reason}`,
        );
      }
    }
  }

  private validateChannelConfig(
    type: string,
    config: unknown,
  ): Record<string, string> {
    const obj = config as Record<string, unknown>;

    if (type === 'SLACK' || type === 'DISCORD') {
      if (typeof obj?.webhookUrl !== 'string' || !obj.webhookUrl) {
        throw new BadRequestException(
          `Channel config missing valid webhookUrl`,
        );
      }
      this.assertSafeUrl(obj.webhookUrl);
      return { webhookUrl: obj.webhookUrl };
    }

    if (type === 'WEBHOOK') {
      if (typeof obj?.url !== 'string' || !obj.url) {
        throw new BadRequestException(`Channel config missing valid url`);
      }
      this.assertSafeUrl(obj.url);
      return { url: obj.url };
    }

    throw new BadRequestException(`Unknown channel type: ${type}`);
  }

  private assertSafeUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('URL must use http or https');
    }

    const hostname = parsed.hostname;
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new BadRequestException(
          'URLs pointing to private/internal networks are not allowed',
        );
      }
    }
  }

  private async sendSlackNotification(
    webhookUrl: string,
    title: string,
    message: string,
  ) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: title },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: message },
          },
        ],
      }),
    });
  }

  private async sendDiscordNotification(
    webhookUrl: string,
    title: string,
    message: string,
  ) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: message,
            color: 0x00ff00,
          },
        ],
      }),
    });
  }

  private async sendWebhookNotification(
    url: string,
    payload: Record<string, string>,
  ) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify(payload),
    });
  }
}
