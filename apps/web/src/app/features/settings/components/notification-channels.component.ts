import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { switchMap } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import {
  ChannelType,
  NotificationType,
  NotificationChannelSummary,
  CreateNotificationChannelRequest,
} from '@shipyard/shared';

const CHANNEL_ICONS: Record<ChannelType, string> = {
  SLACK: 'tag',
  DISCORD: 'forum',
  WEBHOOK: 'webhook',
};

const EVENT_LABELS: Record<string, string> = {
  DEPLOYMENT_SUCCESS: 'Deploy Success',
  DEPLOYMENT_FAILED: 'Deploy Failed',
  HEALTH_DOWN: 'Health Down',
  HEALTH_RECOVERED: 'Health Recovered',
  ROLLBACK: 'Rollback',
};

const ALL_EVENTS = Object.values(NotificationType);
const ALL_CHANNEL_TYPES = Object.values(ChannelType);

@Component({
  selector: 'app-notification-channels',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="channels-page">
      <header class="page-header">
        <h2>Notification Channels</h2>
      </header>

      @if (error()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button mat-button (click)="loadChannels()">Retry</button>
        </div>
      }

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40" />
        </div>
      } @else {
        @if (channels().length === 0) {
          <div class="empty-state">
            <mat-icon>notifications_off</mat-icon>
            <p>No notification channels configured yet.</p>
          </div>
        } @else {
          <div class="channels-list">
            @for (channel of channels(); track channel.id) {
              <div class="channel-row">
                <div class="channel-info">
                  <mat-icon class="channel-type-icon">{{ getChannelIcon(channel.type) }}</mat-icon>
                  <div class="channel-details">
                    <div class="channel-name-row">
                      <span class="channel-name">{{ channel.name }}</span>
                      <span class="channel-type-badge">{{ channel.type }}</span>
                    </div>
                    <div class="channel-events">
                      @for (event of channel.events; track event) {
                        <span class="event-chip">{{ getEventLabel(event) }}</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="channel-actions">
                  <mat-slide-toggle
                    [checked]="channel.enabled"
                    (change)="onToggleEnabled(channel, $event.checked)"
                    aria-label="Toggle channel"
                  />
                  <button
                    mat-icon-button
                    (click)="testChannel(channel)"
                    aria-label="Test channel"
                    class="test-btn"
                  >
                    <mat-icon>send</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    (click)="confirmDelete(channel)"
                    aria-label="Delete channel"
                    class="delete-btn"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Add Channel Form -->
        <div class="add-channel-section">
          <h3>Add Channel</h3>

          @if (addError()) {
            <div class="error-banner compact">
              <mat-icon>error_outline</mat-icon>
              <span>{{ addError() }}</span>
            </div>
          }

          <form [formGroup]="addForm" (ngSubmit)="submitAdd()" class="add-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. Production Alerts" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field form-field-type">
                <mat-label>Type</mat-label>
                <mat-select formControlName="type">
                  @for (t of channelTypes; track t) {
                    <mat-option [value]="t">{{ t }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Webhook URL</mat-label>
                <input
                  matInput
                  formControlName="webhookUrl"
                  placeholder="https://hooks.slack.com/..."
                />
              </mat-form-field>
            </div>

            <div class="events-section">
              <label class="events-label">Events</label>
              <div class="events-grid">
                @for (event of allEvents; track event) {
                  <mat-checkbox
                    [checked]="isEventSelected(event)"
                    (change)="onEventToggle(event, $event.checked)"
                  >
                    {{ getEventLabel(event) }}
                  </mat-checkbox>
                }
              </div>
            </div>

            <div class="form-footer">
              <mat-slide-toggle
                [checked]="addFormEnabled()"
                (change)="addFormEnabled.set($event.checked)"
              >
                Enabled
              </mat-slide-toggle>

              <button
                class="btn-primary"
                type="submit"
                [disabled]="addForm.invalid || selectedEvents().length === 0 || adding()"
              >
                {{ adding() ? 'Adding...' : 'Add Channel' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .channels-page {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .page-header h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
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
      .error-banner.compact {
        margin-bottom: 0.75rem;
      }
      .error-banner mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .error-banner span {
        flex: 1;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem 0;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 3rem 0;
        color: var(--text-muted);
      }
      .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }
      .empty-state p {
        margin: 0;
        font-size: 0.9rem;
      }

      /* Channel list */
      .channels-list {
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        background: var(--bg-card);
      }

      .channel-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.875rem 1.25rem;
        border-bottom: 1px solid var(--border);
      }
      .channel-row:last-child {
        border-bottom: none;
      }

      .channel-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        min-width: 0;
      }

      .channel-type-icon {
        color: var(--text-muted);
        flex-shrink: 0;
      }

      .channel-details {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        min-width: 0;
      }

      .channel-name-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .channel-name {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .channel-type-badge {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 999px;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        background: var(--bg-surface, rgba(128, 128, 128, 0.1));
        flex-shrink: 0;
      }

      .channel-events {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .event-chip {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 500;
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }

      .channel-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;
      }

      .test-btn {
        color: var(--text-muted);
        transition: color 0.15s ease;
      }
      .test-btn:hover {
        color: var(--accent);
      }

      .delete-btn {
        color: var(--text-muted);
        transition: color 0.15s ease;
      }
      .delete-btn:hover {
        color: #ef4444;
      }

      /* Add channel section */
      .add-channel-section {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1.25rem;
        background: var(--bg-card);
      }

      .add-channel-section h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 1rem;
      }

      .add-form {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .form-row {
        display: flex;
        gap: 1rem;
      }

      .form-field {
        flex: 1;
      }

      .form-field-type {
        max-width: 200px;
      }

      .events-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .events-label {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
      }

      .events-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .form-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 0.25rem;
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 36px;
        padding: 0 18px;
        border: none;
        border-radius: 6px;
        background: var(--accent);
        color: #fff;
        font-size: 0.875rem;
        font-family: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .btn-primary:hover:not(:disabled) {
        opacity: 0.88;
      }
      .btn-primary:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ],
})
export class NotificationChannelsComponent implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  channels = signal<NotificationChannelSummary[]>([]);
  loading = signal(true);
  error = signal('');
  addError = signal('');
  adding = signal(false);

  selectedEvents = signal<string[]>([]);
  addFormEnabled = signal(true);

  readonly allEvents = ALL_EVENTS;
  readonly channelTypes = ALL_CHANNEL_TYPES;

  addForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['SLACK' as ChannelType, [Validators.required]],
    webhookUrl: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadChannels();
  }

  loadChannels(): void {
    this.loading.set(true);
    this.error.set('');

    this.api
      .get<NotificationChannelSummary[]>('/api/notifications/channels')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.channels.set(data);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? err.message ?? 'Failed to load channels');
        },
      });
  }

  getChannelIcon(type: ChannelType): string {
    return CHANNEL_ICONS[type];
  }

  getEventLabel(event: string): string {
    return EVENT_LABELS[event] ?? event;
  }

  isEventSelected(event: string): boolean {
    return this.selectedEvents().includes(event);
  }

  onEventToggle(event: string, checked: boolean): void {
    this.selectedEvents.update((events) =>
      checked ? [...events, event] : events.filter((e) => e !== event),
    );
  }

  onToggleEnabled(channel: NotificationChannelSummary, enabled: boolean): void {
    const previous = channel.enabled;

    this.channels.update((list) => list.map((c) => (c.id === channel.id ? { ...c, enabled } : c)));

    this.api
      .patch<NotificationChannelSummary>(`/api/notifications/channels/${channel.id}`, { enabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(enabled ? 'Channel enabled' : 'Channel disabled', 'Dismiss', {
            duration: 3000,
          });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.channels.update((list) =>
            list.map((c) => (c.id === channel.id ? { ...c, enabled: previous } : c)),
          );
          this.snackBar.open(
            err.error?.message ?? err.message ?? 'Failed to update channel',
            'Dismiss',
            { duration: 4000 },
          );
        },
      });
  }

  testChannel(channel: NotificationChannelSummary): void {
    this.api
      .post<void>(`/api/notifications/channels/${channel.id}/test`, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Test sent', 'Dismiss', { duration: 3000 });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.snackBar.open(err.error?.message ?? err.message ?? 'Test failed', 'Dismiss', {
            duration: 4000,
          });
        },
      });
  }

  confirmDelete(channel: NotificationChannelSummary): void {
    const ref = this.snackBar.open(`Delete "${channel.name}"?`, 'Confirm', { duration: 5000 });

    ref
      .onAction()
      .pipe(
        switchMap(() => this.api.delete<void>(`/api/notifications/channels/${channel.id}`)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.channels.update((list) => list.filter((c) => c.id !== channel.id));
          this.snackBar.open('Channel deleted', 'Dismiss', { duration: 3000 });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.snackBar.open(
            err.error?.message ?? err.message ?? 'Failed to delete channel',
            'Dismiss',
            { duration: 4000 },
          );
        },
      });
  }

  submitAdd(): void {
    if (this.addForm.invalid || this.selectedEvents().length === 0) return;

    this.adding.set(true);
    this.addError.set('');

    const { name, type, webhookUrl } = this.addForm.getRawValue();

    const payload: CreateNotificationChannelRequest = {
      name,
      type,
      config: type === 'WEBHOOK' ? { url: webhookUrl } : { webhookUrl },
      events: this.selectedEvents(),
      enabled: this.addFormEnabled(),
    };

    this.api
      .post<NotificationChannelSummary>('/api/notifications/channels', payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.channels.update((list) => [...list, created]);
          this.addForm.reset({ name: '', type: 'SLACK' as ChannelType, webhookUrl: '' });
          this.selectedEvents.set([]);
          this.addFormEnabled.set(true);
          this.adding.set(false);
          this.snackBar.open('Channel added', 'Dismiss', { duration: 3000 });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.adding.set(false);
          const msg = err.error?.message ?? err.message ?? 'Failed to add channel';
          this.addError.set(typeof msg === 'string' ? msg : 'Failed to add channel');
        },
      });
  }
}
