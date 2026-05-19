import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  ApiCoreModule,
  AllExceptionsFilter,
  JwtAuthGuard,
  RolesGuard,
  type Env,
} from '@artisangh/api-core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArtisansModule } from './artisans/artisans.module';
import { VerificationModule } from './verification/verification.module';
import { VoiceApiModule } from './voice/voice.module';

@Module({
  imports: [
    ApiCoreModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = new URL(config.get('REDIS_URL'));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    ArtisansModule,
    VerificationModule,
    VoiceApiModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
