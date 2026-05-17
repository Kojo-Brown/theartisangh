import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SMS_PROVIDER, type SmsProvider } from '@artisangh/api-core';
import { QUEUES, type SmsSendJob } from './queue-names';

@Processor(QUEUES.smsSend)
export class SmsConsumer extends WorkerHost {
  private readonly logger = new Logger(SmsConsumer.name);

  constructor(@Inject(SMS_PROVIDER) private readonly sms: SmsProvider) {
    super();
  }

  async process(job: Job<SmsSendJob>): Promise<{ id: string }> {
    this.logger.log(`[${job.id}] sending SMS to ${job.data.to}`);
    return this.sms.send(job.data);
  }
}
