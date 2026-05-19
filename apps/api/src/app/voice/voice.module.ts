import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'voice.transcribe' })],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceApiModule {}
