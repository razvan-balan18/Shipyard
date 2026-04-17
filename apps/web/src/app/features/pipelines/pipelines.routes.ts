import { Routes } from '@angular/router';

export const PIPELINES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pipeline-monitor/pipeline-monitor').then((m) => m.PipelineMonitorComponent),
  },
];
