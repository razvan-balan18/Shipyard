import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthChecksController } from './health-checks.controller';
import { HealthChecksService } from './health-checks.service';
import { HealthChecksProcessor } from './health-checks.processor';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'health-checks' }),
    WebsocketModule,
  ],
  controllers: [HealthChecksController],
  providers: [HealthChecksService, HealthChecksProcessor],
  exports: [HealthChecksService],
})
export class HealthChecksModule {}
