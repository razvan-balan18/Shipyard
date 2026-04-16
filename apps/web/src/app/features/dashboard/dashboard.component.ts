import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { ServiceCardComponent } from './components/service-card/service-card';
import { RecentDeploymentsComponent } from './components/recent-deployments/recent-deployments';
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
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
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
