import { Routes } from '@angular/router';

export const ENVIRONMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./environment-grid/environment-grid').then((m) => m.EnvironmentGridComponent),
  },
];
