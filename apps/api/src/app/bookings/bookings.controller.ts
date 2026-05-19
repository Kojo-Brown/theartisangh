import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '@artisangh/api-core';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  DisputeBookingDto,
  ResolveDisputeDto,
  VoiceUploadForBookingDto,
} from './bookings.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post('voice-upload-url')
  async voiceUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VoiceUploadForBookingDto,
  ) {
    return this.svc.signVoiceUpload(user.id, dto);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.svc.create(user.id, user.phone, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.listForUser(user.id);
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.svc.detail(id, user.id, user.role);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'ACCEPT');
  }

  @Post(':id/decline')
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'DECLINE');
  }

  @Post(':id/en-route')
  enRoute(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'EN_ROUTE');
  }

  @Post(':id/arrive')
  arrive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'ARRIVE');
  }

  @Post(':id/start-work')
  startWork(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'START_WORK');
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'COMPLETE');
  }

  @Post(':id/confirm')
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'CONFIRM');
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.sendEvent(id, user.id, user.role, 'CANCEL');
  }

  @Post(':id/dispute')
  dispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DisputeBookingDto,
  ) {
    return this.svc.dispute(id, user.id, user.role, dto);
  }

  // ── Admin ────────────────────────────────────────────────
  @Roles('ADMIN')
  @Get('admin/disputes')
  disputesQueue() {
    return this.svc.disputesQueue();
  }

  @Roles('ADMIN')
  @Post(':id/resolve')
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.svc.resolveDispute(id, user.id, dto);
  }
}
