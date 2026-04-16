import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { inject } from '@angular/core';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-github-integration',
  standalone: true,
  imports: [MatIconModule, MatChipsModule, ClipboardModule, MatButtonModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="github-page">
      <header class="page-header">
        <h2>GitHub Integration</h2>
      </header>

      <div class="status-row">
        <mat-icon class="status-icon">info_outline</mat-icon>
        <span class="status-text">Not configured</span>
        <span class="phase-badge">Coming in Phase 4</span>
      </div>

      <div class="info-card">
        <h3>What will this do?</h3>
        <ul class="info-list">
          <li>
            <mat-icon>check_circle_outline</mat-icon>
            <span>Install a GitHub App to connect your repositories</span>
          </li>
          <li>
            <mat-icon>check_circle_outline</mat-icon>
            <span>Automatically track CI/CD pipeline runs from GitHub Actions webhooks</span>
          </li>
          <li>
            <mat-icon>check_circle_outline</mat-icon>
            <span>Surface commit, branch, and PR metadata on each deployment</span>
          </li>
        </ul>

        <div class="webhook-section">
          <label class="webhook-label">Webhook URL</label>
          <div class="webhook-url-row">
            <code class="webhook-url">{{ webhookUrl }}</code>
            <button
              mat-icon-button
              (click)="copyWebhookUrl()"
              aria-label="Copy webhook URL"
              class="copy-btn"
            >
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
          <p class="webhook-hint">
            This is the URL GitHub will POST webhook events to once the integration is configured.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .github-page {
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

      .status-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .status-icon {
        color: #3b82f6;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .status-text {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-muted);
      }

      .phase-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
        margin-left: 0.5rem;
      }

      .info-card {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1.25rem;
        background: var(--bg-card);
      }

      .info-card h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 1rem;
      }

      .info-list {
        list-style: none;
        margin: 0 0 1.5rem;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .info-list li {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--text-primary);
        line-height: 1.4;
      }

      .info-list mat-icon {
        color: #22c55e;
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .webhook-section {
        border-top: 1px solid var(--border);
        padding-top: 1rem;
      }

      .webhook-label {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        display: block;
        margin-bottom: 0.5rem;
      }

      .webhook-url-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .webhook-url {
        flex: 1;
        padding: 0.625rem 0.875rem;
        border-radius: 6px;
        background: var(--bg-surface, rgba(128, 128, 128, 0.08));
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.8rem;
        color: var(--text-primary);
        word-break: break-all;
        border: 1px solid var(--border);
      }

      .copy-btn {
        color: var(--text-muted);
        flex-shrink: 0;
        transition: color 0.15s ease;
      }
      .copy-btn:hover {
        color: var(--accent);
      }

      .webhook-hint {
        margin: 0.5rem 0 0;
        font-size: 0.8rem;
        color: var(--text-muted);
        line-height: 1.4;
      }
    `,
  ],
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
