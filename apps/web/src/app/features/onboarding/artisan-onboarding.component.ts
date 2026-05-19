import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import { AuthStore } from '../../core/auth.store';
import { VoiceRecorderComponent } from '../../shared/voice-recorder.component';

const TRADES = [
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
] as const;

@Component({
  selector: 'app-artisan-onboarding',
  standalone: true,
  imports: [FormsModule, VoiceRecorderComponent],
  template: `
    <div
      class="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-6 mt-6"
    >
      <h1 class="text-xl font-semibold mb-1">Set up your artisan profile</h1>
      <p class="text-sm text-slate-500 mb-5">
        Customers will see this — make it shine.
      </p>

      <label class="block text-sm font-medium mb-1">Trades you offer</label>
      <div class="flex flex-wrap gap-2 mb-4">
        @for (trade of trades; track trade) {
          <button
            type="button"
            (click)="toggleTrade(trade)"
            [class.bg-emerald-600]="selected().has(trade)"
            [class.text-white]="selected().has(trade)"
            [class.border-emerald-600]="selected().has(trade)"
            class="border border-slate-300 rounded-full px-3 py-1 text-sm capitalize transition"
          >
            {{ trade.replace('_', ' ') }}
          </button>
        }
      </div>

      <label class="block text-sm font-medium mb-1">Years of experience</label>
      <input
        type="number"
        min="0"
        max="60"
        [(ngModel)]="years"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
      />

      <label class="block text-sm font-medium mb-1">Hourly rate (GHS)</label>
      <input
        type="number"
        min="0"
        [(ngModel)]="rate"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
      />

      <label class="block text-sm font-medium mb-1">Service radius (km)</label>
      <input
        type="number"
        min="1"
        max="100"
        [(ngModel)]="radius"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
      />

      <label class="block text-sm font-medium mb-1">Base location</label>
      <div class="flex gap-2 mb-1">
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          [(ngModel)]="lat"
          class="flex-1 border border-slate-300 rounded px-3 py-2"
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          [(ngModel)]="lng"
          class="flex-1 border border-slate-300 rounded px-3 py-2"
        />
      </div>
      <button
        type="button"
        (click)="useMyLocation()"
        class="text-sm text-emerald-700 hover:underline mb-3"
      >
        📍 Use my current location
      </button>

      <label class="block text-sm font-medium mb-1">Address (optional)</label>
      <input
        type="text"
        placeholder="e.g. Osu, Accra"
        [(ngModel)]="address"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
      />

      <label class="block text-sm font-medium mb-1">About you</label>
      <textarea
        rows="3"
        [(ngModel)]="bio"
        placeholder="A short bio so customers know who you are"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-4"
      ></textarea>

      <label class="block text-sm font-medium mb-1"
        >Voice intro (optional)</label
      >
      <p class="text-xs text-slate-500 mb-2">
        Record up to 60 seconds in your own voice. Customers can play it back;
        we'll add a written transcript automatically.
      </p>
      <app-voice-recorder (recorded)="onVoice($event)" />
      @if (voiceUploading()) {
        <p class="text-sm text-slate-500 mt-2">Uploading voice intro…</p>
      } @else if (voiceKey()) {
        <p class="text-sm text-emerald-700 mt-2">✓ Voice intro saved</p>
      }
      <div class="mb-4"></div>

      @if (error()) {
        <p class="text-sm text-rose-600 mb-3">{{ error() }}</p>
      }

      <button
        (click)="save()"
        [disabled]="!canSubmit() || saving()"
        class="w-full bg-emerald-600 text-white rounded py-2 disabled:opacity-50"
      >
        {{ saving() ? 'Saving…' : 'Save profile' }}
      </button>
    </div>
  `,
})
export class ArtisanOnboardingComponent {
  private readonly api = inject(API_CLIENT);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly trades = TRADES;
  protected readonly selected = signal(new Set<string>());
  protected years = 0;
  protected rate: number | null = null;
  protected radius = 10;
  protected lat: number | null = null;
  protected lng: number | null = null;
  protected address = '';
  protected bio = '';
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly voiceKey = signal<string | null>(null);
  protected readonly voiceUploading = signal(false);
  private pendingVoice: {
    blob: Blob;
    durationSec: number;
    mimeType: string;
  } | null = null;

  toggleTrade(trade: string): void {
    const next = new Set(this.selected());
    next.has(trade) ? next.delete(trade) : next.add(trade);
    this.selected.set(next);
  }

  canSubmit(): boolean {
    return this.selected().size > 0 && this.lat !== null && this.lng !== null;
  }

  useMyLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;
      },
      (err) => this.error.set(`Couldn't get location: ${err.message}`),
    );
  }

  onVoice(rec: { blob: Blob; durationSec: number; mimeType: string }): void {
    // Hold the recorded blob and upload on save() so the profile exists first.
    this.pendingVoice = rec;
  }

  async save(): Promise<void> {
    this.error.set(null);
    this.saving.set(true);
    try {
      await this.api.upsertArtisanProfile({
        trades: Array.from(this.selected()),
        yearsExperience: this.years,
        hourlyRate: this.rate ?? undefined,
        serviceRadiusKm: this.radius,
        baseLocation: { lat: this.lat!, lng: this.lng! },
        baseAddress: this.address || undefined,
        bio: this.bio || undefined,
      });

      if (this.pendingVoice) {
        this.voiceUploading.set(true);
        const contentType = this.pendingVoice.mimeType.includes('webm')
          ? 'audio/webm'
          : this.pendingVoice.mimeType.includes('mp4')
            ? 'audio/mp4'
            : this.pendingVoice.mimeType.includes('ogg')
              ? 'audio/ogg'
              : 'audio/webm';
        const signed = await this.api.startVoiceUpload(contentType);
        await this.api.uploadToSignedUrl(signed.url, this.pendingVoice.blob);
        await this.api.submitVoiceIntro({
          key: signed.key,
          durationSeconds: this.pendingVoice.durationSec,
        });
        this.voiceKey.set(signed.key);
      }

      await this.auth.hydrate();
      this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
      this.voiceUploading.set(false);
    }
  }
}
