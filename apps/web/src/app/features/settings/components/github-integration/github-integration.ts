import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { inject } from '@angular/core';

import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-github-integration',
  standalone: true,
  imports: [MatIconModule, MatChipsModule, ClipboardModule, MatButtonModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './github-integration.html',
  styleUrl: './github-integration.scss',
})
export class GitHubIntegrationComponent {
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);

  readonly webhookUrl = `${environment.apiUrl}/api/webhooks/github`;

  copyWebhookUrl(): void {
    this.clipboard.copy(this.webhookUrl);
    this.snackBar.open('Webhook URL copied', 'Dismiss', { duration: 2000 });
  }
}
