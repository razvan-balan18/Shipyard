import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { GitHubService } from './github.service';

@Controller('api/integrations/github')
@UseGuards(AuthGuard('jwt'))
export class GitHubIntegrationController {
  constructor(private githubService: GitHubService) {}

  // Intentionally open to all roles including VIEWER — returns read-only
  // aggregate counts and service names; no secrets or sensitive config exposed.
  @Get()
  getStatus(@CurrentUser() user: JwtUser) {
    return this.githubService.getStatus(user.teamId);
  }
}
