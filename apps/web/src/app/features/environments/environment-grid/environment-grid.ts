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
import { ApiService } from '../../../core/api/api.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton.component';

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
  templateUrl: './environment-grid.html',
  styleUrl: './environment-grid.scss',
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
