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

import { ApiService } from '../../core/api/api.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import {
  EnvironmentStatusComponent,
  EnvironmentStatusInput,
} from './components/environment-status.component';
import { DeploymentTimelineComponent } from './components/deployment-timeline.component';
import { PipelineRunsComponent } from './components/pipeline-runs.component';

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
  template: `
    @if (loading()) {
      <app-loading-skeleton [count]="6" />
    } @else if (error()) {
      <div class="error-banner">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error() }}</span>
        <button mat-button (click)="reload()">Retry</button>
      </div>
    } @else if (service(); as svc) {
      <div class="detail-page">
        <!-- Header -->
        <header class="detail-header">
          <a routerLink="/services" class="back-link">
            <mat-icon>arrow_back</mat-icon>
            Services
          </a>

          <div class="title-row">
            <div class="title-info">
              <h1 class="display-name">{{ svc.displayName || svc.name }}</h1>
              <span class="service-name">{{ svc.name }}</span>
            </div>
            <button mat-icon-button aria-label="Edit service" (click)="onEditClick()">
              <mat-icon>edit</mat-icon>
            </button>
          </div>

          <div class="header-meta">
            @if (svc.repositoryUrl) {
              <a
                [href]="svc.repositoryUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="repo-link"
              >
                <mat-icon class="meta-icon">code</mat-icon>
                {{ shortRepo() }}
              </a>
            }
            @if (svc.techStack) {
              <span class="tech-pill">{{ svc.techStack }}</span>
            }
          </div>
        </header>

        <!-- Tabs -->
        <mat-tab-group animationDuration="200ms">
          <!-- Environments tab -->
          <mat-tab label="Environments">
            <div class="tab-content">
              @if (svc.environments.length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon">dns</mat-icon>
                  <p>No environments configured for this service.</p>
                  <button mat-stroked-button (click)="onAddEnvironmentClick()">
                    <mat-icon>add</mat-icon>
                    Add Environment
                  </button>
                </div>
              } @else {
                <div class="env-list">
                  @for (env of svc.environments; track env.id) {
                    <div class="env-item">
                      <app-environment-status [environment]="env" [showLink]="true" />
                      @if (env.currentDeploymentId) {
                        <span class="deployment-id">
                          deploy: {{ env.currentDeploymentId | slice: 0 : 8 }}
                        </span>
                      }
                    </div>
                  }
                </div>
                <button mat-stroked-button class="add-env-btn" (click)="onAddEnvironmentClick()">
                  <mat-icon>add</mat-icon>
                  Add Environment
                </button>
              }
            </div>
          </mat-tab>

          <!-- Deployments tab -->
          <mat-tab label="Deployments">
            <div class="tab-content">
              <app-deployment-timeline [serviceId]="svc.id" />
            </div>
          </mat-tab>

          <!-- Pipelines tab -->
          <mat-tab label="Pipelines">
            <div class="tab-content">
              <app-pipeline-runs [serviceId]="svc.id" />
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    }
  `,
  styles: [
    `
      .detail-page {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .detail-header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.85rem;
        color: var(--text-secondary);
        text-decoration: none;
        transition: color 0.15s ease;
      }
      .back-link:hover {
        color: var(--accent);
      }
      .back-link mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .title-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .display-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
      }

      .service-name {
        font-size: 0.85rem;
        font-family: monospace;
        color: var(--text-muted);
      }

      .header-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .repo-link {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.8rem;
        color: var(--accent);
        text-decoration: none;
        font-family: monospace;
      }
      .repo-link:hover {
        text-decoration: underline;
      }

      .meta-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .tech-pill {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 500;
        background: rgba(99, 102, 241, 0.1);
        color: #6366f1;
      }

      .tab-content {
        padding: 1.25rem 0;
      }

      .env-list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .env-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: var(--bg-card);
      }
      .env-item app-environment-status {
        flex: 1;
        min-width: 0;
      }

      .deployment-id {
        font-size: 0.7rem;
        font-family: monospace;
        color: var(--text-muted);
        white-space: nowrap;
      }

      .add-env-btn {
        margin-top: 1rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 2rem 1rem;
        color: var(--text-secondary);
        text-align: center;
      }
      .empty-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--text-muted);
      }
      .empty-state p {
        margin: 0;
        font-size: 0.9rem;
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        font-size: 0.875rem;
      }
      .error-banner mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .error-banner span {
        flex: 1;
      }
    `,
  ],
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
