import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '@artisangh/api-core';
import { VerificationService } from './verification.service';
import {
  StartVerificationDto,
  SubmitVerificationDto,
  ReviewVerificationDto,
} from './verification.dto';

@ApiTags('verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly svc: VerificationService) {}

  @Post('start')
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartVerificationDto,
  ) {
    return this.svc.start(user.id, dto);
  }

  @Post('submit')
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.svc.submit(user.id, dto);
  }

  @Get('me')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.mine(user.id);
  }

  // ── Admin queue ──────────────────────────────────────────

  @Roles('ADMIN')
  @Get('queue')
  async queue() {
    return this.svc.pendingQueue();
  }

  @Roles('ADMIN')
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Roles('ADMIN')
  @Patch(':id/review')
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.svc.review(id, user.id, dto);
  }
}
