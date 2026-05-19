import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AdminAuthStore } from '../core/admin-auth.store';

@Component({
  selector: 'admin-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <header class="border-b border-slate-800 bg-slate-900 text-slate-100">
      <div
        class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between"
      >
        <a routerLink="/" class="font-semibold text-lg">Artisan GH · Admin</a>
        @if (auth.isAuthed()) {
          <nav class="flex items-center gap-4 text-sm">
            <a routerLink="/queue" class="hover:underline">Verifications</a>
            <a routerLink="/disputes" class="hover:underline">Disputes</a>
            <span class="text-slate-400">{{ auth.user()?.fullName }}</span>
            <button
              (click)="auth.signOut()"
              class="text-rose-400 hover:underline"
            >
              Sign out
            </button>
          </nav>
        }
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-6"><router-outlet /></main>
  `,
})
export class AdminShellComponent {
  protected readonly auth = inject(AdminAuthStore);
}
