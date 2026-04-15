import { Routes } from '@angular/router';

export const DEPLOYMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deployments-feed.component').then((m) => m.DeploymentsFeedComponent),
  },
];
