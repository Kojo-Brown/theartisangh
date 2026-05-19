import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { ENCRYPTOR } from './encryptor.interface';
import { AesGcmEncryptor } from './aes-gcm.encryptor';
import { KmsEncryptor } from './kms.encryptor';

const provider: Provider = {
  provide: ENCRYPTOR,
  inject: [
    ConfigService,
    AesGcmEncryptor,
    { token: KmsEncryptor, optional: true },
  ],
  useFactory: (
    config: ConfigService<Env, true>,
    local: AesGcmEncryptor,
    kms: KmsEncryptor | null,
  ) => {
    if (
      config.get('KYC_PROVIDER') === 'aws' &&
      config.get('KYC_KMS_KEY_ID') &&
      kms
    )
      return kms;
    return local;
  },
};

/**
 * The KMS provider is only instantiated when the env is configured for it, so
 * dev environments aren't required to have AWS credentials.
 */
const kmsLazy: Provider = {
  provide: KmsEncryptor,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => {
    if (config.get('KYC_PROVIDER') !== 'aws' || !config.get('KYC_KMS_KEY_ID'))
      return null;
    return new KmsEncryptor(config);
  },
};

@Global()
@Module({
  providers: [AesGcmEncryptor, kmsLazy, provider],
  exports: [ENCRYPTOR],
})
export class CryptoModule {}
