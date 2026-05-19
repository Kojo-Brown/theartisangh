import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { PAYMENT_PROVIDER } from './payment.interface';
import { StubPaymentProvider } from './stub.payment';
import { HubtelPaymentProvider } from './hubtel.payment';

const provider: Provider = {
  provide: PAYMENT_PROVIDER,
  inject: [ConfigService, StubPaymentProvider, HubtelPaymentProvider],
  useFactory: (
    config: ConfigService<Env, true>,
    stub: StubPaymentProvider,
    hubtel: HubtelPaymentProvider,
  ) => (config.get('PAYMENT_PROVIDER') === 'hubtel' ? hubtel : stub),
};

@Global()
@Module({
  providers: [StubPaymentProvider, HubtelPaymentProvider, provider],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsCoreModule {}
