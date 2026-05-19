import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'voice.transcribe' })],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsApiModule {}
