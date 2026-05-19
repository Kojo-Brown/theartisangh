import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import type { ArtisanProfile } from '@artisangh/web-api-client';
import { VoiceRecorderComponent } from '../../shared/voice-recorder.component';

type Voice = { blob: Blob; durationSec: number; mimeType: string };

@Component({
  selector: 'app-request-booking',
  standalone: true,
  imports: [FormsModule, VoiceRecorderComponent],
  template: `
    <div
      class="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-6 mt-6"
    >
      <h1 class="text-xl font-semibold mb-1">Request this artisan</h1>
      @if (artisan(); as a) {
        <p class="text-sm text-slate-500 mb-5">
          {{ a.user?.fullName }} · {{ a.trades.join(', ') }}
        </p>
      }

      <p class="block text-sm font-medium mb-1">What do you need done?</p>
      <textarea
        rows="3"
        [(ngModel)]="description"
        placeholder="Describe the job in your own words"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
      ></textarea>

      <p class="block text-sm font-medium mb-1">Or record a voice note</p>
      <p class="text-xs text-slate-500 mb-2">
        Customers who record voice notes get faster, more accurate quotes.
      </p>
      <app-voice-recorder (recorded)="onVoice($event)" />
      <div class="mb-4"></div>

      <p class="block text-sm font-medium mb-1">Where?</p>
      <div class="flex gap-2 mb-2">
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
        📍 Use my location
      </button>

      <p class="block text-sm font-medium mb-1">Address (optional)</p>
      <input
        type="text"
        [(ngModel)]="address"
        placeholder="e.g. Osu, Accra"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
      />

      <p class="block text-sm font-medium mb-1">When (optional)</p>
      <input
        type="datetime-local"
        [(ngModel)]="scheduledAt"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
      />

      <p class="block text-sm font-medium mb-1">Total amount (GHS)</p>
      <input
        type="number"
        min="1"
        [(ngModel)]="amount"
        class="w-full border border-slate-300 rounded px-3 py-2 mb-4"
      />

      @if (error()) {
        <p class="text-sm text-rose-600 mb-3">{{ error() }}</p>
      }

      <button
        (click)="submit()"
        [disabled]="!canSubmit() || busy()"
        class="w-full bg-emerald-600 text-white rounded py-2 disabled:opacity-50"
      >
        @switch (phase()) {
          @case ('uploading') {
            Uploading voice note…
          }
          @case ('charging') {
            Charging your payment…
          }
          @default {
            Request + pay {{ amount || 0 }} GHS
          }
        }
      </button>

      <p class="mt-3 text-xs text-slate-400">
        Funds are held in escrow — the artisan only gets paid when you confirm
        the job is done.
      </p>
    </div>
  `,
})
export class RequestBookingComponent implements OnInit {
  private readonly api = inject(API_CLIENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly artisan = signal<ArtisanProfile | null>(null);
  protected description = '';
  protected lat: number | null = null;
  protected lng: number | null = null;
  protected address = '';
  protected scheduledAt = '';
  protected amount: number | null = null;
  protected readonly phase = signal<'idle' | 'uploading' | 'charging'>('idle');
  protected readonly error = signal<string | null>(null);
  private pendingVoice: Voice | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.artisanById(id).then((a) => this.artisan.set(a));
  }

  onVoice(v: Voice): void {
    this.pendingVoice = v;
  }

  useMyLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      this.lat = pos.coords.latitude;
      this.lng = pos.coords.longitude;
    });
  }

  canSubmit(): boolean {
    return (
      !!this.artisan() &&
      this.lat !== null &&
      this.lng !== null &&
      !!this.amount &&
      this.amount > 0 &&
      (this.description.length > 0 || this.pendingVoice !== null)
    );
  }

  busy(): boolean {
    return this.phase() !== 'idle';
  }

  async submit(): Promise<void> {
    const a = this.artisan();
    if (!a) return;
    this.error.set(null);
    try {
      let voiceNoteKey: string | undefined;
      if (this.pendingVoice) {
        this.phase.set('uploading');
        const ct = pickContentType(this.pendingVoice.mimeType);
        const signed = await this.api.startBookingVoiceUpload(ct);
        await this.api.uploadToSignedUrl(signed.url, this.pendingVoice.blob);
        voiceNoteKey = signed.key;
      }

      this.phase.set('charging');
      const res = await this.api.createBooking({
        artisanId: a.userId,
        trade: a.trades[0] ?? 'general_labourer',
        description: this.description || undefined,
        voiceNoteKey,
        scheduledAt: this.scheduledAt
          ? new Date(this.scheduledAt).toISOString()
          : undefined,
        jobLocation: { lat: this.lat!, lng: this.lng! },
        jobAddress: this.address || undefined,
        totalAmount: this.amount!,
      });

      if (res.checkoutUrl) {
        // Real Hubtel: redirect for payment.
        window.location.href = res.checkoutUrl;
        return;
      }
      // Dev stub: payment auto-settled; go to booking detail.
      this.router.navigateByUrl(`/bookings/${res.booking.id}`);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.phase.set('idle');
    }
  }
}

function pickContentType(
  mime: string,
): 'audio/webm' | 'audio/ogg' | 'audio/mp4' {
  if (mime.includes('webm')) return 'audio/webm';
  if (mime.includes('mp4')) return 'audio/mp4';
  if (mime.includes('ogg')) return 'audio/ogg';
  return 'audio/webm';
}
