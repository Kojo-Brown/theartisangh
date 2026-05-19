import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService, S3Service } from '@artisangh/api-core';
import type {
  StartVerificationDto,
  SubmitVerificationDto,
  ReviewVerificationDto,
} from './verification.dto';

const KYC_QUEUE = 'kyc.verify';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    @InjectQueue(KYC_QUEUE) private readonly queue: Queue,
  ) {}

  /** Return presigned PUT URLs the browser uploads to directly. */
  async start(userId: string, dto: StartVerificationDto) {
    const bucket = this.s3.bucket('kyc');
    const prefix = `users/${userId}`;
    const [front, back, selfie] = await Promise.all([
      this.s3.signUpload(bucket, `${prefix}/front`, dto.frontContentType),
      this.s3.signUpload(bucket, `${prefix}/back`, dto.backContentType),
      this.s3.signUpload(bucket, `${prefix}/selfie`, dto.selfieContentType),
    ]);
    return { bucket, front, back, selfie };
  }

  async submit(userId: string, dto: SubmitVerificationDto) {
    const verification = await this.prisma.verification.upsert({
      where: { userId },
      create: {
        userId,
        frontPhotoKey: dto.frontKey,
        backPhotoKey: dto.backKey,
        selfieKey: dto.selfieKey,
        status: 'PENDING',
        ghanaCardLast4:
          dto.ghanaCardNumber.slice(-1) + dto.ghanaCardNumber.slice(-3, -2),
      },
      update: {
        frontPhotoKey: dto.frontKey,
        backPhotoKey: dto.backKey,
        selfieKey: dto.selfieKey,
        status: 'PENDING',
        rejectionReason: null,
      },
    });

    await this.queue.add(
      KYC_QUEUE,
      {
        verificationId: verification.id,
        userId,
        frontKey: dto.frontKey,
        backKey: dto.backKey,
        selfieKey: dto.selfieKey,
        ghanaCardNumber: dto.ghanaCardNumber,
      },
      {
        jobId: `kyc:${verification.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    return this.mine(userId);
  }

  async mine(userId: string) {
    const v = await this.prisma.verification.findUnique({ where: { userId } });
    if (!v) return { status: 'UNVERIFIED' as const };
    return {
      status: v.status,
      ghanaCardLast4: v.ghanaCardLast4,
      reviewedAt: v.reviewedAt,
      rejectionReason: v.rejectionReason,
    };
  }

  // ── Admin ────────────────────────────────────────────────

  async pendingQueue(limit = 30) {
    return this.prisma.verification.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            locale: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async detail(id: string) {
    const v = await this.prisma.verification.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, locale: true },
        },
      },
    });
    if (!v) throw new NotFoundException('Verification not found');
    const bucket = this.s3.bucket('kyc');
    const [front, back, selfie] = await Promise.all([
      v.frontPhotoKey ? this.s3.signDownload(bucket, v.frontPhotoKey) : null,
      v.backPhotoKey ? this.s3.signDownload(bucket, v.backPhotoKey) : null,
      v.selfieKey ? this.s3.signDownload(bucket, v.selfieKey) : null,
    ]);
    return { ...v, signedUrls: { front, back, selfie } };
  }

  async review(id: string, reviewerId: string, dto: ReviewVerificationDto) {
    return this.prisma.verification.update({
      where: { id },
      data: {
        status: dto.decision,
        rejectionReason:
          dto.decision === 'REJECTED' ? (dto.reason ?? 'Not specified') : null,
        reviewerId,
        reviewedAt: new Date(),
      },
    });
  }
}
