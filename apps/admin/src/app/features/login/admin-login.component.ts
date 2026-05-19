import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthStore } from '../../core/admin-auth.store';

type Step = 'phone' | 'otp';

@Component({
  selector: 'admin-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="max-w-sm mx-auto bg-white border border-slate-200 rounded-lg p-6 mt-10"
    >
      <h1 class="text-xl font-semibold mb-1">Admin sign in</h1>
      <p class="text-sm text-slate-500 mb-6">
        Restricted area. Admin accounts only.
      </p>

      @if (step() === 'phone') {
        <p class="block text-sm font-medium mb-2">Phone number</p>
        <input
          [(ngModel)]="phone"
          placeholder="+233241234567"
          class="w-full border border-slate-300 rounded px-3 py-2 mb-3"
        />
        <button
          (click)="requestOtp()"
          [disabled]="loading() || !phone()"
          class="w-full bg-slate-900 text-white rounded py-2 disabled:opacity-50"
        >
          {{ loading() ? 'Sending…' : 'Send code' }}
        </button>
      } @else {
        <p class="text-sm text-slate-600 mb-3">
          Code sent to <span class="font-medium">{{ phone() }}</span>
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
          class="w-full bg-slate-900 text-white rounded py-2 disabled:opacity-50"
        >
          {{ loading() ? 'Verifying…' : 'Sign in' }}
        </button>
      }

      @if (error()) {
        <p class="mt-3 text-sm text-rose-600">{{ error() }}</p>
      }
    </div>
  `,
})
export class AdminLoginComponent {
  private readonly auth = inject(AdminAuthStore);
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
      await this.auth.verifyOtp(this.phone(), this.code());
      this.router.navigateByUrl('/queue');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
