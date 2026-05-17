import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import type { ArtisanProfile } from '@artisangh/web-api-client';

@Component({
  selector: 'app-artisan-detail',
  standalone: true,
  template: `
    @if (loading()) {
      <p class="text-sm text-slate-500">Loading…</p>
    }
    @if (error()) {
      <p class="text-sm text-rose-600">{{ error() }}</p>
    }
    @if (profile(); as p) {
      <div class="bg-white border border-slate-200 rounded-lg p-6 max-w-xl">
        <h1 class="text-2xl font-semibold">{{ p.user?.fullName }}</h1>
        <div class="text-sm text-slate-500 capitalize mb-3">
          {{ p.trades.join(', ') }}
        </div>
        <div class="text-sm space-y-1">
          <div>Years experience: {{ p.yearsExperience }}</div>
          <div>Hourly rate: {{ p.hourlyRate ?? '—' }} {{ p.currency }}</div>
          <div>Rating: ⭐ {{ p.ratingAvg }} ({{ p.ratingCount }} reviews)</div>
          <div>Jobs completed: {{ p.jobsCompleted }}</div>
          @if (p.baseAddress) {
            <div>Based in: {{ p.baseAddress }}</div>
          }
        </div>
        @if (p.bio) {
          <p class="mt-4 text-slate-700 whitespace-pre-line">{{ p.bio }}</p>
        }
        <p class="mt-6 text-xs text-slate-400">
          Booking flow lands in Milestone 5.
        </p>
      </div>
    }
  `,
})
export class ArtisanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(API_CLIENT);

  protected readonly profile = signal<ArtisanProfile | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.api
      .artisanById(id)
      .then((p) => this.profile.set(p))
      .catch((err) => this.error.set((err as Error).message))
      .finally(() => this.loading.set(false));
  }
}
