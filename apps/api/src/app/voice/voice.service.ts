import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService, S3Service } from '@artisangh/api-core';
import type { StartVoiceUploadDto, SubmitVoiceIntroDto } from './voice.dto';

const QUEUE = 'voice.transcribe';

@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    @InjectQueue(QUEUE) private readonly queue: Queue,
  ) {}

  /** Presigned PUT URL for the browser to upload the audio directly. */
  async startUpload(userId: string, dto: StartVoiceUploadDto) {
    const bucket = this.s3.bucket('media');
    return this.s3.signUpload(
      bucket,
      `voice-intros/${userId}`,
      dto.contentType,
    );
  }

  /**
   * Records the audio key on the caller's artisan profile and enqueues a
   * transcription job. Returns the current profile (without the transcript yet —
   * the worker will populate it).
   */
  async submitIntro(userId: string, dto: SubmitVoiceIntroDto) {
    const profile = await this.prisma.artisanProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new BadRequestException(
        'Set up your artisan profile before recording a voice intro',
      );
    }

    const updated = await this.prisma.artisanProfile.update({
      where: { userId },
      data: {
        voiceIntroKey: dto.key,
        voiceIntroDurationSec: dto.durationSeconds ?? null,
        voiceIntroTranscript: null, // reset until the worker fills it
        voiceIntroLocale: null,
      },
    });

    await this.queue.add(
      'voice.intro',
      {
        kind: 'artisanIntro' as const,
        artisanProfileId: updated.id,
        userId,
        key: dto.key,
        hintLocale: dto.hintLocale ?? null,
      },
      {
        jobId: `voice.intro:${updated.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    return { status: 'transcribing' as const, profileId: updated.id };
  }

  async signPlayback(userId: string) {
    const profile = await this.prisma.artisanProfile.findUnique({
      where: { userId },
      select: { voiceIntroKey: true },
    });
    if (!profile?.voiceIntroKey) return null;
    const bucket = this.s3.bucket('media');
    return this.s3.signDownload(bucket, profile.voiceIntroKey);
  }
}
