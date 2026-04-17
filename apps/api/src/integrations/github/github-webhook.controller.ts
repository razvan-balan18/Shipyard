import {
  Controller,
  Post,
  Headers,
  Body,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';
import type {
  DeploymentPayload,
  DeploymentStatusPayload,
  PushPayload,
  WorkflowRunPayload,
} from './github.service';
import { GitHubService } from './github.service';

interface RawRequest extends Request {
  rawBody?: Buffer;
}

@Controller('api/webhooks')
export class GitHubWebhookController {
  private logger = new Logger('GitHubWebhook');

  constructor(
    private githubService: GitHubService,
    private config: ConfigService,
  ) {}

  @Post('github')
  async handleWebhook(
    @Headers('x-github-event') event: string,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawRequest,
    @Body() payload: unknown,
  ) {
    // Step 1: Verify the webhook signature
    // This ensures the webhook actually came from GitHub, not an attacker
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error(
        'GITHUB_WEBHOOK_SECRET is not configured — rejecting webhook',
      );
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.warn('Raw body not available for signature verification');
      throw new UnauthorizedException('Invalid signature');
    }

    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature ?? '');
    const expBuf = Buffer.from(expectedSignature);
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      this.logger.warn('Invalid webhook signature');
      throw new UnauthorizedException('Invalid signature');
    }

    // Step 2: Route to the appropriate handler based on event type
    this.logger.log(
      `Received GitHub event: ${String(event ?? '').slice(0, 50)}`,
    );

    switch (event) {
      case 'workflow_run':
        await this.githubService.handleWorkflowRun(
          payload as WorkflowRunPayload,
        );
        break;
      case 'deployment':
        await this.githubService.handleDeploymentEvent(
          payload as DeploymentPayload,
        );
        break;
      case 'deployment_status':
        await this.githubService.handleDeploymentStatusEvent(
          payload as DeploymentStatusPayload,
        );
        break;
      case 'push':
        await this.githubService.handlePushEvent(payload as PushPayload);
        break;
      default:
        this.logger.log(
          `Unhandled event type: ${String(event ?? '').slice(0, 50)}`,
        );
    }

    return { status: 'ok' };
  }
}
