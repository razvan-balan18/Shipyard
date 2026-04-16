import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  input,
  effect,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SlicePipe } from '@angular/common';
import { lastValueFrom } from 'rxjs';

import { DeploymentStatus } from '@shipyard/shared';
import { ApiService } from '../../../core/api/api.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton.component';

interface DeploymentItem {
  id: string;
  serviceId: string;
  environmentId: string;
  status: DeploymentStatus;
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

interface DeploymentsResponse {
  deployments: DeploymentItem[];
  total: number;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-deployment-timeline',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    SlicePipe,
    StatusBadgeComponent,
    CommitShaComponent,
    TimeAgoComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading() && deployments().length === 0) {
      <app-loading-skeleton [count]="5" />
    } @else if (error() && deployments().length === 0) {
      <div class="error-banner">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error() }}</span>
        <button mat-button (click)="fetchInitial()">Retry</button>
      </div>
    } @else if (deployments().length === 0 && !loading()) {
      <app-empty-state message="No deployments yet" />
    } @else {
      <div class="timeline">
        @for (dep of deployments(); track dep.id) {
          <div class="timeline-item">
            <div class="timeline-connector">
              <div class="timeline-dot"></div>
              <div class="timeline-line"></div>
            </div>

            <div class="timeline-card">
              <div class="card-header">
                <app-status-badge [status]="dep.status" />
                <span class="env-name">{{
                  dep.environment.displayName || dep.environment.name
                }}</span>
                <app-time-ago [timestamp]="dep.startedAt" />
              </div>

              <div class="card-body">
                <div class="branch-row">
                  <mat-icon class="row-icon">fork_right</mat-icon>
                  <span class="branch-name">{{ dep.branch }}</span>
                  <app-commit-sha [sha]="dep.commitSha" />
                </div>

                @if (dep.commitMessage) {
                  <p class="commit-message">
                    {{ dep.commitMessage | slice: 0 : 72
                    }}{{ dep.commitMessage.length > 72 ? '...' : '' }}
                  </p>
                }

                <div class="card-footer">
                  <span class="triggered-by">
                    <mat-icon class="row-icon">person_outline</mat-icon>
                    {{ dep.triggeredBy }}
                  </span>

                  @if (dep.status === SUCCESS) {
                    <button
                      mat-stroked-button
                      class="rollback-btn"
                      [disabled]="rollingBackId() === dep.id"
                      (click)="rollback(dep.id)"
                    >
                      @if (rollingBackId() === dep.id) {
                        <mat-spinner diameter="16" />
                      } @else {
                        <mat-icon>replay</mat-icon>
                      }
                      Rollback
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Load more -->
      <div class="load-more-container">
        @if (hasMore()) {
          <button mat-stroked-button [disabled]="loadingMore()" (click)="loadMore()">
            @if (loadingMore()) {
              <mat-spinner diameter="16" />
            }
            Load more
          </button>
        } @else if (deployments().length > 0) {
          <span class="no-more">No more deployments</span>
        }
      </div>
    }
  `,
  styles: [
    `
      .timeline {
        display: flex;
        flex-direction: column;
      }

      .timeline-item {
        display: flex;
        gap: 0.75rem;
      }

      .timeline-connector {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 20px;
        flex-shrink: 0;
      }

      .timeline-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent, #6366f1);
        margin-top: 0.85rem;
        flex-shrink: 0;
      }

      .timeline-line {
        width: 2px;
        flex: 1;
        background: var(--border);
        min-height: 8px;
      }

      .timeline-item:last-child .timeline-line {
        display: none;
      }

      .timeline-card {
        flex: 1;
        min-width: 0;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-card);
        margin-bottom: 0.5rem;
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .env-name {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .card-body {
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .branch-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      .branch-name {
        font-weight: 600;
        font-size: 0.875rem;
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
        margin: 0;
        line-height: 1.4;
      }

      .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }

      .triggered-by {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .rollback-btn {
        font-size: 0.75rem;
        line-height: 1;
      }
      .rollback-btn mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .load-more-container {
        display: flex;
        justify-content: center;
        padding: 1rem 0;
      }

      .no-more {
        font-size: 0.8rem;
        color: var(--text-muted);
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
export class DeploymentTimelineComponent {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private snackBar = inject(MatSnackBar);

  /** The SUCCESS constant for template comparison */
  protected readonly SUCCESS = DeploymentStatus.SUCCESS;

  /** Inputs */
  serviceId = input.required<string>();
  environmentId = input<string | null>(null);

  /** State */
  deployments = signal<DeploymentItem[]>([]);
  total = signal(0);
  loading = signal(false);
  loadingMore = signal(false);
  error = signal('');
  rollingBackId = signal<string | null>(null);

  /** Derived */
  hasMore = computed(() => this.deployments().length < this.total());

  constructor() {
    effect(
      () => {
        // Track reactive inputs — reading them registers the effect dependency
        this.serviceId();
        this.environmentId();
        this.fetchInitial();
      },
      { allowSignalWrites: true },
    );
  }

  fetchInitial(): void {
    this.loading.set(true);
    this.error.set('');
    this.deployments.set([]);
    this.total.set(0);

    const url = this.buildUrl(0);

    this.api
      .get<DeploymentsResponse>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.deployments.set(res.deployments);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load deployments');
          this.loading.set(false);
        },
      });
  }

  loadMore(): void {
    this.loadingMore.set(true);
    const offset = this.deployments().length;
    const url = this.buildUrl(offset);

    this.api
      .get<DeploymentsResponse>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.deployments.update((current) => [...current, ...res.deployments]);
          this.total.set(res.total);
          this.loadingMore.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.snackBar.open(
            err?.error?.message ?? err?.message ?? 'Failed to load more deployments',
            'Dismiss',
            { duration: 4000 },
          );
          this.loadingMore.set(false);
        },
      });
  }

  async rollback(deploymentId: string): Promise<void> {
    this.rollingBackId.set(deploymentId);

    try {
      await lastValueFrom(
        this.api
          .post<DeploymentItem>(`/api/deployments/${deploymentId}/rollback`, {})
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      this.snackBar.open('Rollback initiated', 'OK', { duration: 3000 });
      this.fetchInitial();
    } catch (err: unknown) {
      const error = err as { error?: { message?: string }; message?: string };
      this.snackBar.open(error?.error?.message ?? error?.message ?? 'Rollback failed', 'Dismiss', {
        duration: 4000,
      });
    } finally {
      this.rollingBackId.set(null);
    }
  }

  private buildUrl(offset: number): string {
    let url = `/api/deployments?serviceId=${encodeURIComponent(this.serviceId())}&limit=${PAGE_SIZE}&offset=${offset}`;
    const envId = this.environmentId();
    if (envId) {
      url += `&environmentId=${encodeURIComponent(envId)}`;
    }
    return url;
  }
}
