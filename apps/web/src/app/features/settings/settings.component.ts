import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { TeamMembersComponent } from './components/team-members.component';
import { NotificationChannelsComponent } from './components/notification-channels.component';
import { GitHubIntegrationComponent } from './components/github-integration.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatTabsModule,
    TeamMembersComponent,
    NotificationChannelsComponent,
    GitHubIntegrationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <h1 class="page-title">Settings</h1>

      <mat-tab-group animationDuration="200ms">
        <mat-tab label="Team Members">
          <div class="tab-content">
            <app-team-members />
          </div>
        </mat-tab>

        <mat-tab label="Notifications">
          <div class="tab-content">
            <app-notification-channels />
          </div>
        </mat-tab>

        <mat-tab label="GitHub">
          <div class="tab-content">
            <app-github-integration />
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .settings-page {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
      }

      .page-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 1.5rem;
      }

      .tab-content {
        padding: 1.5rem 0;
      }
    `,
  ],
})
export class SettingsComponent {}
