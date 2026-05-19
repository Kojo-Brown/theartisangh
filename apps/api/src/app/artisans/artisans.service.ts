import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, S3Service } from '@artisangh/api-core';
import type {
  UpsertArtisanProfileDto,
  SearchArtisansDto,
} from './artisans.dto';
import { TRADES } from './artisans.dto';

@Injectable()
export class ArtisansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async upsertProfile(userId: string, dto: UpsertArtisanProfileDto) {
    // Promote the user to ARTISAN role if not already.
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ARTISAN' },
    });

    // Prisma's @db.Decimal accepts string-or-number; pass the number directly.
    const profile = await this.prisma.artisanProfile.upsert({
      where: { userId },
      create: {
        userId,
        trades: dto.trades,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        hourlyRate: dto.hourlyRate ?? null,
        currency: dto.currency,
        serviceRadiusKm: dto.serviceRadiusKm,
        baseAddress: dto.baseAddress,
      },
      update: {
        trades: dto.trades,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        hourlyRate: dto.hourlyRate ?? null,
        currency: dto.currency,
        serviceRadiusKm: dto.serviceRadiusKm,
        baseAddress: dto.baseAddress,
      },
    });

    await this.prisma.$executeRaw`
      UPDATE "ArtisanProfile"
      SET "baseLocation" = ST_SetSRID(ST_MakePoint(${dto.baseLocation.lng}, ${dto.baseLocation.lat}), 4326)::geography
      WHERE id = ${profile.id}::uuid
    `;

    return this.findByUserId(userId);
  }

  async findByUserId(userId: string) {
    const profile = await this.prisma.artisanProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
        },
      },
    });
    if (!profile) throw new NotFoundException('Artisan profile not found');
    return profile;
  }

  /**
   * PostGIS ST_DWithin search — returns artisans within `radiusKm` of (lat, lng).
   * `trade` and `verifiedOnly` are guaranteed safe by Zod validation; we still
   * cross-check the trade against the allowlist before inlining.
   */
  async search(dto: SearchArtisansDto) {
    if (dto.trade && !TRADES.includes(dto.trade)) {
      throw new Error('Unknown trade');
    }
    const tradeClause = dto.trade ? `AND '${dto.trade}' = ANY(p."trades")` : '';
    const verifiedClause = dto.verifiedOnly
      ? `AND v."status" = 'APPROVED'`
      : '';

    type Row = {
      id: string;
      userId: string;
      fullName: string;
      avatarUrl: string | null;
      trades: string[];
      ratingAvg: number;
      jobsCompleted: number;
      hourlyRate: string | null;
      distanceM: number;
      verified: boolean;
    };
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT
        p."id",
        p."userId",
        u."fullName",
        u."avatarUrl",
        p."trades",
        p."ratingAvg",
        p."jobsCompleted",
        p."hourlyRate"::text AS "hourlyRate",
        ST_Distance(
          p."baseLocation",
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS "distanceM",
        (v."status" = 'APPROVED') AS "verified"
      FROM "ArtisanProfile" p
      JOIN "User" u ON u.id = p."userId"
      LEFT JOIN "Verification" v ON v."userId" = p."userId"
      WHERE p."baseLocation" IS NOT NULL
        AND ST_DWithin(
          p."baseLocation",
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        ${tradeClause}
        ${verifiedClause}
      ORDER BY "distanceM" ASC
      LIMIT $4
    `,
      dto.lng,
      dto.lat,
      dto.radiusKm * 1000,
      dto.limit,
    )) as Row[];
    return rows;
  }

  async findById(id: string) {
    const profile = await this.prisma.artisanProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            locale: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Artisan not found');
    const voiceIntroUrl = profile.voiceIntroKey
      ? await this.s3.signDownload(
          this.s3.bucket('media'),
          profile.voiceIntroKey,
        )
      : null;
    return { ...profile, voiceIntroUrl };
  }
}
