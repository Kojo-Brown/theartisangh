import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Env } from '../config/env.schema';
import type { Encryptor } from './encryptor.interface';

/**
 * Local AES-256-GCM encryptor used in development. The wire format is:
 *   [12-byte IV][16-byte auth tag][ciphertext]
 * In production, the AWS KMS-backed adapter is selected by `KYC_PROVIDER=aws`.
 */
@Injectable()
export class AesGcmEncryptor implements Encryptor {
  private readonly logger = new Logger(AesGcmEncryptor.name);
  private readonly key: Buffer;

  constructor(config: ConfigService<Env, true>) {
    const raw = Buffer.from(config.get('LOCAL_ENCRYPTION_KEY'), 'base64');
    if (raw.length !== 32) {
      this.logger.warn(
        `LOCAL_ENCRYPTION_KEY is ${raw.length} bytes, expected 32 — padding/truncating.`,
      );
    }
    this.key = Buffer.alloc(32);
    raw.copy(this.key, 0, 0, Math.min(raw.length, 32));
  }

  async encrypt(plaintext: string): Promise<Uint8Array> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const body = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return new Uint8Array(Buffer.concat([iv, tag, body]));
  }

  async decrypt(ciphertext: Uint8Array): Promise<string> {
    const buf = Buffer.from(ciphertext);
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const body = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString(
      'utf8',
    );
  }
}
