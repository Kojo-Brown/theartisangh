import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import type { AdminVerificationRow } from '@artisangh/web-api-client';

@Component({
  selector: 'admin-queue',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Verification queue</h1>

    @if (loading()) {
      <p class="text-sm text-slate-500">Loading…</p>
    }
    @if (rows().length === 0 && !loading()) {
      <p class="text-sm text-slate-500">Inbox zero. Nothing pending.</p>
    }

    <ul class="space-y-2">
      @for (row of rows(); track row.id) {
        <li
          class="bg-white border border-slate-200 rounded p-4 flex items-center justify-between"
        >
          <div>
            <a
              [routerLink]="['/queue', row.id]"
              class="font-medium hover:underline"
            >
              {{ row.user.fullName }}
            </a>
            <div class="text-xs text-slate-500">
              {{ row.user.phone }} · submitted
              {{ row.createdAt | date: 'short' }}
            </div>
          </div>
          <a
            [routerLink]="['/queue', row.id]"
            class="text-sm text-emerald-700 hover:underline"
            >Review →</a
          >
        </li>
      }
    </ul>
  `,
})
export class QueueComponent implements OnInit {
  private readonly api = inject(API_CLIENT);
  protected readonly rows = signal<AdminVerificationRow[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.api
      .adminVerificationQueue()
      .then((rows) => this.rows.set(rows))
      .finally(() => this.loading.set(false));
  }
}
