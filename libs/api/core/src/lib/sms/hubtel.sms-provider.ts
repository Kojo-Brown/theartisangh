import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import type { SmsProvider, SmsMessage } from './sms.interface';

/**
 * Hubtel SMS adapter. Activated when SMS_PROVIDER=hubtel and Hubtel client id/secret
 * are present. Uses the Hubtel "send single message" endpoint
 * (https://devp-sms03726-api.hubtel.com/v1/messages/send).
 */
@Injectable()
export class HubtelSmsProvider implements SmsProvider {
  private readonly logger = new Logger('HubtelSMS');

  constructor(private readonly config: ConfigService<Env, true>) {}

  async send(msg: SmsMessage): Promise<{ id: string }> {
    const clientId = this.config.get('HUBTEL_CLIENT_ID');
    const clientSecret = this.config.get('HUBTEL_CLIENT_SECRET');
    const from = this.config.get('HUBTEL_SMS_SENDER_ID');

    if (!clientId || !clientSecret) {
      throw new HttpException('Hubtel credentials not configured', 500);
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(
      'https://devp-sms03726-api.hubtel.com/v1/messages/send',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ From: from, To: msg.to, Content: msg.body }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Hubtel send failed ${res.status}: ${text}`);
      throw new HttpException('SMS send failed', 502);
    }

    const data = (await res.json()) as { MessageId?: string };
    return { id: data.MessageId ?? 'unknown' };
  }
}
