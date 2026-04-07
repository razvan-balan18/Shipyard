import { Module } from '@nestjs/common';
import { GitHubModule } from './github/github.module';
import { DockerModule } from './docker/docker.module';

@Module({
  imports: [GitHubModule, DockerModule],
  exports: [GitHubModule, DockerModule],
})
export class IntegrationsModule {}
