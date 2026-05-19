import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import type { VerificationStatus } from '@artisangh/web-api-client';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-6 mt-6"
    >
      <h1 class="text-xl font-semibold mb-1">Verify your identity</h1>
      <p class="text-sm text-slate-500 mb-5">
        Upload your Ghana Card (front + back) and a selfie. Verified artisans
        get a badge that helps them win more jobs.
      </p>

      @if (status()?.status === 'APPROVED') {
        <div
          class="rounded bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm"
        >
          ✓ You're verified. Last 4 of your card: {{ status()?.ghanaCardLast4 }}
        </div>
      } @else if (status()?.status === 'PENDING') {
        <div
          class="rounded bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          ⏳ We're reviewing your submission. This usually takes a few minutes.
        </div>
      } @else {
        @if (status()?.status === 'REJECTED') {
          <div
            class="rounded bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm mb-4"
          >
            ✗ Previous submission rejected: {{ status()?.rejectionReason }}
          </div>
        }

        <label class="block text-sm font-medium mb-1">Ghana Card number</label>
        <input
          [(ngModel)]="cardNumber"
          placeholder="GHA-123456789-0"
          class="w-full border border-slate-300 rounded px-3 py-2 mb-4 font-mono uppercase"
        />

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <label
            class="block text-center border-2 border-dashed rounded p-3 cursor-pointer hover:border-emerald-500"
          >
            <div class="text-sm font-medium mb-1">Card front</div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden"
              (change)="pick('front', $event)"
            />
            <div class="text-xs text-slate-500">
              {{ front()?.name ?? 'Tap to capture' }}
            </div>
          </label>
          <label
            class="block text-center border-2 border-dashed rounded p-3 cursor-pointer hover:border-emerald-500"
          >
            <div class="text-sm font-medium mb-1">Card back</div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden"
              (change)="pick('back', $event)"
            />
            <div class="text-xs text-slate-500">
              {{ back()?.name ?? 'Tap to capture' }}
            </div>
          </label>
          <label
            class="block text-center border-2 border-dashed rounded p-3 cursor-pointer hover:border-emerald-500"
          >
            <div class="text-sm font-medium mb-1">Selfie</div>
            <input
              type="file"
              accept="image/*"
              capture="user"
              class="hidden"
              (change)="pick('selfie', $event)"
            />
            <div class="text-xs text-slate-500">
              {{ selfie()?.name ?? 'Tap to capture' }}
            </div>
          </label>
        </div>

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
              Uploading photos…
            }
            @case ('submitting') {
              Submitting for review…
            }
            @default {
              Submit for verification
            }
          }
        </button>
      }
    </div>
  `,
})
export class VerificationComponent implements OnInit {
  private readonly api = inject(API_CLIENT);
  private readonly router = inject(Router);

  protected readonly status = signal<VerificationStatus | null>(null);
  protected readonly front = signal<File | null>(null);
  protected readonly back = signal<File | null>(null);
  protected readonly selfie = signal<File | null>(null);
  protected cardNumber = '';
  protected readonly phase = signal<'idle' | 'uploading' | 'submitting'>(
    'idle',
  );
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api
      .myVerification()
      .then((s) => this.status.set(s))
      .catch(() => undefined);
  }

  pick(slot: 'front' | 'back' | 'selfie', event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (slot === 'front') this.front.set(file);
    else if (slot === 'back') this.back.set(file);
    else this.selfie.set(file);
  }

  canSubmit(): boolean {
    return (
      !!this.front() &&
      !!this.back() &&
      !!this.selfie() &&
      /^GHA-\d{9}-\d$/i.test(this.cardNumber.trim())
    );
  }

  busy(): boolean {
    return this.phase() !== 'idle';
  }

  async submit(): Promise<void> {
    this.error.set(null);
    try {
      this.phase.set('uploading');
      const signed = await this.api.startVerification({
        frontContentType: this.front()!.type as 'image/jpeg',
        backContentType: this.back()!.type as 'image/jpeg',
        selfieContentType: this.selfie()!.type as 'image/jpeg',
      });
      await Promise.all([
        this.api.uploadToSignedUrl(signed.front.url, this.front()!),
        this.api.uploadToSignedUrl(signed.back.url, this.back()!),
        this.api.uploadToSignedUrl(signed.selfie.url, this.selfie()!),
      ]);

      this.phase.set('submitting');
      const next = await this.api.submitVerification({
        ghanaCardNumber: this.cardNumber.trim().toUpperCase(),
        frontKey: signed.front.key,
        backKey: signed.back.key,
        selfieKey: signed.selfie.key,
      });
      this.status.set(next);
      this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.phase.set('idle');
    }
  }
}
