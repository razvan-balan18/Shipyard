import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { TeamMembersComponent } from './components/team-members/team-members';
import { NotificationChannelsComponent } from './components/notification-channels/notification-channels';
import { GitHubIntegrationComponent } from './components/github-integration/github-integration';

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
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {}
