import { Routes } from '@angular/router';

export const SERVICES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./service-list.component').then((m) => m.ServiceListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./service-detail.component').then((m) => m.ServiceDetailComponent),
  },
];
