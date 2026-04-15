import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="app-layout" [class.dark]="themeService.isDark()">
      <!-- Sidebar -->
      <nav class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-icon">⚓</span>
          <span class="brand-name">Shipyard</span>
        </div>

        <ul class="sidebar-nav">
          <li><a routerLink="/dashboard" routerLinkActive="active">Dashboard</a></li>
          <li><a routerLink="/services" routerLinkActive="active">Services</a></li>
          <li><a routerLink="/deployments" routerLinkActive="active">Deployments</a></li>
          <li><a routerLink="/pipelines" routerLinkActive="active">Pipelines</a></li>
          <li><a routerLink="/environments" routerLinkActive="active">Environments</a></li>
        </ul>

        <div class="sidebar-footer">
          <a routerLink="/settings" routerLinkActive="active">Settings</a>
          <button (click)="themeService.toggle()" class="theme-toggle">
            {{ themeService.isDark() ? '☀️' : '🌙' }}
          </button>
          <button (click)="authService.logout()" class="logout-btn">Logout</button>
        </div>
      </nav>

      <!-- Main content -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        height: 100vh;
        background: var(--bg-primary);
        color: var(--text-primary);
      }
      .sidebar {
        width: 240px;
        background: var(--bg-sidebar);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 1rem 0;
      }
      .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0 1.25rem;
        margin-bottom: 2rem;
        font-size: 1.25rem;
        font-weight: 700;
      }
      .sidebar-nav {
        list-style: none;
        padding: 0;
        margin: 0;
        flex: 1;
      }
      .sidebar-nav a {
        display: block;
        padding: 0.625rem 1.25rem;
        color: var(--text-secondary);
        text-decoration: none;
        transition: all 0.15s;
      }
      .sidebar-nav a:hover,
      .sidebar-nav a.active {
        color: var(--text-primary);
        background: var(--bg-hover);
      }
      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
      }
    `,
  ],
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
}
