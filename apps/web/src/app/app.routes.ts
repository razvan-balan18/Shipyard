import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Auth pages — no sidebar, centered card layout
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Main app — requires authentication, has sidebar layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/main-layout/main-layout').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'services',
        loadChildren: () =>
          import('./features/services/services.routes').then((m) => m.SERVICES_ROUTES),
      },
      {
        path: 'deployments',
        loadChildren: () =>
          import('./features/deployments/deployments.routes').then((m) => m.DEPLOYMENTS_ROUTES),
      },
      {
        path: 'pipelines',
        loadChildren: () =>
          import('./features/pipelines/pipelines.routes').then((m) => m.PIPELINES_ROUTES),
      },
      {
        path: 'environments',
        loadChildren: () =>
          import('./features/environments/environments.routes').then((m) => m.ENVIRONMENTS_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },

  // Catch-all redirect
  { path: '**', redirectTo: '' },
];
