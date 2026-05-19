import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import {
  ENCRYPTOR,
  FACE_MATCH_PROVIDER,
  ID_OCR_PROVIDER,
  PrismaService,
  S3Service,
  type Encryptor,
  type Env,
  type FaceMatchProvider,
  type IdOcrProvider,
} from '@artisangh/api-core';
import { QUEUES, type KycVerifyJob } from './queue-names';

@Processor(QUEUES.kycVerify)
export class KycConsumer extends WorkerHost {
  private readonly logger = new Logger(KycConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly config: ConfigService<Env, true>,
    @Inject(FACE_MATCH_PROVIDER) private readonly faceMatch: FaceMatchProvider,
    @Inject(ID_OCR_PROVIDER) private readonly idOcr: IdOcrProvider,
    @Inject(ENCRYPTOR) private readonly enc: Encryptor,
  ) {
    super();
  }

  async process(
    job: Job<KycVerifyJob>,
  ): Promise<{ status: string; similarity: number }> {
    const { verificationId, frontKey, selfieKey, ghanaCardNumber } = job.data;
    this.logger.log(`[${job.id}] processing verification ${verificationId}`);

    const bucket = this.s3.bucket('kyc');
    const [frontBytes, selfieBytes] = await Promise.all([
      this.s3.getObjectBytes(bucket, frontKey),
      this.s3.getObjectBytes(bucket, selfieKey),
    ]);

    const [match, ocr] = await Promise.all([
      this.faceMatch.compare(selfieBytes, frontBytes),
      this.idOcr.extract(frontBytes),
    ]);

    const threshold = this.config.get('KYC_AUTO_APPROVE_THRESHOLD');
    const numbersAgree =
      !ocr.ghanaCardNumber ||
      normalise(ocr.ghanaCardNumber) === normalise(ghanaCardNumber);

    let status: 'APPROVED' | 'PENDING' | 'REJECTED';
    let rejectionReason: string | null = null;

    if (!match.faceDetected) {
      status = 'REJECTED';
      rejectionReason = 'No face detected in selfie or ID photo';
    } else if (!numbersAgree) {
      status = 'PENDING';
      rejectionReason =
        'OCR card number does not match submitted number — needs review';
    } else if (match.similarity >= threshold) {
      status = 'APPROVED';
    } else if (match.similarity >= 60) {
      status = 'PENDING';
    } else {
      status = 'REJECTED';
      rejectionReason = `Face match too low (${match.similarity.toFixed(1)}%)`;
    }

    const encrypted = await this.enc.encrypt(ghanaCardNumber);
    const last4 = ghanaCardNumber.slice(-4);

    await this.prisma.verification.update({
      where: { id: verificationId },
      data: {
        status,
        rejectionReason,
        ghanaCardNumberEnc: Buffer.from(encrypted),
        ghanaCardLast4: last4,
        reviewedAt:
          status === 'APPROVED' || status === 'REJECTED' ? new Date() : null,
      },
    });

    this.logger.log(
      `[${job.id}] decision=${status} similarity=${match.similarity.toFixed(1)}% ocr=${ocr.ghanaCardNumber ?? 'n/a'}`,
    );
    return { status, similarity: match.similarity };
  }
}

function normalise(s: string): string {
  return s.replace(/[\s-]/g, '').toUpperCase();
}
