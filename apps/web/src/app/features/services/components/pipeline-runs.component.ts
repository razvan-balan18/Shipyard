import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  effect,
  untracked,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PipelineStatus } from '@shipyard/shared';
import { ApiService } from '../../../core/api/api.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton.component';

interface PipelineRunItem {
  id: string;
  name: string;
  branch: string;
  commitSha: string;
  status: PipelineStatus;
  triggeredBy: string;
  duration?: number;
  createdAt: string;
  serviceId: string;
}

function formatDuration(seconds: number | undefined): string {
  if (seconds == null || seconds < 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

@Component({
  selector: 'app-pipeline-runs',
  standalone: true,
  imports: [
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
    @if (loading() && runs().length === 0) {
      <app-loading-skeleton [count]="5" />
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
  `,
  styles: [
    `
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
export class PipelineRunsComponent {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  /** Inputs */
  serviceId = input.required<string>();

  /** State */
  runs = signal<PipelineRunItem[]>([]);
  loading = signal(false);
  error = signal('');

  protected formatDuration = formatDuration;

  constructor() {
    effect(
      () => {
        const id = this.serviceId();
        this.runs.set([]);
        untracked(() => this.fetchRuns());
      },
      { allowSignalWrites: true },
    );
  }

  fetchRuns(): void {
    this.loading.set(true);
    this.error.set('');

    const url = `/api/pipelines?serviceId=${encodeURIComponent(this.serviceId())}`;

    this.api
      .get<{ pipelineRuns: PipelineRunItem[]; total: number }>(url)
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
