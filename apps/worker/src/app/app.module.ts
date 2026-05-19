import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ApiCoreModule, type Env } from '@artisangh/api-core';
import { QUEUES } from './queues/queue-names';
import { SmsConsumer } from './queues/sms.consumer';
import { KycConsumer } from './queues/kyc.consumer';

@Module({
  imports: [
    ApiCoreModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = new URL(config.get('REDIS_URL'));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUES.smsSend }),
    BullModule.registerQueue({ name: QUEUES.kycVerify }),
  ],
  providers: [SmsConsumer, KycConsumer],
})
export class AppModule {}
