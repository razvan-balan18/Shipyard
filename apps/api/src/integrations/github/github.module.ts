import { Module } from '@nestjs/common';
import { GitHubWebhookController } from './github-webhook.controller';
import { GitHubIntegrationController } from './github-integration.controller';
import { GitHubService } from './github.service';
import { WebsocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [GitHubWebhookController, GitHubIntegrationController],
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GitHubModule {}
