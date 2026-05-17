import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold">Hi {{ auth.user()?.fullName }} 👋</h1>

      @if (auth.user()?.role === 'ARTISAN') {
        @if (auth.user()?.artisanProfile; as profile) {
          <section class="bg-white border border-slate-200 rounded-lg p-5">
            <h2 class="font-medium mb-2">Your artisan profile</h2>
            <div class="text-sm text-slate-600 space-y-1">
              <div>
                Trades:
                <span class="capitalize">{{ profile.trades.join(', ') }}</span>
              </div>
              <div>Service radius: {{ profile.serviceRadiusKm }} km</div>
              <div>
                Hourly rate: {{ profile.hourlyRate ?? '—' }}
                {{ profile.currency }}
              </div>
              <div>Jobs completed: {{ profile.jobsCompleted }}</div>
            </div>
            <a
              routerLink="/onboarding/artisan"
              class="mt-3 inline-block text-sm text-emerald-700 hover:underline"
            >
              Edit profile →
            </a>
          </section>
        } @else {
          <section class="bg-amber-50 border border-amber-200 rounded p-4">
            <p class="text-sm">Your artisan profile isn't set up yet.</p>
            <a
              routerLink="/onboarding/artisan"
              class="text-sm text-emerald-700 hover:underline"
              >Finish setup →</a
            >
          </section>
        }
      } @else {
        <section class="bg-white border border-slate-200 rounded-lg p-5">
          <h2 class="font-medium mb-1">Need a hand?</h2>
          <p class="text-sm text-slate-600 mb-3">
            Search verified artisans near you and book in minutes.
          </p>
          <a
            routerLink="/search"
            class="inline-block bg-emerald-600 text-white text-sm rounded px-4 py-2"
          >
            Find an artisan
          </a>
        </section>
      }

      <section class="bg-white border border-slate-200 rounded-lg p-5">
        <h2 class="font-medium mb-2">Bookings</h2>
        <p class="text-sm text-slate-500">Coming in Milestone 5.</p>
      </section>
    </div>
  `,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthStore);
}
