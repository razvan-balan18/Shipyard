import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

import { switchMap, take } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import {
  ServiceSummary,
  EnvironmentSummary,
  EnvironmentStatus,
  RepositoryProvider,
} from '@shipyard/shared';

// --- Interfaces ---

/**
 * Extended service type that includes fields the backend may return
 * but are not yet in the shared ServiceSummary type (e.g. techStack).
 */
interface ServiceListItem extends ServiceSummary {
  techStack?: string;
}

interface CreateServicePayload {
  name: string;
  displayName: string;
  repositoryUrl: string;
  repositoryProvider: string;
  description?: string;
  defaultBranch?: string;
}

// --- Helpers ---

const STATUS_SEVERITY: Record<string, number> = {
  DOWN: 3,
  DEGRADED: 2,
  UNKNOWN: 1,
  HEALTHY: 0,
};

function worstStatus(environments: EnvironmentSummary[]): EnvironmentStatus {
  if (environments.length === 0) return EnvironmentStatus.UNKNOWN;

  let worst = EnvironmentStatus.HEALTHY as EnvironmentStatus;
  let worstSev = 0;

  for (const env of environments) {
    const sev = STATUS_SEVERITY[env.status] ?? 0;
    if (sev > worstSev) {
      worstSev = sev;
      worst = env.status;
    }
  }

  return worst;
}

function shortenRepoUrl(url: string | undefined | null): string {
  if (!url) return '';
  // Handle https://github.com/owner/repo or git@github.com:owner/repo.git
  const httpsMatch = url.match(/(?:github|gitlab|bitbucket)\.\w+\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (httpsMatch) return httpsMatch[1];
  const sshMatch = url.match(/(?:github|gitlab|bitbucket)\.\w+:([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];
  return url;
}

// ============================================================
// Create Service Dialog
// ============================================================

@Component({
  selector: 'app-create-service-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Create Service</h2>
    <mat-dialog-content>
      @if (errorMessage()) {
        <div class="dialog-error">{{ errorMessage() }}</div>
      }
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="my-service" />
          <mat-hint>Lowercase letters, numbers, and hyphens only</mat-hint>
          @if (form.controls.name.hasError('pattern')) {
            <mat-error>Only lowercase letters, numbers, and hyphens allowed</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display Name</mat-label>
          <input matInput formControlName="displayName" placeholder="My Service" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Repository URL</mat-label>
          <input
            matInput
            formControlName="repositoryUrl"
            placeholder="https://github.com/owner/repo"
          />
          @if (form.controls.repositoryUrl.hasError('required')) {
            <mat-error>Repository URL is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Provider</mat-label>
          <mat-select formControlName="repositoryProvider">
            <mat-option value="GITHUB">GitHub</mat-option>
            <mat-option value="GITLAB">GitLab</mat-option>
            <mat-option value="BITBUCKET">Bitbucket</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Default Branch</mat-label>
          <input matInput formControlName="defaultBranch" placeholder="main" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid || submitting()"
        (click)="submit()"
      >
        {{ submitting() ? 'Creating...' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 380px;
        padding-top: 0.5rem;
      }
      .full-width {
        width: 100%;
      }
      .dialog-error {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
      }
    `,
  ],
})
export class CreateServiceDialogComponent {
  private api = inject(ApiService);
  private dialogRef =
    inject<MatDialogRef<CreateServiceDialogComponent, ServiceListItem>>(MatDialogRef);
  private fb = inject(FormBuilder);

  submitting = signal(false);
  errorMessage = signal('');

  readonly providers = Object.values(RepositoryProvider);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    displayName: ['', [Validators.required]],
    repositoryUrl: ['', [Validators.required]],
    repositoryProvider: [RepositoryProvider.GITHUB, [Validators.required]],
    defaultBranch: ['main'],
  });

  submit(): void {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const payload: CreateServicePayload = {
      name: value.name,
      displayName: value.displayName,
      repositoryUrl: value.repositoryUrl,
      repositoryProvider: value.repositoryProvider,
      ...(value.defaultBranch ? { defaultBranch: value.defaultBranch } : {}),
    };

    this.api
      .post<ServiceListItem>('/api/services', payload)
      .pipe(take(1))
      .subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.dialogRef.close(created);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.submitting.set(false);
          const msg = err.error?.message ?? err.message ?? 'Failed to create service';
          this.errorMessage.set(typeof msg === 'string' ? msg : 'Failed to create service');
        },
      });
  }
}

// ============================================================
// Service List Component
// ============================================================

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-list.html',
  styleUrl: './service-list.scss',
})
export class ServiceListComponent implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  services = signal<ServiceListItem[]>([]);
  loading = signal(true);
  error = signal('');

  // Computed helpers exposed as methods for template use with per-item data.
  // For truly derived signals (no parameters), computed() is used.

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading.set(true);
    this.error.set('');

    this.api
      .get<ServiceListItem[]>('/api/services')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.services.set(data);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? err.message ?? 'Failed to load services');
        },
      });
  }

  getShortRepo(service: ServiceListItem): string {
    return shortenRepoUrl(service.repositoryUrl);
  }

  getWorstStatus(service: ServiceListItem): EnvironmentStatus {
    return worstStatus(service.environments);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateServiceDialogComponent, {
      width: '480px',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: ServiceListItem | undefined) => {
        if (result) {
          this.services.update((current) => [...current, result]);
          this.snackBar.open('Service created successfully', 'Dismiss', {
            duration: 3000,
          });
        }
      });
  }

  confirmDelete(service: ServiceListItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const ref = this.snackBar.open(`Delete "${service.displayName || service.name}"?`, 'Confirm', {
      duration: 5000,
    });

    ref
      .onAction()
      .pipe(
        switchMap(() => this.api.delete<void>(`/api/services/${service.id}`)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.services.update((list) => list.filter((s) => s.id !== service.id));
          this.snackBar.open('Service deleted', 'Dismiss', {
            duration: 3000,
          });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(err?.error?.message ?? err?.message ?? 'Failed to delete service');
        },
      });
  }
}
