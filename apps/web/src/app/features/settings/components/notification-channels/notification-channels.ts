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

import { ApiService } from '../../../../core/api/api.service';
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
  templateUrl: './notification-channels.html',
  styleUrl: './notification-channels.scss',
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
