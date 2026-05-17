import { Injectable } from '@nestjs/common';
import { PrismaService } from '@artisangh/api-core';
import { OtpService } from './otp.service';
import { TokensService, type IssuedTokens } from './tokens.service';
import type { VerifyOtpDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
  ) {}

  async requestOtp(phone: string): Promise<void> {
    await this.otp.request(phone);
  }

  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<
    IssuedTokens & {
      user: { id: string; phone: string; role: string; fullName: string };
    }
  > {
    await this.otp.verify(dto.phone, dto.code);

    // upsert user — first-time verification creates the account
    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { lastSeenAt: new Date() },
      create: {
        phone: dto.phone,
        fullName: dto.fullName ?? 'New User',
        role: dto.role,
        lastSeenAt: new Date(),
      },
    });

    const tokens = await this.tokens.issue({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        fullName: user.fullName,
      },
    };
  }

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    const { sub, ...newTokens } = await this.tokens.rotate(refreshToken);
    // Re-issue with canonical user info (role may have changed)
    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user) return newTokens;
    return this.tokens.issue({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });
  }

  async logout(userId: string): Promise<void> {
    await this.tokens.revokeAll(userId);
  }
}
