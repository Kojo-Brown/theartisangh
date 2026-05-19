import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import type { Env } from '../config/env.schema';
import type { Encryptor } from './encryptor.interface';

/**
 * AWS KMS envelope-style encryptor (uses raw `Encrypt`/`Decrypt`). Activated when
 * KYC_PROVIDER=aws + AWS creds + KYC_KMS_KEY_ID are set.
 */
@Injectable()
export class KmsEncryptor implements Encryptor {
  private readonly client: KMSClient;
  private readonly keyId: string;

  constructor(config: ConfigService<Env, true>) {
    const keyId = config.get('KYC_KMS_KEY_ID');
    if (!keyId)
      throw new Error('KYC_KMS_KEY_ID required when KYC_PROVIDER=aws');
    this.keyId = keyId;
    this.client = new KMSClient({
      region: config.get('AWS_REGION'),
      credentials: config.get('AWS_ACCESS_KEY_ID')
        ? {
            accessKeyId: config.get('AWS_ACCESS_KEY_ID')!,
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY')!,
          }
        : undefined,
    });
  }

  async encrypt(plaintext: string): Promise<Uint8Array> {
    const res = await this.client.send(
      new EncryptCommand({
        KeyId: this.keyId,
        Plaintext: Buffer.from(plaintext, 'utf8'),
      }),
    );
    if (!res.CiphertextBlob) throw new Error('KMS Encrypt returned empty blob');
    return new Uint8Array(res.CiphertextBlob);
  }

  async decrypt(ciphertext: Uint8Array): Promise<string> {
    const res = await this.client.send(
      new DecryptCommand({ CiphertextBlob: ciphertext }),
    );
    if (!res.Plaintext) throw new Error('KMS Decrypt returned empty plaintext');
    return Buffer.from(res.Plaintext).toString('utf8');
  }
}
