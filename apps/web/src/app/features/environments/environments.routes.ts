import { Routes } from '@angular/router';

export const ENVIRONMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./environment-grid.component').then((m) => m.EnvironmentGridComponent),
  },
];
