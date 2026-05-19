import { Route } from '@angular/router';
import { adminGuard } from './core/admin.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'queue',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/admin-login.component').then(
        (m) => m.AdminLoginComponent,
      ),
  },
  {
    path: 'queue',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/queue/queue.component').then((m) => m.QueueComponent),
  },
  {
    path: 'queue/:id',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/queue/queue-detail.component').then(
        (m) => m.QueueDetailComponent,
      ),
  },
  {
    path: 'disputes',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/disputes/disputes.component').then(
        (m) => m.DisputesComponent,
      ),
  },
];
