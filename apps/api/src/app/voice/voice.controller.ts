import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '@artisangh/api-core';
import { VoiceService } from './voice.service';
import { StartVoiceUploadDto, SubmitVoiceIntroDto } from './voice.dto';

@ApiTags('voice')
@ApiBearerAuth()
@Controller('voice')
export class VoiceController {
  constructor(private readonly svc: VoiceService) {}

  @Post('intro/upload-url')
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartVoiceUploadDto,
  ) {
    return this.svc.startUpload(user.id, dto);
  }

  @Post('intro/submit')
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitVoiceIntroDto,
  ) {
    return this.svc.submitIntro(user.id, dto);
  }

  @Get('intro/playback-url')
  async playback(@CurrentUser() user: AuthenticatedUser) {
    return { url: await this.svc.signPlayback(user.id) };
  }
}
