import { Component, input, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ServiceSummary } from '@shipyard/shared';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { TimeAgoComponent } from '../../../shared/components/time-ago.component';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [RouterModule, StatusBadgeComponent, TimeAgoComponent],
  template: `
    <div class="service-card">
      <div class="card-header">
        <h3 class="service-name">
          <a [routerLink]="['/services', service().id]">{{ service().displayName }}</a>
        </h3>
        <span class="repo-url">{{ repoShort() }}</span>
      </div>

      <div class="environments">
        @for (env of service().environments; track env.id) {
          <div class="env-row">
            <span class="env-name">{{ env.displayName }}</span>
            <app-status-badge [status]="env.status" />
            @if (env.currentDeployment) {
              <app-time-ago [timestamp]="env.currentDeployment.startedAt" />
            }
          </div>
        } @empty {
          <p class="no-envs">No environments</p>
        }
      </div>

      @if (service().lastDeployment) {
        <div class="last-deployment">
          <span class="label">Last deploy:</span>
          <app-time-ago [timestamp]="service().lastDeployment!.startedAt" />
          <span class="branch">{{ service().lastDeployment!.branch }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .service-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        transition: border-color 0.15s;
      }
      .service-card:hover {
        border-color: var(--accent);
      }

      .card-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .service-name a {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        text-decoration: none;
      }
      .service-name a:hover {
        color: var(--accent);
      }
      .repo-url {
        font-size: 0.75rem;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .environments {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .env-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .env-name {
        font-size: 0.8rem;
        color: var(--text-secondary);
        min-width: 70px;
        text-transform: capitalize;
      }
      .no-envs {
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      .last-deployment {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
        font-size: 0.8rem;
      }
      .label {
        color: var(--text-muted);
      }
      .branch {
        font-family: monospace;
        font-size: 0.75rem;
        color: var(--text-secondary);
        background: var(--bg-hover);
        padding: 1px 6px;
        border-radius: 4px;
      }
    `,
  ],
})
export class ServiceCardComponent {
  service = input.required<ServiceSummary>();
  repoShort = computed(() => this.service().repositoryUrl.replace(/^https?:\/\/(www\.)?/, ''));
}
