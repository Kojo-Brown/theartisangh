import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import type { FaceMatchProvider, FaceMatchResult } from './kyc.interface';

/**
 * Dev stub. Returns the configured similarity (default 95) without actually
 * comparing — but only after asserting both inputs have non-zero length.
 */
@Injectable()
export class StubFaceMatchProvider implements FaceMatchProvider {
  private readonly logger = new Logger('StubFaceMatch');

  constructor(private readonly config: ConfigService<Env, true>) {}

  async compare(
    source: Uint8Array,
    target: Uint8Array,
  ): Promise<FaceMatchResult> {
    if (!source.length || !target.length) {
      return { similarity: 0, confidence: 0, faceDetected: false };
    }
    const similarity = this.config.get('KYC_STUB_FACE_MATCH_SCORE');
    this.logger.warn(`[STUB] face-match auto-returns similarity=${similarity}`);
    return { similarity, confidence: 99.9, faceDetected: true };
  }
}
