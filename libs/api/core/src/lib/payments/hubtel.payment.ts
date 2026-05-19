import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from '../config/env.schema';
import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  PayoutInput,
  PayoutResult,
  WebhookPayload,
} from './payment.interface';

/**
 * Hubtel Online Checkout (charge-in) + MoMo disbursement (payout) adapter.
 * Activated when PAYMENT_PROVIDER=hubtel and credentials are set.
 *
 * Webhook signature: Hubtel signs the raw body with HMAC-SHA256 using the
 * merchant secret and sends the digest in `x-hubtel-signature`.
 */
@Injectable()
export class HubtelPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger('HubtelPayment');

  constructor(private readonly config: ConfigService<Env, true>) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const clientId = this.required('HUBTEL_CLIENT_ID');
    const clientSecret = this.required('HUBTEL_CLIENT_SECRET');
    const merchant = this.required('HUBTEL_MERCHANT_ACCOUNT');

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        totalAmount: input.amount,
        description: input.description,
        callbackUrl: input.callbackUrl,
        returnUrl: input.callbackUrl,
        merchantAccountNumber: merchant,
        cancellationUrl: input.callbackUrl,
        clientReference: input.bookingId,
        payeeName: 'Customer',
        payeeMobileNumber: input.payerPhone,
      }),
    });

    if (!res.ok) {
      this.logger.error(
        `Hubtel charge failed ${res.status}: ${await res.text()}`,
      );
      throw new HttpException('Payment failed', 502);
    }

    const json = (await res.json()) as {
      data?: {
        checkoutUrl?: string;
        checkoutDirectUrl?: string;
        checkoutId?: string;
      };
      message?: string;
    };

    if (!json.data?.checkoutUrl) {
      throw new HttpException(
        `Hubtel did not return a checkout URL: ${json.message}`,
        502,
      );
    }

    return {
      providerRef: json.data.checkoutId ?? input.bookingId,
      checkoutUrl: json.data.checkoutUrl,
      autoSettled: false,
    };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    // Hubtel cash-out / B2C transfer — endpoint varies by merchant onboarding.
    // Placeholder: log + return success. Real implementation lands when
    // Hubtel merchant onboarding completes.
    this.logger.warn(
      `[hubtel-payout-stub] would disburse ${input.amount} ${input.currency} to ${input.recipientPhone}`,
    );
    return { providerRef: `pending-${input.bookingId}`, succeeded: true };
  }

  parseWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): WebhookPayload | null {
    const secret = this.config.get('HUBTEL_CLIENT_SECRET');
    if (!secret) return null;

    const signature =
      headers['x-hubtel-signature'] ?? headers['X-Hubtel-Signature'];
    if (signature && typeof body === 'object' && body !== null) {
      const expected = createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        this.logger.warn('Hubtel webhook signature mismatch — ignoring');
        return null;
      }
    }

    const data = body as {
      Data?: {
        TransactionId?: string;
        Status?: string;
        Amount?: number;
        ClientReference?: string;
      };
      Status?: string;
    };
    const ref = data?.Data?.TransactionId ?? data?.Data?.ClientReference;
    const status = (data?.Status ?? data?.Data?.Status ?? '').toLowerCase();
    if (!ref) return null;

    return {
      providerRef: ref,
      status: status.includes('success')
        ? 'succeeded'
        : status.includes('fail')
          ? 'failed'
          : 'pending',
      amount: data?.Data?.Amount,
      currency: 'GHS',
      raw: body,
    };
  }

  private required(
    key:
      | 'HUBTEL_CLIENT_ID'
      | 'HUBTEL_CLIENT_SECRET'
      | 'HUBTEL_MERCHANT_ACCOUNT',
  ): string {
    const v = this.config.get(key);
    if (!v) throw new HttpException(`${key} not configured`, 500);
    return v;
  }
}
