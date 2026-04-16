import { Component, input } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DeploymentSummary } from '@shipyard/shared';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge.component';
import { CommitShaComponent } from '../../../../shared/components/commit-sha.component';
import { TimeAgoComponent } from '../../../../shared/components/time-ago.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';

@Component({
  selector: 'app-recent-deployments',
  standalone: true,
  imports: [
    SlicePipe,
    RouterModule,
    StatusBadgeComponent,
    CommitShaComponent,
    TimeAgoComponent,
    EmptyStateComponent,
  ],
  templateUrl: './recent-deployments.html',
  styleUrl: './recent-deployments.scss',
})
export class RecentDeploymentsComponent {
  deployments = input.required<DeploymentSummary[]>();
}
