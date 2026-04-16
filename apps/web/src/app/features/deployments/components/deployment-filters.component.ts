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
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { DeploymentStatus } from '@shipyard/shared';
import { ApiService } from '../../../core/api/api.service';

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
  imports: [MatSelectModule, MatFormFieldModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters-bar">
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Service</mat-label>
        <mat-select
          [value]="selectedServiceId()"
          (selectionChange)="selectedServiceId.set($event.value)"
        >
          <mat-option [value]="undefined">All services</mat-option>
          @for (svc of services(); track svc.id) {
            <mat-option [value]="svc.id">{{ svc.displayName || svc.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Status</mat-label>
        <mat-select [value]="selectedStatus()" (selectionChange)="selectedStatus.set($event.value)">
          <mat-option [value]="undefined">All statuses</mat-option>
          @for (status of statusOptions; track status) {
            <mat-option [value]="status">{{ status }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button mat-stroked-button class="clear-btn" (click)="clearFilters()">
        <mat-icon>clear</mat-icon>
        Clear filters
      </button>
    </div>
  `,
  styles: [
    `
      .filters-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }

      .filter-field {
        min-width: 180px;
      }

      .clear-btn {
        height: 40px;
      }
    `,
  ],
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
