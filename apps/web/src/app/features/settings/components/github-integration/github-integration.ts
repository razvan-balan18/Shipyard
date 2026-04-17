import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ApiService } from '../../../../core/api/api.service';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { environment } from '../../../../../environments/environment';
import type { GitHubIntegrationStatus } from '@shipyard/shared';

@Component({
  selector: 'app-github-integration',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    ClipboardModule,
    RouterLink,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './github-integration.html',
  styleUrl: './github-integration.scss',
})
export class GitHubIntegrationComponent implements OnInit {
  private api = inject(ApiService);
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);

  readonly webhookUrl = `${environment.apiUrl}/api/webhooks/github`;

  status = signal<GitHubIntegrationStatus | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  isConnected = computed(() => (this.status()?.eventsReceived ?? 0) > 0);

  ngOnInit(): void {
    this.api.get<GitHubIntegrationStatus>('/api/integrations/github').subscribe({
      next: (data) => {
        this.status.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const e = err as { error?: { message?: string } };
        this.error.set(e?.error?.message ?? 'Failed to load GitHub status');
        this.loading.set(false);
      },
    });
  }

  copyWebhookUrl(): void {
    this.clipboard.copy(this.webhookUrl);
    this.snackBar.open('Webhook URL copied', 'Dismiss', { duration: 2000 });
  }

  shortenUrl(url: string): string {
    try {
      return new URL(url).pathname.slice(1);
    } catch {
      return url;
    }
  }
}
