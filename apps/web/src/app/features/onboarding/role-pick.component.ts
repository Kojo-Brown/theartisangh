import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-role-pick',
  standalone: true,
  template: `
    <div class="max-w-md mx-auto text-center mt-10">
      <h1 class="text-2xl font-semibold mb-2">
        Welcome, {{ auth.user()?.fullName }} 👋
      </h1>
      <p class="text-slate-600 mb-8">What brings you here?</p>

      <div class="grid grid-cols-1 gap-3">
        <button
          (click)="pick('CUSTOMER')"
          class="rounded-lg border border-slate-200 p-6 hover:border-emerald-500 hover:shadow-sm transition"
        >
          <div class="text-lg font-medium">I need an artisan</div>
          <div class="text-sm text-slate-500">
            Find verified plumbers, electricians, masons and more near you.
          </div>
        </button>
        <button
          (click)="pick('ARTISAN')"
          class="rounded-lg border border-slate-200 p-6 hover:border-emerald-500 hover:shadow-sm transition"
        >
          <div class="text-lg font-medium">I am an artisan</div>
          <div class="text-sm text-slate-500">
            Set up your profile and start receiving job requests.
          </div>
        </button>
      </div>
    </div>
  `,
})
export class RolePickComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  pick(role: 'CUSTOMER' | 'ARTISAN'): void {
    if (role === 'ARTISAN') this.router.navigateByUrl('/onboarding/artisan');
    else this.router.navigateByUrl('/dashboard');
  }
}
