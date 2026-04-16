import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RouterModule } from '@angular/router';

import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';

export interface EnvironmentStatusInput {
  id: string;
  name: string;
  displayName: string;
  status: string;
  currentDeploymentId?: string | null;
}

@Component({
  selector: 'app-environment-status',
  standalone: true,
  imports: [RouterModule, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showLink()) {
      <a [routerLink]="envLink()" class="env-row env-row--link">
        <span class="env-name">{{ displayLabel() }}</span>
        <app-status-badge [status]="environment().status" />
      </a>
    } @else {
      <div class="env-row">
        <span class="env-name">{{ displayLabel() }}</span>
        <app-status-badge [status]="environment().status" />
      </div>
    }
  `,
  styles: [
    `
      .env-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.35rem 0;
      }

      .env-row--link {
        text-decoration: none;
        color: inherit;
        border-radius: 6px;
        padding: 0.35rem 0.5rem;
        margin: 0 -0.5rem;
        transition: background-color 0.15s ease;
      }
      .env-row--link:hover {
        background: var(--bg-hover, rgba(0, 0, 0, 0.04));
      }

      .env-name {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
    `,
  ],
})
export class EnvironmentStatusComponent {
  environment = input.required<EnvironmentStatusInput>();
  showLink = input(true);

  displayLabel = computed(() => {
    const env = this.environment();
    return env.displayName || env.name;
  });

  envLink = computed(() => `/environments/${this.environment().id}`);
}
