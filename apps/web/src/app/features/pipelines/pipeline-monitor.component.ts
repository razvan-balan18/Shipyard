import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  untracked,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PipelineStatus, WsEventType } from '@shipyard/shared';
import { ApiService } from '../../core/api/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';

interface PipelineRun {
  id: string;
  name: string;
  branch: string;
  commitSha: string;
  status: string;
  triggeredBy: string;
  duration?: number;
  createdAt: string;
  serviceId: string;
  service: { id: string; name: string; displayName: string };
}

interface ServiceItem {
  id: string;
  name: string;
  displayName: string;
}

interface PipelineUpdatedPayload {
  id: string;
  name: string;
  branch: string;
  commitSha: string;
  status: string;
  triggeredBy: string;
  duration?: number;
  createdAt: string;
  serviceId: string;
  service: { id: string; name: string; displayName: string };
}

function formatDuration(seconds: number | undefined): string {
  if (seconds == null || seconds < 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

@Component({
  selector: 'app-pipeline-monitor',
  standalone: true,
  imports: [
    RouterModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    StatusBadgeComponent,
    CommitShaComponent,
    TimeAgoComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Pipeline Monitor</h1>
      </header>

      <div class="filters-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Service</mat-label>
          <mat-select
            [value]="selectedServiceId()"
            (selectionChange)="selectedServiceId.set($event.value)"
          >
            <mat-option [value]="null">All services</mat-option>
            @for (svc of services(); track svc.id) {
              <mat-option [value]="svc.id">{{ svc.displayName || svc.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading() && runs().length === 0) {
        <app-loading-skeleton [count]="8" />
      } @else if (error() && runs().length === 0) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button mat-button (click)="fetchRuns()">Retry</button>
        </div>
      } @else if (runs().length === 0 && !loading()) {
        <app-empty-state message="No pipeline runs yet. Connect GitHub to see pipeline activity." />
      } @else {
        <div class="runs-list">
          @for (run of runs(); track run.id) {
            <div class="run-row">
              <app-status-badge [status]="run.status" />

              <a class="service-link" [routerLink]="'/services/' + run.service.id">
                {{ run.service.displayName || run.service.name }}
              </a>

              <div class="run-info">
                <span class="run-name">{{ run.name }}</span>
                <div class="run-meta">
                  <span class="branch">
                    <mat-icon class="meta-icon">fork_right</mat-icon>
                    {{ run.branch }}
                  </span>
                  <app-commit-sha [sha]="run.commitSha" />
                </div>
              </div>

              <span class="triggered-by">
                <mat-icon class="meta-icon">person_outline</mat-icon>
                {{ run.triggeredBy }}
              </span>

              <span class="duration">{{ formatDuration(run.duration) }}</span>

              <app-time-ago [timestamp]="run.createdAt" />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        max-width: 960px;
        margin: 0 auto;
        padding: 1.5rem;
      }

      .page-header {
        margin-bottom: 1.5rem;
      }

      .page-header h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
      }

      .filters-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }

      .filter-field {
        min-width: 200px;
      }

      .runs-list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .run-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-card);
      }

      .service-link {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--accent);
        text-decoration: none;
        white-space: nowrap;
        min-width: 80px;
      }
      .service-link:hover {
        text-decoration: underline;
      }

      .run-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .run-name {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .run-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .branch {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .meta-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--text-muted);
      }

      .triggered-by {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        white-space: nowrap;
      }

      .duration {
        font-size: 0.8rem;
        font-family: 'SF Mono', 'Fira Code', monospace;
        color: var(--text-secondary);
        white-space: nowrap;
        min-width: 50px;
        text-align: right;
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
export class PipelineMonitorComponent {
  private api = inject(ApiService);
  private ws = inject(WebSocketService);
  private destroyRef = inject(DestroyRef);

  /** State */
  runs = signal<PipelineRun[]>([]);
  services = signal<ServiceItem[]>([]);
  selectedServiceId = signal<string | null>(null);
  loading = signal(true);
  error = signal('');

  protected formatDuration = formatDuration;

  constructor() {
    // Fetch services for the filter dropdown
    this.api
      .get<ServiceItem[]>('/api/services')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.services.set(res),
        error: () => console.warn('Failed to load services for filter dropdown'),
      });

    // React to service filter changes
    effect(
      () => {
        // Track the signal
        this.selectedServiceId();
        untracked(() => this.fetchRuns());
      },
      { allowSignalWrites: true },
    );

    // Subscribe to live pipeline updates
    this.ws
      .on<PipelineUpdatedPayload>(WsEventType.PIPELINE_UPDATED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const payload = event.payload;
        const currentRuns = this.runs();
        const index = currentRuns.findIndex((r) => r.id === payload.id);

        if (index >= 0) {
          // Update existing run in-place
          const updated = [...currentRuns];
          updated[index] = {
            ...updated[index],
            status: payload.status,
            duration: payload.duration,
          };
          this.runs.set(updated);
        } else {
          // Prepend new run (if it matches the current filter)
          const filterServiceId = this.selectedServiceId();
          if (!filterServiceId || payload.serviceId === filterServiceId) {
            this.runs.set([payload, ...currentRuns]);
          }
        }
      });
  }

  fetchRuns(): void {
    this.loading.set(true);
    this.error.set('');

    const serviceId = this.selectedServiceId();
    const url = serviceId
      ? `/api/pipelines?serviceId=${encodeURIComponent(serviceId)}`
      : '/api/pipelines';

    this.api
      .get<{ pipelineRuns: PipelineRun[]; total: number }>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.runs.set(data.pipelineRuns);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load pipeline runs');
          this.loading.set(false);
        },
      });
  }
}
