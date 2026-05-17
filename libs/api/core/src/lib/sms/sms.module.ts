import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { SMS_PROVIDER } from './sms.interface';
import { ConsoleSmsProvider } from './console.sms-provider';
import { HubtelSmsProvider } from './hubtel.sms-provider';

const provider: Provider = {
  provide: SMS_PROVIDER,
  inject: [ConfigService, ConsoleSmsProvider, HubtelSmsProvider],
  useFactory: (
    config: ConfigService<Env, true>,
    consoleImpl: ConsoleSmsProvider,
    hubtelImpl: HubtelSmsProvider,
  ) => (config.get('SMS_PROVIDER') === 'hubtel' ? hubtelImpl : consoleImpl),
};

@Global()
@Module({
  providers: [ConsoleSmsProvider, HubtelSmsProvider, provider],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
