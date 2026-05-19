export const TRANSCRIBER = Symbol('TRANSCRIBER');

export type TranscriptLocale = 'EN' | 'TW' | 'GA' | 'EE';

export interface TranscribeInput {
  audio: Uint8Array;
  /** Filename hint — Whisper uses the extension. e.g. 'audio.webm'. */
  filename: string;
  /** Caller's locale hint (helps Whisper if the audio is Twi/Ga/Ewe). */
  hintLocale?: TranscriptLocale;
}

export interface TranscribeResult {
  text: string;
  detectedLocale: TranscriptLocale;
  durationSeconds?: number;
}

export interface Transcriber {
  transcribe(input: TranscribeInput): Promise<TranscribeResult>;
}
