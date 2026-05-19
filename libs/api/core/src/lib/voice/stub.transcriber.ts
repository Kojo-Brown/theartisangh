import { Injectable, Logger } from '@nestjs/common';
import type {
  Transcriber,
  TranscribeInput,
  TranscribeResult,
} from './transcriber.interface';

/**
 * Dev stub. Returns a canned transcript that includes the audio size so you can
 * tell different uploads apart in the UI without hitting OpenAI.
 */
@Injectable()
export class StubTranscriber implements Transcriber {
  private readonly logger = new Logger('StubTranscriber');

  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    const kb = (input.audio.byteLength / 1024).toFixed(1);
    this.logger.warn(`[STUB] returning canned transcript (${kb} KB audio)`);
    return {
      text: `[Dev transcript stub] ${kb} KB of audio received. Set WHISPER_PROVIDER=openai with OPENAI_API_KEY to use real Whisper.`,
      detectedLocale: input.hintLocale ?? 'EN',
    };
  }
}
