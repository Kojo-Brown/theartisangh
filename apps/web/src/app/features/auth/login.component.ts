import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { TranslatePipe } from '../../core/translate.pipe';

type Step = 'phone' | 'otp';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div
      class="max-w-sm mx-auto bg-white rounded-lg border border-slate-200 p-6 mt-8"
    >
      <h1 class="text-xl font-semibold text-slate-900 mb-1">
        {{ 'auth.login' | t }}
      </h1>
      <p class="text-sm text-slate-500 mb-6">{{ 'app.tagline' | t }}</p>

      @if (step() === 'phone') {
        <label class="block text-sm font-medium mb-2">{{
          'auth.phonePrompt' | t
        }}</label>
        <input
          [(ngModel)]="phone"
          placeholder="+233241234567"
          class="w-full border border-slate-300 rounded px-3 py-2 mb-3 focus:ring-2 focus:ring-emerald-500"
        />
        <button
          (click)="requestOtp()"
          [disabled]="loading() || !phone()"
          class="w-full bg-emerald-600 text-white rounded py-2 disabled:opacity-50"
        >
          {{ loading() ? 'Sending…' : 'Send code' }}
        </button>
      } @else {
        <p class="text-sm text-slate-600 mb-3">
          {{ 'auth.otpPrompt' | t }}
          <span class="font-medium">{{ phone() }}</span>
        </p>
        <input
          [(ngModel)]="code"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          class="w-full border border-slate-300 rounded px-3 py-2 mb-3 tracking-widest text-center font-mono text-lg"
        />
        <button
          (click)="verifyOtp()"
          [disabled]="loading() || code().length < 4"
          class="w-full bg-emerald-600 text-white rounded py-2 disabled:opacity-50 mb-2"
        >
          {{ loading() ? 'Verifying…' : 'Verify' }}
        </button>
        <button
          (click)="step.set('phone')"
          class="w-full text-sm text-slate-500 hover:underline"
        >
          Change phone number
        </button>
      }

      @if (error()) {
        <p class="mt-3 text-sm text-rose-600">{{ error() }}</p>
      }

      @if (step() === 'phone') {
        <p class="mt-6 text-xs text-slate-400">
          Dev tip: in console mode, the OTP is logged in the worker terminal as
          <code class="bg-slate-100 px-1 rounded">[SMS-STUB → ...]</code>.
        </p>
      }
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly step = signal<Step>('phone');
  protected readonly phone = signal('');
  protected readonly code = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  async requestOtp(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.requestOtp(this.phone());
      this.step.set('otp');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async verifyOtp(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.verifyOtp({ phone: this.phone(), code: this.code() });
      this.router.navigateByUrl('/onboarding');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
