import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import { AuthStore } from '../../core/auth.store';
import type { BookingDetail } from '@artisangh/web-api-client';

type Action =
  | 'accept'
  | 'decline'
  | 'en-route'
  | 'arrive'
  | 'start-work'
  | 'complete'
  | 'confirm'
  | 'cancel';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, FormsModule],
  template: `
    @if (loading()) {
      <p class="text-sm text-slate-500">Loading…</p>
    }
    @if (error()) {
      <p class="text-sm text-rose-600">{{ error() }}</p>
    }

    @if (booking(); as b) {
      <div class="bg-white border border-slate-200 rounded-lg p-6 max-w-xl">
        <h1 class="text-xl font-semibold">{{ b.trade | titlecase }}</h1>
        <p class="text-sm text-slate-500 mb-3">
          {{ isArtisan() ? 'Customer' : 'Artisan' }}: {{ counterparty(b) }} ·
          {{ b.createdAt | date: 'short' }}
        </p>

        <div class="text-sm space-y-1 mb-4">
          <div>Amount: {{ b.totalAmount }} {{ b.currency }}</div>
          @if (b.scheduledAt) {
            <div>Scheduled: {{ b.scheduledAt | date: 'short' }}</div>
          }
          @if (b.jobAddress) {
            <div>Address: {{ b.jobAddress }}</div>
          }
          <div>
            Status: <span class="font-medium">{{ b.status }}</span>
          </div>
        </div>

        @if (b.description) {
          <p class="text-slate-700 whitespace-pre-line mb-3">
            {{ b.description }}
          </p>
        }

        @if (b.voiceNoteUrl) {
          <div class="bg-slate-50 border border-slate-200 rounded p-3 mb-3">
            <p class="text-xs font-medium mb-1">🎙 Voice note</p>
            <audio controls [src]="b.voiceNoteUrl" class="w-full"></audio>
            @if (b.transcript) {
              <p class="mt-2 text-sm italic">"{{ b.transcript }}"</p>
            }
          </div>
        }

        <div class="flex flex-wrap gap-2 mt-4">
          @for (a of actionsFor(b); track a.action) {
            <button
              (click)="run(a.action)"
              [disabled]="busy()"
              [class]="'rounded px-3 py-1.5 text-sm text-white ' + a.tone"
            >
              {{ a.label }}
            </button>
          }
        </div>

        @if (canDispute(b)) {
          <div class="mt-4 border-t pt-4">
            <p class="block text-sm font-medium mb-1">Open a dispute</p>
            <textarea
              rows="2"
              [(ngModel)]="disputeReason"
              placeholder="What went wrong?"
              class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-2"
            ></textarea>
            <button
              (click)="dispute()"
              [disabled]="busy() || disputeReason.length < 5"
              class="bg-rose-600 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Submit dispute
            </button>
          </div>
        }

        <div class="mt-6 border-t pt-4">
          <p class="block text-sm font-medium mb-2">Payments</p>
          <ul class="text-sm space-y-1">
            @for (p of b.payments; track p.id) {
              <li class="flex justify-between text-slate-600">
                <span>{{ p.state }} · {{ p.channel }}</span>
                <span>{{ p.amount }} GHS</span>
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class BookingDetailComponent implements OnInit {
  private readonly api = inject(API_CLIENT);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected disputeReason = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.api
      .bookingById(id)
      .then((b) => this.booking.set(b))
      .catch((err) => this.error.set((err as Error).message))
      .finally(() => this.loading.set(false));
  }

  isArtisan(): boolean {
    return this.booking()?.artisanId === this.auth.user()?.id;
  }

  counterparty(b: BookingDetail): string {
    return this.isArtisan() ? b.customer.fullName : b.artisan.fullName;
  }

  canDispute(b: BookingDetail): boolean {
    return b.status === 'IN_PROGRESS' || b.status === 'COMPLETED';
  }

  actionsFor(
    b: BookingDetail,
  ): Array<{ action: Action; label: string; tone: string }> {
    const artisan = this.isArtisan();
    const customer = !artisan;
    const list: Array<{ action: Action; label: string; tone: string }> = [];

    const accept = (a: Action, label: string, tone = 'bg-emerald-600') =>
      list.push({ action: a, label, tone });
    const deny = (a: Action, label: string, tone = 'bg-slate-600') =>
      list.push({ action: a, label, tone });

    switch (b.status) {
      case 'REQUESTED':
        if (artisan) {
          accept('accept', 'Accept');
          deny('decline', 'Decline', 'bg-rose-600');
        }
        if (customer) deny('cancel', 'Cancel', 'bg-rose-600');
        break;
      case 'ACCEPTED':
        if (artisan) accept('en-route', 'On the way');
        if (customer) deny('cancel', 'Cancel', 'bg-rose-600');
        break;
      case 'EN_ROUTE':
        if (artisan) accept('arrive', 'I have arrived');
        if (customer) deny('cancel', 'Cancel', 'bg-rose-600');
        break;
      case 'ON_SITE':
        if (artisan) accept('start-work', 'Start work');
        if (customer) deny('cancel', 'Cancel', 'bg-rose-600');
        break;
      case 'IN_PROGRESS':
        if (artisan) accept('complete', 'Mark complete');
        break;
      case 'COMPLETED':
        if (customer) accept('confirm', 'Confirm + release payment');
        break;
      default:
        break;
    }
    return list;
  }

  async run(action: Action): Promise<void> {
    const b = this.booking();
    if (!b) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.bookingAction(b.id, action);
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async dispute(): Promise<void> {
    const b = this.booking();
    if (!b) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.disputeBooking(b.id, this.disputeReason);
      this.disputeReason = '';
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
