import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  PrismaService,
  S3Service,
  TRANSCRIBER,
  type Transcriber,
  type TranscriptLocale,
} from '@artisangh/api-core';
import { QUEUES } from './queue-names';

interface ArtisanIntroJob {
  kind: 'artisanIntro';
  artisanProfileId: string;
  userId: string;
  key: string;
  hintLocale: TranscriptLocale | null;
}

type VoiceTranscribeJob = ArtisanIntroJob;

@Processor(QUEUES.voiceTranscribe)
export class VoiceConsumer extends WorkerHost {
  private readonly logger = new Logger(VoiceConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    @Inject(TRANSCRIBER) private readonly transcriber: Transcriber,
  ) {
    super();
  }

  async process(job: Job<VoiceTranscribeJob>): Promise<{ length: number }> {
    const data = job.data;
    this.logger.log(`[${job.id}] transcribing ${data.kind} key=${data.key}`);

    const bucket = this.s3.bucket('media');
    const audio = await this.s3.getObjectBytes(bucket, data.key);
    const filename = data.key.split('/').pop() ?? 'audio.webm';

    const result = await this.transcriber.transcribe({
      audio,
      filename,
      hintLocale: data.hintLocale ?? undefined,
    });

    if (data.kind === 'artisanIntro') {
      await this.prisma.artisanProfile.update({
        where: { id: data.artisanProfileId },
        data: {
          voiceIntroTranscript: result.text,
          voiceIntroLocale: result.detectedLocale,
          voiceIntroDurationSec: result.durationSeconds ?? null,
        },
      });
    }

    this.logger.log(
      `[${job.id}] transcribed ${result.text.length} chars (${result.detectedLocale})`,
    );
    return { length: result.text.length };
  }
}
