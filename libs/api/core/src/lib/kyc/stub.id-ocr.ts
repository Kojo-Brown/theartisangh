import { Injectable, Logger } from '@nestjs/common';
import type { IdOcrProvider, IdOcrResult } from './kyc.interface';

/**
 * Dev stub. Returns a deterministic fake Ghana Card payload — sufficient to
 * exercise the rest of the pipeline without AWS credentials.
 */
@Injectable()
export class StubIdOcrProvider implements IdOcrProvider {
  private readonly logger = new Logger('StubIdOcr');

  async extract(imageBytes: Uint8Array): Promise<IdOcrResult> {
    if (!imageBytes.length) {
      return {
        rawText: '',
        ghanaCardNumber: null,
        fullName: null,
        dateOfBirth: null,
        fields: {},
      };
    }
    this.logger.warn('[STUB] Ghana Card OCR returning canned values');
    return {
      rawText: 'GHANA CARD\nGHA-000000000-0\nKOFI MENSAH\n1990-01-01',
      ghanaCardNumber: 'GHA-000000000-0',
      fullName: 'KOFI MENSAH',
      dateOfBirth: '1990-01-01',
      fields: { country: 'GHA' },
    };
  }
}
