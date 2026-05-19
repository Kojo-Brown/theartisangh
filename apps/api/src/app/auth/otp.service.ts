import {
  Injectable,
  Inject,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, createHash } from 'node:crypto';
import Redis from 'ioredis';
import { SMS_PROVIDER, type SmsProvider, type Env } from '@artisangh/api-core';

const REDIS_TOKEN = 'REDIS_CLIENT';

@Injectable()
export class OtpService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  /** Generate, store and dispatch an OTP. Returns nothing for security (no enumeration). */
  async request(phone: string): Promise<void> {
    const rateKey = `otp:rate:${phone}`;
    const inWindow = await this.redis.incr(rateKey);
    if (inWindow === 1) {
      await this.redis.expire(rateKey, 60);
    }
    if (inWindow > 3) {
      throw new HttpException(
        'Too many OTP requests, try again in a minute',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const length = this.config.get('OTP_LENGTH');
    const ttl = this.config.get('OTP_TTL_SECONDS');
    const code = String(randomInt(0, 10 ** length)).padStart(length, '0');
    const hash = this.hash(code);

    await this.redis.set(
      `otp:code:${phone}`,
      JSON.stringify({ hash, attempts: 0 }),
      'EX',
      ttl,
    );

    await this.sms.send({
      to: phone,
      body: `Your Artisan GH code is ${code}. It expires in ${Math.floor(ttl / 60)} minutes.`,
    });
  }

  /** Returns true if the code is valid (and consumes it). */
  async verify(phone: string, code: string): Promise<boolean> {
    const key = `otp:code:${phone}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException('OTP expired or never requested');

    const record = JSON.parse(raw) as { hash: string; attempts: number };
    const max = this.config.get('OTP_MAX_ATTEMPTS');
    if (record.attempts >= max) {
      await this.redis.del(key);
      throw new HttpException(
        'Too many attempts, request a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.hash(code) !== record.hash) {
      record.attempts += 1;
      await this.redis.set(key, JSON.stringify(record), 'KEEPTTL');
      throw new BadRequestException('Invalid code');
    }

    await this.redis.del(key);
    return true;
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
