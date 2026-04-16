import { Component, input, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ServiceSummary } from '@shipyard/shared';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge.component';
import { TimeAgoComponent } from '../../../../shared/components/time-ago.component';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [RouterModule, StatusBadgeComponent, TimeAgoComponent],
  templateUrl: './service-card.html',
  styleUrl: './service-card.scss',
})
export class ServiceCardComponent {
  service = input.required<ServiceSummary>();
  repoShort = computed(() => this.service().repositoryUrl.replace(/^https?:\/\/(www\.)?/, ''));
}
