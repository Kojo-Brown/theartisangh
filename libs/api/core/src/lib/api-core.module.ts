import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';
import { StorageModule } from './storage/storage.module';
import { KycModule } from './kyc/kyc.module';
import { CryptoModule } from './crypto/crypto.module';
import { VoiceModule } from './voice/voice.module';
import { PaymentsCoreModule } from './payments/payments.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    SmsModule,
    StorageModule,
    CryptoModule,
    KycModule,
    VoiceModule,
    PaymentsCoreModule,
  ],
  exports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    SmsModule,
    StorageModule,
    CryptoModule,
    KycModule,
    VoiceModule,
    PaymentsCoreModule,
  ],
})
export class ApiCoreModule {}
