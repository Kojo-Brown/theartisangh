import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/role-pick.component').then(
        (m) => m.RolePickComponent,
      ),
  },
  {
    path: 'onboarding/artisan',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/artisan-onboarding.component').then(
        (m) => m.ArtisanOnboardingComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'verification',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/verification/verification.component').then(
        (m) => m.VerificationComponent,
      ),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then(
        (m) => m.SearchComponent,
      ),
  },
  {
    path: 'artisans/:id',
    loadComponent: () =>
      import('./features/search/artisan-detail.component').then(
        (m) => m.ArtisanDetailComponent,
      ),
  },
  {
    path: 'artisans/:id/request',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/request-booking.component').then(
        (m) => m.RequestBookingComponent,
      ),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/bookings-list.component').then(
        (m) => m.BookingsListComponent,
      ),
  },
  {
    path: 'bookings/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/booking-detail.component').then(
        (m) => m.BookingDetailComponent,
      ),
  },
];
