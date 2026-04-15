import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { ServiceCardComponent } from './components/service-card.component';
import { RecentDeploymentsComponent } from './components/recent-deployments.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { ServiceSummary, DeploymentSummary } from '@shipyard/shared';
import { ApiService } from '../../core/api/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';

const WS_CLASS_MAP: Record<string, string> = {
  connected: 'ws-connected',
  disconnected: 'ws-disconnected',
  reconnecting: 'ws-reconnecting',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    ServiceCardComponent,
    RecentDeploymentsComponent,
    LoadingSkeletonComponent,
  ],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>Mission Control</h1>
        <span class="ws-status" [class]="wsStatusClass()">
          {{ wsService.connectionStatus() }}
        </span>
      </header>

      <!-- Services grid -->
      <section class="section">
        <h2 class="section-title">Services</h2>
        @if (loadingServices()) {
          <app-loading-skeleton [count]="3" />
        } @else {
          <div class="services-grid">
            @for (service of services(); track service.id) {
              <app-service-card [service]="service" />
            } @empty {
              <div class="empty-inline">
                No services configured yet.
                <a routerLink="/services">Add one →</a>
              </div>
            }
          </div>
        }
      </section>

      <!-- Recent deployments -->
      <section class="section">
        <h2 class="section-title">Recent Deployments</h2>
        @if (loadingDeployments()) {
          <app-loading-skeleton [count]="5" />
        } @else {
          <app-recent-deployments [deployments]="recentDeployments()" />
        }
      </section>
    </div>
  `,
  styles: [
    `
      .dashboard {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .dashboard-header h1 {
        font-size: 1.5rem;
        font-weight: 700;
      }

      .ws-status {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 3px 10px;
        border-radius: 999px;
        text-transform: capitalize;
      }
      .ws-connected {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }
      .ws-disconnected {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }
      .ws-reconnecting {
        background: rgba(234, 179, 8, 0.1);
        color: #eab308;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }

      .empty-inline {
        color: var(--text-muted);
        font-size: 0.9rem;
        padding: 1rem 0;
      }
      .empty-inline a {
        color: var(--accent);
        text-decoration: none;
        margin-left: 0.25rem;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  wsService = inject(WebSocketService);

  services = signal<ServiceSummary[]>([]);
  recentDeployments = signal<DeploymentSummary[]>([]);
  loadingServices = signal(true);
  loadingDeployments = signal(true);

  wsStatusClass = computed(
    () => WS_CLASS_MAP[this.wsService.connectionStatus()] ?? 'ws-disconnected',
  );

  ngOnInit() {
    this.loadServices();
    this.loadRecentDeployments();

    this.wsService.connect();
    this.wsService
      .allEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type.startsWith('deployment:')) {
          this.loadServices();
          this.loadRecentDeployments();
        }
      });
  }

  private loadServices() {
    this.loadingServices.set(true);
    this.api.get<ServiceSummary[]>('/api/services').subscribe({
      next: (data) => {
        this.services.set(data);
        this.loadingServices.set(false);
      },
      error: () => this.loadingServices.set(false),
    });
  }

  private loadRecentDeployments() {
    this.loadingDeployments.set(true);
    this.api.get<{ deployments: DeploymentSummary[] }>('/api/deployments?limit=10').subscribe({
      next: (data) => {
        this.recentDeployments.set(data.deployments);
        this.loadingDeployments.set(false);
      },
      error: () => this.loadingDeployments.set(false),
    });
  }
}
