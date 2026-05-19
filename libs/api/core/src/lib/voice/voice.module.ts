import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { TRANSCRIBER } from './transcriber.interface';
import { StubTranscriber } from './stub.transcriber';
import { OpenAiTranscriber } from './openai.transcriber';

const transcriber: Provider = {
  provide: TRANSCRIBER,
  inject: [ConfigService, StubTranscriber, OpenAiTranscriber],
  useFactory: (
    config: ConfigService<Env, true>,
    stub: StubTranscriber,
    openai: OpenAiTranscriber,
  ) => (config.get('WHISPER_PROVIDER') === 'openai' ? openai : stub),
};

@Global()
@Module({
  providers: [StubTranscriber, OpenAiTranscriber, transcriber],
  exports: [TRANSCRIBER],
})
export class VoiceModule {}
