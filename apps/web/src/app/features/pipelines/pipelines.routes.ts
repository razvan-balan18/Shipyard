import { Routes } from '@angular/router';

export const PIPELINES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pipeline-monitor.component').then((m) => m.PipelineMonitorComponent),
  },
];
