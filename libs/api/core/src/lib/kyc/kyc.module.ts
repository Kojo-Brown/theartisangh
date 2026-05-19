import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { FACE_MATCH_PROVIDER, ID_OCR_PROVIDER } from './kyc.interface';
import { StubFaceMatchProvider } from './stub.face-match';
import { StubIdOcrProvider } from './stub.id-ocr';
import { AwsFaceMatchProvider } from './aws.face-match';
import { AwsIdOcrProvider } from './aws.id-ocr';

const faceMatch: Provider = {
  provide: FACE_MATCH_PROVIDER,
  inject: [ConfigService, StubFaceMatchProvider, AwsFaceMatchProvider],
  useFactory: (
    config: ConfigService<Env, true>,
    stub: StubFaceMatchProvider,
    aws: AwsFaceMatchProvider,
  ) => (config.get('KYC_PROVIDER') === 'aws' ? aws : stub),
};

const idOcr: Provider = {
  provide: ID_OCR_PROVIDER,
  inject: [ConfigService, StubIdOcrProvider, AwsIdOcrProvider],
  useFactory: (
    config: ConfigService<Env, true>,
    stub: StubIdOcrProvider,
    aws: AwsIdOcrProvider,
  ) => (config.get('KYC_PROVIDER') === 'aws' ? aws : stub),
};

@Global()
@Module({
  providers: [
    StubFaceMatchProvider,
    StubIdOcrProvider,
    AwsFaceMatchProvider,
    AwsIdOcrProvider,
    faceMatch,
    idOcr,
  ],
  exports: [FACE_MATCH_PROVIDER, ID_OCR_PROVIDER],
})
export class KycModule {}
