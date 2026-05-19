import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  PAYMENT_PROVIDER,
  PrismaService,
  S3Service,
  transition,
  type BookingActor,
  type BookingEvent,
  type BookingState,
  type PaymentProvider,
} from '@artisangh/api-core';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@artisangh/api-core';
import type {
  CreateBookingDto,
  DisputeBookingDto,
  ResolveDisputeDto,
  VoiceUploadForBookingDto,
} from './bookings.dto';

const VOICE_QUEUE = 'voice.transcribe';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly config: ConfigService<Env, true>,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    @InjectQueue(VOICE_QUEUE) private readonly voiceQueue: Queue,
  ) {}

  // ── Voice note presign (used before create) ─────────────────────────────
  async signVoiceUpload(userId: string, dto: VoiceUploadForBookingDto) {
    const bucket = this.s3.bucket('media');
    return this.s3.signUpload(
      bucket,
      `bookings/${userId}/voice`,
      dto.contentType,
    );
  }

  // ── Create + pay ────────────────────────────────────────────────────────
  async create(
    customerId: string,
    customerPhone: string,
    dto: CreateBookingDto,
  ) {
    const artisan = await this.prisma.user.findUnique({
      where: { id: dto.artisanId },
    });
    if (!artisan || artisan.role !== 'ARTISAN') {
      throw new BadRequestException('Artisan not found');
    }

    const booking = await this.prisma.booking.create({
      data: {
        customerId,
        artisanId: dto.artisanId,
        trade: dto.trade,
        description: dto.description,
        voiceNoteKey: dto.voiceNoteKey,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        jobAddress: dto.jobAddress,
        totalAmount: dto.totalAmount,
        status: 'REQUESTED',
      },
    });

    // Persist geography via raw SQL (Prisma doesn't support PostGIS types directly).
    await this.prisma.$executeRaw`
      UPDATE "Booking"
      SET "jobLocation" = ST_SetSRID(ST_MakePoint(${dto.jobLocation.lng}, ${dto.jobLocation.lat}), 4326)::geography
      WHERE id = ${booking.id}::uuid
    `;

    // Enqueue transcription if a voice note was attached.
    if (dto.voiceNoteKey) {
      await this.voiceQueue.add(
        'voice.bookingRequest',
        {
          kind: 'bookingRequest' as const,
          bookingId: booking.id,
          userId: customerId,
          key: dto.voiceNoteKey,
          hintLocale: null,
        },
        { jobId: `voice.booking:${booking.id}` },
      );
    }

    // Initiate the escrow charge. Dev stub auto-settles synchronously.
    const charge = await this.payments.charge({
      bookingId: booking.id,
      payerPhone: customerPhone,
      amount: dto.totalAmount,
      currency: 'GHS',
      description: `Booking ${booking.id} — ${dto.trade}`,
      callbackUrl: this.config.get('HUBTEL_PAYMENT_CALLBACK_URL'),
    });

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        hubtelRef: charge.providerRef,
        channel: 'MOMO_MTN', // placeholder; provider returns actual channel later
        amount: dto.totalAmount,
        state: charge.autoSettled ? 'HELD' : 'PENDING',
      },
    });

    if (charge.autoSettled) {
      await this.recordLedger(
        booking.id,
        payment.id,
        'CHARGE',
        dto.totalAmount,
      );
      await this.recordLedger(booking.id, payment.id, 'HOLD', dto.totalAmount);
    }

    return { booking, payment, checkoutUrl: charge.checkoutUrl ?? null };
  }

  // ── Listing + detail ────────────────────────────────────────────────────
  async listForUser(userId: string) {
    return this.prisma.booking.findMany({
      where: { OR: [{ customerId: userId }, { artisanId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        artisan: { select: { id: true, fullName: true, phone: true } },
      },
    });
  }

  async detail(
    id: string,
    userId: string,
    role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN',
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        artisan: { select: { id: true, fullName: true, phone: true } },
        payments: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (
      role !== 'ADMIN' &&
      booking.customerId !== userId &&
      booking.artisanId !== userId
    ) {
      throw new ForbiddenException('Not your booking');
    }

    const voiceNoteUrl = booking.voiceNoteKey
      ? await this.s3.signDownload(
          this.s3.bucket('media'),
          booking.voiceNoteKey,
        )
      : null;

    return { ...booking, voiceNoteUrl };
  }

  // ── State transitions ───────────────────────────────────────────────────
  async sendEvent(
    bookingId: string,
    userId: string,
    role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN',
    eventType: BookingEvent['type'],
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const actor: BookingActor =
      role === 'ADMIN'
        ? 'admin'
        : booking.artisanId === userId
          ? 'artisan'
          : booking.customerId === userId
            ? 'customer'
            : (() => {
                throw new ForbiddenException('Not your booking');
              })();

    const result = transition(
      booking.status as BookingState,
      {
        type: eventType,
        actor,
      } as BookingEvent,
    );
    if (!result.ok) throw new BadRequestException(result.reason);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: result.next },
    });

    // Side effects on terminal-ish states.
    if (result.next === 'RELEASED') {
      await this.releaseFunds(bookingId);
    } else if (result.next === 'CANCELLED' || result.next === 'REFUNDED') {
      await this.refundFunds(bookingId);
    }

    return updated;
  }

  // ── Disputes ────────────────────────────────────────────────────────────
  async dispute(
    bookingId: string,
    userId: string,
    role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN',
    dto: DisputeBookingDto,
  ) {
    await this.sendEvent(bookingId, userId, role, 'DISPUTE');
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { description: appendNote(bookingId, dto.reason) },
    });
    return this.prisma.booking.findUnique({ where: { id: bookingId } });
  }

  async resolveDispute(
    bookingId: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ) {
    return this.sendEvent(
      bookingId,
      adminId,
      'ADMIN',
      dto.resolution === 'RELEASE' ? 'RESOLVE_RELEASE' : 'RESOLVE_REFUND',
    );
  }

  async disputesQueue() {
    return this.prisma.booking.findMany({
      where: { status: 'DISPUTED' },
      orderBy: { updatedAt: 'asc' },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        artisan: { select: { id: true, fullName: true, phone: true } },
        payments: true,
      },
    });
  }

  // ── Money side effects ──────────────────────────────────────────────────
  private async releaseFunds(bookingId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, state: 'HELD' },
    });
    if (!payment) return;

    const artisan = await this.prisma.user.findFirst({
      where: { artisanBookings: { some: { id: bookingId } } },
    });
    if (!artisan) return;

    await this.payments.payout({
      bookingId,
      recipientPhone: artisan.phone,
      amount: Number(payment.amount),
      currency: 'GHS',
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { state: 'RELEASED' },
    });
    await this.recordLedger(
      bookingId,
      payment.id,
      'RELEASE',
      Number(payment.amount),
    );
    await this.recordLedger(
      bookingId,
      payment.id,
      'PAYOUT',
      Number(payment.amount),
    );

    await this.prisma.artisanProfile.updateMany({
      where: { userId: artisan.id },
      data: { jobsCompleted: { increment: 1 } },
    });
  }

  private async refundFunds(bookingId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, state: 'HELD' },
    });
    if (!payment) return;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { state: 'REFUNDED' },
    });
    await this.recordLedger(
      bookingId,
      payment.id,
      'REFUND',
      Number(payment.amount),
    );
  }

  private async recordLedger(
    bookingId: string,
    paymentId: string,
    kind: 'CHARGE' | 'HOLD' | 'RELEASE' | 'REFUND' | 'PAYOUT' | 'FEE',
    amount: number,
  ) {
    await this.prisma.ledgerEntry.create({
      data: { bookingId, paymentId, kind, amount, currency: 'GHS' },
    });
  }
}

function appendNote(_bookingId: string, reason: string): string {
  return `[dispute] ${reason}`;
}
