import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { HealthChecksModule } from './health-checks/health-checks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EnvironmentsModule } from './environments/environments.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    ServicesModule,
    WebsocketModule,
    DeploymentsModule,
    IntegrationsModule,
    HealthChecksModule,
    NotificationsModule,
    EnvironmentsModule,
    UsersModule,
    TeamsModule,
    PipelinesModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
