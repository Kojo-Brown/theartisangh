import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'kyc.verify' })],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
