import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import type {
  Transcriber,
  TranscribeInput,
  TranscribeResult,
  TranscriptLocale,
} from './transcriber.interface';

const ISO_TO_LOCALE: Record<string, TranscriptLocale> = {
  en: 'EN',
  tw: 'TW',
  ak: 'TW', // Akan covers Twi
  ga: 'GA',
  ee: 'EE',
};

/**
 * OpenAI Whisper transcription. Sends multipart/form-data to
 * /v1/audio/transcriptions with verbose_json so we get detected language.
 */
@Injectable()
export class OpenAiTranscriber implements Transcriber {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    const apiKey = this.config.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new HttpException('OPENAI_API_KEY not configured', 500);
    }

    const form = new FormData();
    form.append('file', new Blob([input.audio]), input.filename);
    form.append('model', this.config.get('WHISPER_MODEL'));
    form.append('response_format', 'verbose_json');
    if (input.hintLocale) {
      const iso = localeToIso(input.hintLocale);
      if (iso) form.append('language', iso);
    }

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      throw new HttpException(`Whisper failed (${res.status})`, 502);
    }

    const json = (await res.json()) as {
      text: string;
      language?: string;
      duration?: number;
    };
    return {
      text: json.text,
      detectedLocale: json.language
        ? (ISO_TO_LOCALE[json.language.toLowerCase()] ?? 'EN')
        : 'EN',
      durationSeconds: json.duration,
    };
  }
}

function localeToIso(loc: TranscriptLocale): string | null {
  switch (loc) {
    case 'EN':
      return 'en';
    case 'TW':
      return 'tw'; // accepted by Whisper-large-v3
    case 'GA':
      return 'ga';
    case 'EE':
      return 'ee';
    default:
      return null;
  }
}
