import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  output,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { DeploymentStatus } from '@shipyard/shared';
import { ApiService } from '../../../../core/api/api.service';

export interface DeploymentFilters {
  serviceId?: string;
  environmentId?: string;
  status?: string;
}

interface ServiceOption {
  id: string;
  name: string;
  displayName: string;
}

@Component({
  selector: 'app-deployment-filters',
  standalone: true,
  imports: [MatIconModule, MatSelectModule, MatFormFieldModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './deployment-filters.html',
  styleUrl: './deployment-filters.scss',
})
export class DeploymentFiltersComponent {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  filtersChange = output<DeploymentFilters>();

  services = signal<ServiceOption[]>([]);
  selectedServiceId = signal<string | undefined>(undefined);
  selectedStatus = signal<string | undefined>(undefined);

  protected readonly statusOptions = Object.values(DeploymentStatus);

  constructor() {
    // Fetch services for the dropdown
    this.api
      .get<ServiceOption[]>('/api/services')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.services.set(res),
        error: () => console.warn('Failed to load services for filter dropdown'),
      });

    // Emit filters whenever any selection changes
    effect(
      () => {
        const filters: DeploymentFilters = {};
        const serviceId = this.selectedServiceId();
        const status = this.selectedStatus();

        if (serviceId) filters.serviceId = serviceId;
        if (status) filters.status = status;

        this.filtersChange.emit(filters);
      },
      { allowSignalWrites: true },
    );
  }

  clearFilters(): void {
    this.selectedServiceId.set(undefined);
    this.selectedStatus.set(undefined);
  }
}
