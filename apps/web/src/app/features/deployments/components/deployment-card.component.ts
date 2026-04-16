import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../shared/components/time-ago.component';

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
  template: `
    <div class="deployment-card">
      <app-status-badge [status]="deployment().status" />

      <a class="service-link" [routerLink]="['/services', deployment().serviceId]">
        {{ deployment().service.displayName || deployment().service.name }}
      </a>

      <mat-icon class="arrow-icon">arrow_forward</mat-icon>

      <span class="env-name">{{
        deployment().environment.displayName || deployment().environment.name
      }}</span>

      <span class="branch-name">
        <mat-icon class="row-icon">fork_right</mat-icon>
        {{ deployment().branch }}
      </span>

      <app-commit-sha [sha]="deployment().commitSha" />

      <span class="commit-message">{{ truncatedMessage() }}</span>

      <app-time-ago [timestamp]="deployment().startedAt" />

      <span class="triggered-by">
        <mat-icon class="row-icon">person_outline</mat-icon>
        {{ deployment().triggeredBy }}
      </span>
    </div>
  `,
  styles: [
    `
      .deployment-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-card);
        flex-wrap: wrap;
      }

      .service-link {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--accent);
        text-decoration: none;
      }
      .service-link:hover {
        text-decoration: underline;
      }

      .arrow-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--text-muted);
      }

      .env-name {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .branch-name {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-weight: 600;
        font-size: 0.8rem;
        color: var(--text-primary);
      }

      .row-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--text-muted);
      }

      .commit-message {
        font-size: 0.8rem;
        color: var(--text-secondary);
        flex: 1;
        min-width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .triggered-by {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        white-space: nowrap;
      }
    `,
  ],
})
export class DeploymentCardComponent {
  deployment = input.required<DeploymentItem>();

  truncatedMessage = computed(() => {
    const msg = this.deployment().commitMessage;
    if (!msg) return '';
    return msg.length > 72 ? msg.slice(0, 72) + '...' : msg;
  });
}
