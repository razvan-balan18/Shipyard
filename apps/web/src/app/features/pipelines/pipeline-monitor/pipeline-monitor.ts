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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { PipelineStatus, WsEventType } from '@shipyard/shared';
import { ApiService } from '../../../core/api/api.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton.component';

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
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    StatusBadgeComponent,
    CommitShaComponent,
    TimeAgoComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pipeline-monitor.html',
  styleUrl: './pipeline-monitor.scss',
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
