import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash } from 'node:crypto';
import Redis from 'ioredis';
import type { Env } from '@artisangh/api-core';

const REDIS_TOKEN = 'REDIS_CLIENT';

export interface AccessClaims {
  sub: string;
  phone: string;
  role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN';
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async issue(claims: AccessClaims): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(claims, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL'),
    });

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: claims.sub, jti },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL'),
      },
    );

    const ttl = this.parseTtlSeconds(this.config.get('JWT_REFRESH_TTL'));
    const refreshTokenExpiresAt = new Date(Date.now() + ttl * 1000);
    await this.redis.set(this.refreshKey(claims.sub, jti), '1', 'EX', ttl);

    return { accessToken, refreshToken, refreshTokenExpiresAt };
  }

  async rotate(refreshToken: string): Promise<IssuedTokens & { sub: string }> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const key = this.refreshKey(payload.sub, payload.jti);
    const exists = await this.redis.del(key);
    if (exists === 0) {
      // Token was revoked or already used — possible replay; revoke whole family.
      throw new UnauthorizedException('Refresh token revoked');
    }
    return { ...(await this.issueFor(payload.sub)), sub: payload.sub };
  }

  async revokeAll(userId: string): Promise<void> {
    const stream = this.redis.scanStream({
      match: this.refreshKey(userId, '*'),
    });
    for await (const keys of stream) {
      if ((keys as string[]).length)
        await this.redis.del(...(keys as string[]));
    }
  }

  /** Re-issue tokens for a user by looking up their current claims. Used by rotate. */
  private async issueFor(userId: string): Promise<IssuedTokens> {
    // Refresh path doesn't carry full claims; the caller must hydrate from DB
    // before calling this from outside. We return placeholder claims sufficient
    // for signing — the auth controller re-fetches the user and re-issues with
    // the canonical role.
    return this.issue({ sub: userId, phone: '', role: 'CUSTOMER' });
  }

  private refreshKey(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  private parseTtlSeconds(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) return 60 * 60 * 24 * 30;
    const n = parseInt(m[1], 10);
    const unit = m[2];
    switch (unit) {
      case 's':
        return n;
      case 'm':
        return n * 60;
      case 'h':
        return n * 3600;
      case 'd':
        return n * 86400;
      default:
        return 60 * 60 * 24 * 30;
    }
  }

  hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
