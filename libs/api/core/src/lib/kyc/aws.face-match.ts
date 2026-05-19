import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompareFacesCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import type { Env } from '../config/env.schema';
import type { FaceMatchProvider, FaceMatchResult } from './kyc.interface';

@Injectable()
export class AwsFaceMatchProvider implements FaceMatchProvider {
  private readonly client: RekognitionClient;

  constructor(config: ConfigService<Env, true>) {
    this.client = new RekognitionClient({
      region: config.get('AWS_REGION'),
      credentials: config.get('AWS_ACCESS_KEY_ID')
        ? {
            accessKeyId: config.get('AWS_ACCESS_KEY_ID')!,
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY')!,
          }
        : undefined,
    });
  }

  async compare(
    source: Uint8Array,
    target: Uint8Array,
  ): Promise<FaceMatchResult> {
    const res = await this.client.send(
      new CompareFacesCommand({
        SourceImage: { Bytes: source },
        TargetImage: { Bytes: target },
        SimilarityThreshold: 0, // we make the decision, not Rekognition
      }),
    );
    const best = res.FaceMatches?.[0];
    if (!best?.Face) {
      const hasUnmatched = (res.UnmatchedFaces ?? []).length > 0;
      return { similarity: 0, confidence: 0, faceDetected: hasUnmatched };
    }
    return {
      similarity: best.Similarity ?? 0,
      confidence: best.Face.Confidence ?? 0,
      faceDetected: true,
    };
  }
}
