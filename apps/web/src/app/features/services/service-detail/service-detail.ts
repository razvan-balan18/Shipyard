import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { switchMap, filter, map, catchError, EMPTY, merge, take } from 'rxjs';
import { WsEventType } from '@shipyard/shared';

import { ApiService } from '../../../core/api/api.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton.component';
import {
  EnvironmentStatusComponent,
  EnvironmentStatusInput,
} from '.././components/environment-status/environment-status';
import { DeploymentTimelineComponent } from '.././components/deployment-timeline/deployment-timeline';
import { PipelineRunsComponent } from '.././components/pipeline-runs/pipeline-runs';

interface ServiceDetail {
  id: string;
  name: string;
  displayName: string;
  repositoryUrl?: string;
  techStack?: string;
  environments: EnvironmentStatusInput[];
}

function shortenRepoUrl(url: string | undefined): string {
  if (!url) return '';
  const httpsMatch = url.match(/(?:github|gitlab|bitbucket)\.\w+\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (httpsMatch) return httpsMatch[1];
  const sshMatch = url.match(/(?:github|gitlab|bitbucket)\.\w+:([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];
  return url;
}

// ============================================================
// Create Environment Dialog
// ============================================================

interface CreateEnvironmentPayload {
  name: string;
  displayName: string;
  order: number;
  serviceId: string;
  url?: string;
  healthCheckUrl?: string;
}

@Component({
  selector: 'app-create-environment-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Add Environment</h2>
    <mat-dialog-content>
      @if (errorMessage()) {
        <div class="dialog-error">{{ errorMessage() }}</div>
      }
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="production" />
          <mat-hint>Lowercase letters, numbers, hyphens</mat-hint>
          @if (form.controls.name.invalid && form.controls.name.touched) {
            <mat-error>Required — lowercase letters, numbers, hyphens only</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display Name</mat-label>
          <input matInput formControlName="displayName" placeholder="Production" />
          @if (form.controls.displayName.invalid && form.controls.displayName.touched) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>URL (optional)</mat-label>
          <input matInput formControlName="url" placeholder="https://myapp.com" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Health Check URL (optional)</mat-label>
          <input matInput formControlName="healthCheckUrl" placeholder="https://myapp.com/health" />
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
        {{ submitting() ? 'Adding...' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 360px;
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
export class CreateEnvironmentDialogComponent {
  private api = inject(ApiService);
  private dialogRef =
    inject<MatDialogRef<CreateEnvironmentDialogComponent, EnvironmentStatusInput>>(MatDialogRef);
  private fb = inject(FormBuilder);
  readonly serviceId = inject<string>(MAT_DIALOG_DATA);

  submitting = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    displayName: ['', [Validators.required]],
    url: [''],
    healthCheckUrl: [''],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    const v = this.form.getRawValue();
    const payload: CreateEnvironmentPayload = {
      name: v.name,
      displayName: v.displayName,
      order: 0,
      serviceId: this.serviceId,
      ...(v.url ? { url: v.url } : {}),
      ...(v.healthCheckUrl ? { healthCheckUrl: v.healthCheckUrl } : {}),
    };
    this.api
      .post<EnvironmentStatusInput>('/api/environments', payload)
      .pipe(take(1))
      .subscribe({
        next: (env) => {
          this.submitting.set(false);
          this.dialogRef.close(env);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.message ?? err?.message ?? 'Failed to add environment');
        },
      });
  }
}

// ============================================================
// Service Detail Component
// ============================================================

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [
    RouterModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    LoadingSkeletonComponent,
    EnvironmentStatusComponent,
    DeploymentTimelineComponent,
    PipelineRunsComponent,
    SlicePipe,
    CreateEnvironmentDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.scss',
})
export class ServiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private wsService = inject(WebSocketService);
  private destroyRef = inject(DestroyRef);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  service = signal<ServiceDetail | null>(null);
  loading = signal(true);
  error = signal('');

  shortRepo = computed(() => shortenRepoUrl(this.service()?.repositoryUrl));

  ngOnInit(): void {
    // Load service when route param changes
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => id !== null),
        switchMap((id) => {
          this.loading.set(true);
          this.error.set('');
          return this.api.get<ServiceDetail>(`/api/services/${id}`).pipe(
            catchError((err: { error?: { message?: string }; message?: string }) => {
              this.loading.set(false);
              this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load service');
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (svc) => {
          this.service.set(svc);
          this.loading.set(false);
        },
      });

    // Re-fetch on deployment events
    this.wsService.connect();
    merge(
      this.wsService.on(WsEventType.DEPLOYMENT_STARTED),
      this.wsService.on(WsEventType.DEPLOYMENT_COMPLETED),
      this.wsService.on(WsEventType.DEPLOYMENT_FAILED),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.reload();
      });
  }

  reload(): void {
    const currentService = this.service();
    if (!currentService) return;

    this.api
      .get<ServiceDetail>(`/api/services/${currentService.id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.service.set(data);
        },
        error: () => {
          // Silent refresh failure — keep existing data visible
        },
      });
  }

  onEditClick(): void {
    this.snackBar.open('Edit service — coming soon', 'Dismiss', {
      duration: 3000,
    });
  }

  onAddEnvironmentClick(): void {
    const svc = this.service();
    if (!svc) return;
    const ref = this.dialog.open(CreateEnvironmentDialogComponent, {
      data: svc.id,
    });
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((env) => {
        if (env) {
          this.service.update((s) => (s ? { ...s, environments: [...s.environments, env] } : s));
        }
      });
  }
}
