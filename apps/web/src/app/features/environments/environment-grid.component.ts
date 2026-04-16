import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { WsEventType, EnvironmentStatus } from '@shipyard/shared';
import { ApiService } from '../../core/api/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';

interface EnvironmentItem {
  id: string;
  name: string;
  displayName: string;
  status: string;
  healthCheckUrl?: string;
  currentDeploymentId?: string | null;
  serviceId: string;
  service: {
    id: string;
    name: string;
    displayName: string;
  };
}

interface ServiceGroup {
  service: { id: string; name: string; displayName: string };
  environments: EnvironmentItem[];
}

interface HealthCheckPayload {
  environmentId: string;
  status: EnvironmentStatus;
}

@Component({
  selector: 'app-environment-grid',
  standalone: true,
  imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading-skeleton [count]="6" />
    } @else if (error() && environments().length === 0) {
      <div class="error-banner">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error() }}</span>
        <button mat-button (click)="fetchEnvironments()">Retry</button>
      </div>
    } @else if (environments().length === 0) {
      <app-empty-state message="No environments yet. Add environments to your services." />
    } @else {
      @for (group of grouped(); track group.service.id) {
        <section class="service-group">
          <h2 class="service-header">
            <a [routerLink]="['/services', group.service.id]" class="service-link">
              {{ group.service.displayName || group.service.name }}
            </a>
          </h2>

          <div class="env-grid">
            @for (env of group.environments; track env.id) {
              <a class="env-card" [routerLink]="['/services', env.serviceId]">
                <div class="card-top">
                  <span class="env-name">{{ env.displayName || env.name }}</span>
                  <app-status-badge [status]="env.status" />
                </div>

                @if (env.currentDeploymentId) {
                  <div class="card-detail">
                    <span class="detail-label">Current deploy:</span>
                    <span class="detail-value mono">{{ env.currentDeploymentId.slice(0, 8) }}</span>
                  </div>
                }

                @if (env.healthCheckUrl) {
                  <div class="card-detail">
                    <span class="detail-label">Health URL:</span>
                    <span class="detail-value">{{ extractDomain(env.healthCheckUrl) }}</span>
                  </div>
                }
              </a>
            }
          </div>
        </section>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 1.5rem;
      }

      .service-group {
        margin-bottom: 2rem;
      }

      .service-header {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.75rem;
        color: var(--text-primary);
      }

      .service-link {
        color: inherit;
        text-decoration: none;
      }
      .service-link:hover {
        color: var(--accent, #6366f1);
        text-decoration: underline;
      }

      .env-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      @media (min-width: 768px) {
        .env-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (min-width: 1200px) {
        .env-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }

      .env-card {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-card);
        text-decoration: none;
        color: inherit;
        transition:
          border-color 0.15s,
          box-shadow 0.15s;
        cursor: pointer;
      }
      .env-card:hover {
        border-color: var(--accent, #6366f1);
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
      }

      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .env-name {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--text-primary);
      }

      .card-detail {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.8rem;
      }

      .detail-label {
        color: var(--text-muted);
        white-space: nowrap;
      }

      .detail-value {
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mono {
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
        font-size: 0.75rem;
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        font-size: 0.875rem;
      }
      .error-banner mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .error-banner span {
        flex: 1;
      }
    `,
  ],
})
export class EnvironmentGridComponent implements OnInit {
  private api = inject(ApiService);
  private ws = inject(WebSocketService);
  private destroyRef = inject(DestroyRef);

  /** State */
  environments = signal<EnvironmentItem[]>([]);
  loading = signal(true);
  error = signal('');

  /** Derived — group environments by service */
  grouped = computed<ServiceGroup[]>(() => {
    const map = new Map<string, ServiceGroup>();
    for (const env of this.environments()) {
      const existing = map.get(env.serviceId);
      if (existing) {
        existing.environments.push(env);
      } else {
        map.set(env.serviceId, {
          service: env.service,
          environments: [env],
        });
      }
    }
    return Array.from(map.values());
  });

  ngOnInit(): void {
    this.fetchEnvironments();
    this.subscribeToHealthUpdates();
  }

  fetchEnvironments(): void {
    this.loading.set(true);
    this.error.set('');

    this.api
      .get<EnvironmentItem[]>('/api/environments')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (envs) => {
          this.environments.set(envs);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load environments');
          this.loading.set(false);
        },
      });
  }

  extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private subscribeToHealthUpdates(): void {
    this.ws
      .on<HealthCheckPayload>(WsEventType.HEALTH_CHECK_UPDATED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const { environmentId, status } = event.payload;
        this.environments.update((envs) =>
          envs.map((env) => (env.id === environmentId ? { ...env, status } : env)),
        );
      });
  }
}
