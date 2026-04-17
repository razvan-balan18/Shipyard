import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RouterModule } from '@angular/router';

import { StatusBadgeComponent } from '../../../../shared/components/status-badge.component';

export interface EnvironmentStatusInput {
  id: string;
  name: string;
  displayName: string;
  status: string;
  currentDeploymentId?: string | null;
}

@Component({
  selector: 'app-environment-status',
  standalone: true,
  imports: [RouterModule, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './environment-status.html',
  styleUrl: './environment-status.scss',
})
export class EnvironmentStatusComponent {
  environment = input.required<EnvironmentStatusInput>();
  showLink = input(true);

  displayLabel = computed(() => {
    const env = this.environment();
    return env.displayName || env.name;
  });

  envLink = computed(() => `/environments/${this.environment().id}`);
}
