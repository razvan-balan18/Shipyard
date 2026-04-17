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
import { ApiService } from '../../../../core/api/api.service';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton.component';

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
  templateUrl: './pipeline-runs.html',
  styleUrl: './pipeline-runs.scss',
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
