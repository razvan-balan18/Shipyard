import { Component, input } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DeploymentSummary } from '@shipyard/shared';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-recent-deployments',
  standalone: true,
  imports: [
    SlicePipe,
    RouterModule,
    StatusBadgeComponent,
    CommitShaComponent,
    TimeAgoComponent,
    EmptyStateComponent,
  ],
  template: `
    @if (deployments().length === 0) {
      <app-empty-state
        message="No deployments yet."
        actionLabel="View all deployments"
        actionLink="/deployments"
      />
    } @else {
      <div class="deployments-list">
        @for (d of deployments(); track d.id) {
          <div class="deployment-row">
            <app-status-badge [status]="d.status" />

            <div class="deploy-meta">
              <span class="service-env">
                <a [routerLink]="['/services', d.serviceId]" class="service-link">{{
                  d.serviceName
                }}</a>
                <span class="sep">›</span>
                <span class="env">{{ d.environmentName }}</span>
              </span>
              <span class="commit-msg">{{ d.commitMessage | slice: 0 : 72 }}</span>
            </div>

            <div class="deploy-right">
              <app-commit-sha [sha]="d.commitSha" />
              <app-time-ago [timestamp]="d.startedAt" />
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .deployments-list {
        display: flex;
        flex-direction: column;
      }

      .deployment-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
      }
      .deployment-row:last-child {
        border-bottom: none;
      }

      .deploy-meta {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
      }
      .service-env {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .service-link {
        color: var(--text-primary);
        text-decoration: none;
      }
      .service-link:hover {
        color: var(--accent);
      }
      .sep {
        color: var(--text-muted);
      }
      .env {
        color: var(--text-secondary);
        text-transform: capitalize;
      }

      .commit-msg {
        font-size: 0.78rem;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .deploy-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
        flex-shrink: 0;
      }
    `,
  ],
})
export class RecentDeploymentsComponent {
  deployments = input.required<DeploymentSummary[]>();
}
