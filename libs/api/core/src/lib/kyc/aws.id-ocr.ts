import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyzeIDCommand, TextractClient } from '@aws-sdk/client-textract';
import type { Env } from '../config/env.schema';
import type { IdOcrProvider, IdOcrResult } from './kyc.interface';

/**
 * AWS Textract `AnalyzeID` is purpose-built for government ID documents.
 * Falls back gracefully when fields aren't recognized.
 */
@Injectable()
export class AwsIdOcrProvider implements IdOcrProvider {
  private readonly client: TextractClient;

  constructor(config: ConfigService<Env, true>) {
    this.client = new TextractClient({
      region: config.get('AWS_REGION'),
      credentials: config.get('AWS_ACCESS_KEY_ID')
        ? {
            accessKeyId: config.get('AWS_ACCESS_KEY_ID')!,
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY')!,
          }
        : undefined,
    });
  }

  async extract(imageBytes: Uint8Array): Promise<IdOcrResult> {
    const res = await this.client.send(
      new AnalyzeIDCommand({ DocumentPages: [{ Bytes: imageBytes }] }),
    );

    const fields: Record<string, string> = {};
    let rawText = '';
    for (const doc of res.IdentityDocuments ?? []) {
      for (const f of doc.IdentityDocumentFields ?? []) {
        const k = f.Type?.Text;
        const v = f.ValueDetection?.Text;
        if (k && v) {
          fields[k] = v;
          rawText += `${k}: ${v}\n`;
        }
      }
    }

    return {
      rawText,
      ghanaCardNumber: fields['DOCUMENT_NUMBER'] ?? fields['ID_NUMBER'] ?? null,
      fullName:
        [fields['FIRST_NAME'], fields['LAST_NAME']].filter(Boolean).join(' ') ||
        fields['FULL_NAME'] ||
        null,
      dateOfBirth: fields['DATE_OF_BIRTH'] ?? null,
      fields,
    };
  }
}
