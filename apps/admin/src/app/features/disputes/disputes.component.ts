import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { API_CLIENT } from '../../core/api.token';
import type { BookingDetail } from '@artisangh/web-api-client';

@Component({
  selector: 'admin-disputes',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Disputes</h1>

    @if (loading()) {
      <p class="text-sm text-slate-500">Loading…</p>
    }
    @if (!loading() && rows().length === 0) {
      <p class="text-sm text-slate-500">No active disputes. Quiet day.</p>
    }

    <ul class="space-y-4">
      @for (b of rows(); track b.id) {
        <li class="bg-white border border-slate-200 rounded p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="font-medium">
                {{ b.trade }} · {{ b.totalAmount }} {{ b.currency }}
              </div>
              <div class="text-xs text-slate-500">
                Customer: {{ b.customer.fullName }} ({{ b.customer.phone }})
              </div>
              <div class="text-xs text-slate-500">
                Artisan: {{ b.artisan.fullName }} ({{ b.artisan.phone }})
              </div>
              <div class="text-xs text-slate-400 mt-1">
                Opened {{ b.createdAt | date: 'short' }}
              </div>
              @if (b.description) {
                <p class="mt-2 text-sm text-slate-700">{{ b.description }}</p>
              }
              <details class="mt-2 text-xs text-slate-500">
                <summary class="cursor-pointer">
                  Payments + ledger ({{ b.payments.length }})
                </summary>
                <ul class="mt-1 ml-4 list-disc">
                  @for (p of b.payments; track p.id) {
                    <li>
                      {{ p.state }} · {{ p.amount }} GHS · {{ p.channel }}
                    </li>
                  }
                </ul>
              </details>
            </div>
            <div class="w-56 space-y-2">
              <textarea
                rows="2"
                [(ngModel)]="notes[b.id]"
                placeholder="Resolution note"
                class="w-full border border-slate-300 rounded px-2 py-1 text-sm"
              ></textarea>
              <button
                (click)="resolve(b.id, 'RELEASE')"
                [disabled]="busy()"
                class="w-full bg-emerald-600 text-white rounded py-1.5 text-sm disabled:opacity-50"
              >
                Release to artisan
              </button>
              <button
                (click)="resolve(b.id, 'REFUND')"
                [disabled]="busy()"
                class="w-full bg-rose-600 text-white rounded py-1.5 text-sm disabled:opacity-50"
              >
                Refund customer
              </button>
            </div>
          </div>
        </li>
      }
    </ul>

    @if (error()) {
      <p class="text-sm text-rose-600 mt-3">{{ error() }}</p>
    }
  `,
})
export class DisputesComponent implements OnInit {
  private readonly api = inject(API_CLIENT);

  protected readonly rows = signal<BookingDetail[]>([]);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected notes: Record<string, string> = {};

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.api
      .adminDisputesQueue()
      .then((rows) => this.rows.set(rows))
      .finally(() => this.loading.set(false));
  }

  async resolve(id: string, resolution: 'RELEASE' | 'REFUND'): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.adminResolveBooking(id, resolution, this.notes[id]);
      delete this.notes[id];
      this.refresh();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
