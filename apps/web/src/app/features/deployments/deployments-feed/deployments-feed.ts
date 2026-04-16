import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  untracked,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { WsEventType } from '@shipyard/shared';
import { ApiService } from '../../../core/api/api.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import {
  DeploymentFiltersComponent,
  DeploymentFilters,
} from '.././components/deployment-filters/deployment-filters';
import {
  DeploymentCardComponent,
  DeploymentItem,
} from './../components/deployment-card/deployment-card';

interface DeploymentsResponse {
  deployments: DeploymentItem[];
  total: number;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-deployments-feed',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    DeploymentFiltersComponent,
    DeploymentCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deployments-feed.html',
  styleUrl: './deployments-feed.scss',
})
export class DeploymentsFeedComponent {
  private api = inject(ApiService);
  private wsService = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  /** State */
  deployments = signal<DeploymentItem[]>([]);
  filters = signal<DeploymentFilters>({});
  loading = signal(true);
  loadingMore = signal(false);
  error = signal('');
  total = signal(0);

  /** Derived */
  hasMore = computed(() => this.deployments().length < this.total());

  constructor() {
    // Re-fetch when filters change
    effect(
      () => {
        const _filters = this.filters(); // tracked — triggers re-run on filter change
        untracked(() => this.fetchDeployments());
      },
      { allowSignalWrites: true },
    );

    // Subscribe to WebSocket deployment events
    this.wsService
      .on<DeploymentItem>(WsEventType.DEPLOYMENT_STARTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleWsDeployment(event.payload));

    this.wsService
      .on<DeploymentItem>(WsEventType.DEPLOYMENT_COMPLETED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleWsDeployment(event.payload));

    this.wsService
      .on<DeploymentItem>(WsEventType.DEPLOYMENT_FAILED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleWsDeployment(event.payload));
  }

  onFiltersChange(newFilters: DeploymentFilters): void {
    this.filters.set(newFilters);
  }

  fetchDeployments(): void {
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
        error: () => {
          this.loadingMore.set(false);
          this.snackBar.open('Failed to load more deployments', 'Dismiss', {
            duration: 4000,
          });
        },
      });
  }

  private handleWsDeployment(deployment: DeploymentItem): void {
    const currentFilters = this.filters();

    // If a serviceId filter is active and doesn't match, ignore the event
    if (currentFilters.serviceId && deployment.serviceId !== currentFilters.serviceId) {
      return;
    }

    // If a status filter is active and doesn't match, ignore the event
    if (currentFilters.status && deployment.status !== currentFilters.status) {
      return;
    }

    // Check if this deployment already exists in the list (update in place)
    const existingIndex = this.deployments().findIndex((d) => d.id === deployment.id);

    if (existingIndex >= 0) {
      this.deployments.update((current) => {
        const updated = [...current];
        updated[existingIndex] = deployment;
        return updated;
      });

      // Remove from list if updated deployment no longer matches the active status filter
      const activeStatus = currentFilters.status;
      if (activeStatus && deployment.status !== activeStatus) {
        this.deployments.update((list) => list.filter((d) => d.id !== deployment.id));
        this.total.update((n) => n - 1);
      }
    } else {
      // Prepend new deployment
      this.deployments.update((current) => [deployment, ...current]);
      this.total.update((t) => t + 1);
    }
  }

  private buildUrl(offset: number): string {
    let url = `/api/deployments?limit=${PAGE_SIZE}&offset=${offset}`;
    const f = this.filters();

    if (f.serviceId) {
      url += `&serviceId=${encodeURIComponent(f.serviceId)}`;
    }
    if (f.environmentId) {
      url += `&environmentId=${encodeURIComponent(f.environmentId)}`;
    }
    if (f.status) {
      url += `&status=${encodeURIComponent(f.status)}`;
    }

    return url;
  }
}
