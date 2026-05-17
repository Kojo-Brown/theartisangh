import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../core/auth.store';
import { TranslatePipe } from '../core/translate.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="text-center py-12">
      <h1 class="text-3xl md:text-4xl font-bold text-slate-900">
        {{ 'app.name' | t }}
      </h1>
      <p class="mt-3 text-lg text-slate-600">{{ 'app.tagline' | t }}</p>
      <div class="mt-6 flex justify-center gap-3">
        @if (!auth.isAuthed()) {
          <a
            routerLink="/auth/login"
            class="bg-emerald-600 text-white px-5 py-2 rounded"
          >
            {{ 'auth.login' | t }}
          </a>
        }
        <a
          routerLink="/search"
          class="border border-slate-300 px-5 py-2 rounded"
        >
          {{ 'booking.requestService' | t }}
        </a>
      </div>
    </section>
  `,
})
export class HomeComponent {
  protected readonly auth = inject(AuthStore);
}
