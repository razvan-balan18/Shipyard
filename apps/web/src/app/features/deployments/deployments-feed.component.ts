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
import { ApiService } from '../../core/api/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import {
  DeploymentFiltersComponent,
  DeploymentFilters,
} from './components/deployment-filters.component';
import { DeploymentCardComponent, DeploymentItem } from './components/deployment-card.component';

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
  template: `
    <div class="deployments-feed">
      <h1 class="page-title">Deployment Feed</h1>

      <app-deployment-filters (filtersChange)="onFiltersChange($event)" />

      @if (loading() && deployments().length === 0) {
        <app-loading-skeleton [count]="5" />
      } @else if (error() && deployments().length === 0) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button mat-button (click)="fetchDeployments()">Retry</button>
        </div>
      } @else if (deployments().length === 0 && !loading()) {
        <app-empty-state message="No deployments found" />
      } @else {
        <div class="deployments-list">
          @for (dep of deployments(); track dep.id) {
            <app-deployment-card [deployment]="dep" />
          }
        </div>

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
    </div>
  `,
  styles: [
    `
      .deployments-feed {
        padding: 1.5rem;
      }

      .page-title {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 1.25rem 0;
        color: var(--text-primary);
      }

      .deployments-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
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
