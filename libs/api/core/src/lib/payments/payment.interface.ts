export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface ChargeInput {
  /** External booking ID, used to correlate webhook callbacks. */
  bookingId: string;
  /** Payer phone in E.164 (used by MoMo push). */
  payerPhone: string;
  amount: number;
  currency: 'GHS';
  description: string;
  /** URL the provider should POST to when the charge settles. */
  callbackUrl: string;
}

export interface ChargeResult {
  /** Provider's reference for this transaction. */
  providerRef: string;
  /** Optional URL to redirect the user to (Hubtel Online Checkout). */
  checkoutUrl?: string;
  /** True if the dev stub already settled — no webhook will fire. */
  autoSettled: boolean;
}

export interface PayoutInput {
  recipientPhone: string;
  amount: number;
  currency: 'GHS';
  bookingId: string;
}

export interface PayoutResult {
  providerRef: string;
  succeeded: boolean;
}

export interface WebhookPayload {
  providerRef: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount?: number;
  currency?: string;
  raw: unknown;
}

export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>;
  payout(input: PayoutInput): Promise<PayoutResult>;
  /**
   * Verify a webhook payload (signature + canonical shape). Returns null when
   * the payload should be ignored.
   */
  parseWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): WebhookPayload | null;
}
