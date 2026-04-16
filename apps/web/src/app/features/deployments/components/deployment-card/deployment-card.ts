import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { StatusBadgeComponent } from '../../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../../shared/components/time-ago.component';

export interface DeploymentItem {
  id: string;
  serviceId: string;
  environmentId: string;
  status: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  service: { name: string; displayName: string };
  environment: { name: string; displayName: string };
}

@Component({
  selector: 'app-deployment-card',
  standalone: true,
  imports: [
    RouterModule,
    MatIconModule,
    StatusBadgeComponent,
    CommitShaComponent,
    TimeAgoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deployment-card.html',
  styleUrl: './deployment-card.scss',
})
export class DeploymentCardComponent {
  deployment = input.required<DeploymentItem>();

  truncatedMessage = computed(() => {
    const msg = this.deployment().commitMessage;
    if (!msg) return '';
    return msg.length > 72 ? msg.slice(0, 72) + '...' : msg;
  });
}
