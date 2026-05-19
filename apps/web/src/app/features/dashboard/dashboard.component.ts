import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { API_CLIENT } from '../../core/api.token';
import type { VerificationStatus } from '@artisangh/web-api-client';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold">Hi {{ auth.user()?.fullName }} 👋</h1>

      @if (auth.user()?.role === 'ARTISAN') {
        <section
          class="rounded-lg p-4 border"
          [class.bg-emerald-50]="verification()?.status === 'APPROVED'"
          [class.border-emerald-200]="verification()?.status === 'APPROVED'"
          [class.bg-amber-50]="verification()?.status === 'PENDING'"
          [class.border-amber-200]="verification()?.status === 'PENDING'"
          [class.bg-rose-50]="verification()?.status === 'REJECTED'"
          [class.border-rose-200]="verification()?.status === 'REJECTED'"
          [class.bg-slate-50]="
            !verification() || verification()?.status === 'UNVERIFIED'
          "
          [class.border-slate-200]="
            !verification() || verification()?.status === 'UNVERIFIED'
          "
        >
          @switch (verification()?.status) {
            @case ('APPROVED') {
              <div class="font-medium text-emerald-800">
                ✓ Identity verified
              </div>
              <div class="text-sm text-emerald-700">
                Card ending {{ verification()?.ghanaCardLast4 }}
              </div>
            }
            @case ('PENDING') {
              <div class="font-medium">⏳ Verification in review</div>
              <div class="text-sm text-amber-700">
                Usually takes a few minutes.
              </div>
            }
            @case ('REJECTED') {
              <div class="font-medium">✗ Verification rejected</div>
              <div class="text-sm text-rose-700">
                {{ verification()?.rejectionReason }}
              </div>
              <a
                routerLink="/verification"
                class="text-sm text-emerald-700 hover:underline"
                >Try again →</a
              >
            }
            @default {
              <div class="font-medium">Get verified</div>
              <div class="text-sm text-slate-600 mb-2">
                Verified artisans win 3× more jobs. It takes 2 minutes.
              </div>
              <a
                routerLink="/verification"
                class="inline-block bg-emerald-600 text-white text-sm rounded px-3 py-1.5"
              >
                Start verification
              </a>
            }
          }
        </section>

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
export class DashboardComponent implements OnInit {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(API_CLIENT);
  protected readonly verification = signal<VerificationStatus | null>(null);

  ngOnInit(): void {
    if (this.auth.user()?.role === 'ARTISAN') {
      this.api
        .myVerification()
        .then((v) => this.verification.set(v))
        .catch(() => undefined);
    }
  }
}
