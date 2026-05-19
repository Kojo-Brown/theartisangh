import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PAYMENT_PROVIDER,
  PrismaService,
  Public,
  type PaymentProvider,
} from '@artisangh/api-core';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly prisma: PrismaService,
  ) {}

  /** Status check (callable by either party on the booking). */
  @Get(':bookingId/status')
  async status(@Param('bookingId') bookingId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
    return { bookingId, payments };
  }

  /**
   * Hubtel webhook callback. Stub providers never send webhooks, so this
   * endpoint is primarily for production use. It's public (no JWT), but
   * the provider's HMAC signature is verified before any DB writes.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ) {
    const parsed = this.provider.parseWebhook(headers, body);
    if (!parsed) return { ignored: true };

    const payment = await this.prisma.payment.findFirst({
      where: { hubtelRef: parsed.providerRef },
    });
    if (!payment) return { ignored: true, reason: 'no matching payment' };

    if (parsed.status === 'succeeded' && payment.state === 'PENDING') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { state: 'HELD', rawWebhook: parsed.raw as object },
      });
      await this.prisma.ledgerEntry.createMany({
        data: [
          {
            bookingId: payment.bookingId,
            paymentId: payment.id,
            kind: 'CHARGE',
            amount: payment.amount,
            currency: 'GHS',
          },
          {
            bookingId: payment.bookingId,
            paymentId: payment.id,
            kind: 'HOLD',
            amount: payment.amount,
            currency: 'GHS',
          },
        ],
      });
    } else if (parsed.status === 'failed' && payment.state === 'PENDING') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { state: 'FAILED', rawWebhook: parsed.raw as object },
      });
    }

    return { ok: true };
  }
}
