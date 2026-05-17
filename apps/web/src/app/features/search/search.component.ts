import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import type { ArtisanSearchResult } from '@artisangh/web-api-client';

const TRADES = [
  '',
  'plumber',
  'electrician',
  'mason',
  'carpenter',
  'painter',
  'welder',
  'mechanic',
  'tiler',
  'roofer',
  'cleaner',
  'gardener',
  'general_labourer',
];

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
      <aside class="bg-white border border-slate-200 rounded-lg p-4 h-fit">
        <h2 class="font-medium mb-3">Filters</h2>

        <label class="block text-sm mb-1">Trade</label>
        <select
          [(ngModel)]="trade"
          class="w-full border border-slate-300 rounded px-2 py-1 mb-3"
        >
          @for (t of trades; track t) {
            <option [value]="t" class="capitalize">{{ t || 'Any' }}</option>
          }
        </select>

        <label class="block text-sm mb-1">Radius (km)</label>
        <input
          type="number"
          min="1"
          max="100"
          [(ngModel)]="radius"
          class="w-full border border-slate-300 rounded px-2 py-1 mb-3"
        />

        <label class="block text-sm mb-1">Location</label>
        <div class="flex gap-2 mb-2">
          <input
            type="number"
            step="any"
            placeholder="Lat"
            [(ngModel)]="lat"
            class="w-1/2 border border-slate-300 rounded px-2 py-1"
          />
          <input
            type="number"
            step="any"
            placeholder="Lng"
            [(ngModel)]="lng"
            class="w-1/2 border border-slate-300 rounded px-2 py-1"
          />
        </div>
        <button
          type="button"
          (click)="useMyLocation()"
          class="text-xs text-emerald-700 hover:underline mb-3"
        >
          📍 Use my location
        </button>

        <label class="inline-flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" [(ngModel)]="verifiedOnly" />
          Verified only
        </label>

        <button
          (click)="search()"
          [disabled]="!canSearch() || loading()"
          class="w-full bg-emerald-600 text-white rounded py-2 disabled:opacity-50"
        >
          {{ loading() ? 'Searching…' : 'Search' }}
        </button>
      </aside>

      <section>
        @if (error()) {
          <p class="text-sm text-rose-600 mb-3">{{ error() }}</p>
        }
        @if (results().length === 0 && !loading()) {
          <p class="text-sm text-slate-500">
            No artisans found. Try widening the radius.
          </p>
        }
        <ul class="space-y-3">
          @for (a of results(); track a.id) {
            <li class="bg-white border border-slate-200 rounded-lg p-4">
              <div class="flex items-start justify-between">
                <div>
                  <a
                    [routerLink]="['/artisans', a.id]"
                    class="font-medium hover:underline"
                    >{{ a.fullName }}</a
                  >
                  @if (a.verified) {
                    <span
                      class="ml-2 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded"
                      >✓ Verified</span
                    >
                  }
                  <div class="text-sm text-slate-500 capitalize">
                    {{ a.trades.join(', ') }}
                  </div>
                </div>
                <div class="text-right text-sm">
                  <div class="text-slate-700">
                    {{ a.distanceM / 1000 | number: '1.1-1' }} km away
                  </div>
                  <div class="text-slate-500">
                    ⭐ {{ a.ratingAvg | number: '1.1-1' }} ·
                    {{ a.jobsCompleted }} jobs
                  </div>
                </div>
              </div>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class SearchComponent {
  private readonly api = inject(API_CLIENT);

  protected readonly trades = TRADES;
  protected trade = '';
  protected lat: number | null = null;
  protected lng: number | null = null;
  protected radius = 10;
  protected verifiedOnly = false;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly results = signal<ArtisanSearchResult[]>([]);

  canSearch(): boolean {
    return this.lat !== null && this.lng !== null;
  }

  useMyLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      this.lat = pos.coords.latitude;
      this.lng = pos.coords.longitude;
    });
  }

  async search(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      const out = await this.api.searchArtisans({
        lat: this.lat!,
        lng: this.lng!,
        radiusKm: this.radius,
        trade: this.trade || undefined,
        verifiedOnly: this.verifiedOnly,
      });
      this.results.set(out);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
