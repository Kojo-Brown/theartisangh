import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { API_CLIENT } from '../../core/api.token';
import type { AdminVerificationDetail } from '@artisangh/web-api-client';

@Component({
  selector: 'admin-queue-detail',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (loading()) {
      <p class="text-sm text-slate-500">Loading…</p>
    }

    @if (item(); as v) {
      <div class="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        <section class="space-y-3">
          <div>
            <h2 class="text-sm font-medium text-slate-500">Card front</h2>
            <img
              [src]="v.signedUrls.front"
              class="border rounded max-h-72 object-contain bg-slate-100"
              alt="Card front"
            />
          </div>
          <div>
            <h2 class="text-sm font-medium text-slate-500">Card back</h2>
            <img
              [src]="v.signedUrls.back"
              class="border rounded max-h-72 object-contain bg-slate-100"
              alt="Card back"
            />
          </div>
          <div>
            <h2 class="text-sm font-medium text-slate-500">Selfie</h2>
            <img
              [src]="v.signedUrls.selfie"
              class="border rounded max-h-72 object-contain bg-slate-100"
              alt="Selfie"
            />
          </div>
        </section>

        <aside class="bg-white border border-slate-200 rounded p-5 h-fit">
          <h2 class="font-medium mb-3">{{ v.user.fullName }}</h2>
          <div class="text-sm space-y-1 mb-4">
            <div>{{ v.user.phone }}</div>
            <div>Card ending: {{ v.ghanaCardLast4 }}</div>
            <div>
              Status: <span class="font-medium">{{ v.status }}</span>
            </div>
          </div>

          <p class="block text-sm font-medium mb-1">Reason (for reject)</p>
          <textarea
            rows="3"
            [(ngModel)]="reason"
            class="w-full border border-slate-300 rounded px-2 py-1 text-sm mb-3"
          ></textarea>

          <div class="flex gap-2">
            <button
              (click)="review('APPROVED')"
              [disabled]="busy()"
              class="flex-1 bg-emerald-600 text-white rounded py-2 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              (click)="review('REJECTED')"
              [disabled]="busy() || !reason"
              class="flex-1 bg-rose-600 text-white rounded py-2 disabled:opacity-50"
            >
              Reject
            </button>
          </div>

          @if (error()) {
            <p class="text-sm text-rose-600 mt-3">{{ error() }}</p>
          }
        </aside>
      </div>
    }
  `,
})
export class QueueDetailComponent implements OnInit {
  private readonly api = inject(API_CLIENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly item = signal<AdminVerificationDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected reason = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.api
      .adminVerificationDetail(id)
      .then((v) => this.item.set(v))
      .catch((err) => this.error.set((err as Error).message))
      .finally(() => this.loading.set(false));
  }

  async review(decision: 'APPROVED' | 'REJECTED'): Promise<void> {
    const v = this.item();
    if (!v) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.adminReviewVerification(v.id, {
        decision,
        reason: decision === 'REJECTED' ? this.reason : undefined,
      });
      this.router.navigateByUrl('/queue');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
