import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SmsProvider, SmsMessage } from './sms.interface';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger('ConsoleSMS');

  async send(msg: SmsMessage): Promise<{ id: string }> {
    const id = randomUUID();
    this.logger.warn(`[SMS-STUB → ${msg.to}] ${msg.body}  (id=${id})`);
    return { id };
  }
}
