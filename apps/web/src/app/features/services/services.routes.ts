import { Routes } from '@angular/router';

export const SERVICES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./service-list/service-list').then((m) => m.ServiceListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./service-detail/service-detail').then((m) => m.ServiceDetailComponent),
  },
];
