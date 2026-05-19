import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth.store';
import { LocalePickerComponent } from './locale-picker.component';
import { TranslatePipe } from '../core/translate.pipe';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet, LocalePickerComponent, TranslatePipe],
  template: `
    <header class="border-b border-slate-200 bg-white">
      <div
        class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between"
      >
        <a routerLink="/" class="font-semibold text-lg text-emerald-700">{{
          'app.name' | t
        }}</a>
        <nav class="flex items-center gap-4 text-sm">
          @if (auth.isAuthed()) {
            <a routerLink="/dashboard" class="hover:underline">Dashboard</a>
            <a routerLink="/search" class="hover:underline">Find artisans</a>
            <a routerLink="/bookings" class="hover:underline">Bookings</a>
            <button
              (click)="auth.signOut()"
              class="text-rose-600 hover:underline"
            >
              Sign out
            </button>
          } @else {
            <a routerLink="/auth/login" class="hover:underline">Log in</a>
          }
          <app-locale-picker />
        </nav>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-6"><router-outlet /></main>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthStore);
}
