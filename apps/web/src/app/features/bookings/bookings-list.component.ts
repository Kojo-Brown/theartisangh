import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import { AuthStore } from '../../core/auth.store';
import type { BookingSummary } from '@artisangh/web-api-client';

const STATUS_LABEL: Record<BookingSummary['status'], string> = {
  REQUESTED: 'Awaiting acceptance',
  ACCEPTED: 'Accepted',
  EN_ROUTE: 'On the way',
  ON_SITE: 'On site',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Awaiting your confirmation',
  RELEASED: 'Complete · paid out',
  CANCELLED: 'Cancelled',
  DISPUTED: 'In dispute',
  REFUNDED: 'Refunded',
};

const STATUS_CLASS: Record<BookingSummary['status'], string> = {
  REQUESTED: 'bg-amber-50 text-amber-800 border-amber-200',
  ACCEPTED: 'bg-blue-50 text-blue-800 border-blue-200',
  EN_ROUTE: 'bg-blue-50 text-blue-800 border-blue-200',
  ON_SITE: 'bg-blue-50 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  RELEASED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-slate-50 text-slate-700 border-slate-200',
  DISPUTED: 'bg-rose-50 text-rose-800 border-rose-200',
  REFUNDED: 'bg-slate-50 text-slate-700 border-slate-200',
};

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, RouterLink],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Bookings</h1>

    @if (loading()) {
      <p class="text-sm text-slate-500">Loading…</p>
    }
    @if (!loading() && rows().length === 0) {
      <p class="text-sm text-slate-500">No bookings yet.</p>
    }

    <ul class="space-y-3">
      @for (b of rows(); track b.id) {
        <li class="bg-white border border-slate-200 rounded-lg p-4">
          <div class="flex items-start justify-between">
            <div>
              <a
                [routerLink]="['/bookings', b.id]"
                class="font-medium hover:underline"
              >
                {{ b.trade | titlecase }} — {{ counterparty(b) }}
              </a>
              <div class="text-xs text-slate-500">
                {{ b.createdAt | date: 'short' }} · {{ b.totalAmount }}
                {{ b.currency }}
              </div>
            </div>
            <span
              [class]="
                'text-xs rounded border px-2 py-0.5 ' + statusClass(b.status)
              "
            >
              {{ label(b.status) }}
            </span>
          </div>
        </li>
      }
    </ul>
  `,
})
export class BookingsListComponent implements OnInit {
  private readonly api = inject(API_CLIENT);
  private readonly auth = inject(AuthStore);

  protected readonly rows = signal<BookingSummary[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.api
      .listBookings()
      .then((r) => this.rows.set(r))
      .finally(() => this.loading.set(false));
  }

  counterparty(b: BookingSummary): string {
    const me = this.auth.user()?.id;
    return b.customerId === me ? b.artisan.fullName : b.customer.fullName;
  }

  label(s: BookingSummary['status']): string {
    return STATUS_LABEL[s];
  }
  statusClass(s: BookingSummary['status']): string {
    return STATUS_CLASS[s];
  }
}
