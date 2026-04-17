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
import { ApiService } from '../../../../core/api/api.service';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton.component';

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
  templateUrl: './deployment-timeline.html',
  styleUrl: './deployment-timeline.scss',
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
