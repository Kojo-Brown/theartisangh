import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  PayoutInput,
  PayoutResult,
  WebhookPayload,
} from './payment.interface';

/**
 * Dev stub: every charge auto-settles immediately and every payout succeeds.
 * No webhook is dispatched; the API treats `autoSettled: true` as the
 * equivalent of an inline webhook delivery. Useful for end-to-end booking
 * flows without Hubtel sandbox credentials.
 */
@Injectable()
export class StubPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger('StubPayment');

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const providerRef = `stub-charge-${randomUUID()}`;
    this.logger.warn(
      `[STUB] charge ${input.amount} ${input.currency} for booking ${input.bookingId} → ${providerRef}`,
    );
    return { providerRef, autoSettled: true };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    const providerRef = `stub-payout-${randomUUID()}`;
    this.logger.warn(
      `[STUB] payout ${input.amount} ${input.currency} → ${input.recipientPhone} (booking ${input.bookingId}, ref ${providerRef})`,
    );
    return { providerRef, succeeded: true };
  }

  parseWebhook(): WebhookPayload | null {
    // The stub never dispatches webhooks; if one arrives, ignore it.
    return null;
  }
}
