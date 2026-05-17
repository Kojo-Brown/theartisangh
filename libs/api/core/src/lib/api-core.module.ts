import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [AppConfigModule, AppLoggerModule, PrismaModule, SmsModule],
  exports: [AppConfigModule, AppLoggerModule, PrismaModule, SmsModule],
})
export class ApiCoreModule {}
