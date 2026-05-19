import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import type { Env } from '../config/env.schema';

export interface SignedUploadUrl {
  key: string;
  url: string;
  expiresInSeconds: number;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly forcePathStyle: boolean;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.forcePathStyle = config.get('S3_FORCE_PATH_STYLE');
    this.client = new S3Client({
      region: config.get('S3_REGION'),
      endpoint: config.get('S3_ENDPOINT'),
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY'),
        secretAccessKey: config.get('S3_SECRET_KEY'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    // Best-effort bucket creation against MinIO; idempotent in prod against existing R2 buckets.
    await Promise.all([
      this.ensureBucket(this.config.get('S3_BUCKET_MEDIA')),
      this.ensureBucket(this.config.get('S3_BUCKET_KYC')),
    ]);
  }

  bucket(kind: 'media' | 'kyc'): string {
    return kind === 'media'
      ? this.config.get('S3_BUCKET_MEDIA')
      : this.config.get('S3_BUCKET_KYC');
  }

  /** Generate a presigned PUT URL the browser uploads to directly. */
  async signUpload(
    bucket: string,
    keyPrefix: string,
    contentType: string,
    expiresInSeconds = 600,
  ): Promise<SignedUploadUrl> {
    const key = `${keyPrefix}/${randomUUID()}`;
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, cmd, {
      expiresIn: expiresInSeconds,
    });
    return { key, url, expiresInSeconds };
  }

  /** Presigned GET URL for displaying private images in the admin app. */
  async signDownload(
    bucket: string,
    key: string,
    expiresInSeconds = 600,
  ): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
  }

  /** Pull the bytes of an object — used by the KYC worker pipeline. */
  async getObjectBytes(bucket: string, key: string): Promise<Uint8Array> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!res.Body) throw new Error(`S3 object empty: ${bucket}/${key}`);
    return new Uint8Array(await res.Body.transformToByteArray());
  }

  private async ensureBucket(name: string): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: name }));
      return;
    } catch {
      // not found, create it
    }
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: name }));
      this.logger.log(`Created bucket ${name}`);
      await this.client.send(
        new PutBucketCorsCommand({
          Bucket: name,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedMethods: ['GET', 'PUT'],
                AllowedOrigins: ['*'],
                AllowedHeaders: ['*'],
                MaxAgeSeconds: 3000,
              },
            ],
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Bucket setup failed for ${name}: ${(err as Error).message}`,
      );
    }
  }
}
