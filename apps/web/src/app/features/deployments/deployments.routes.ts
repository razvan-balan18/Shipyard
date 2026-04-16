import { Routes } from '@angular/router';

export const DEPLOYMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deployments-feed/deployments-feed').then((m) => m.DeploymentsFeedComponent),
  },
];
