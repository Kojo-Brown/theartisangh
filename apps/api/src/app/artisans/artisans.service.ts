import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@artisangh/api-core';
import { Prisma } from '@prisma/client';
import type {
  UpsertArtisanProfileDto,
  SearchArtisansDto,
} from './artisans.dto';

@Injectable()
export class ArtisansService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(userId: string, dto: UpsertArtisanProfileDto) {
    // Promote the user to ARTISAN role if not already.
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ARTISAN' },
    });

    // Upsert the structured fields, then set geography via raw SQL.
    const profile = await this.prisma.artisanProfile.upsert({
      where: { userId },
      create: {
        userId,
        trades: dto.trades,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        hourlyRate: dto.hourlyRate ? new Prisma.Decimal(dto.hourlyRate) : null,
        currency: dto.currency,
        serviceRadiusKm: dto.serviceRadiusKm,
        baseAddress: dto.baseAddress,
      },
      update: {
        trades: dto.trades,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        hourlyRate: dto.hourlyRate ? new Prisma.Decimal(dto.hourlyRate) : null,
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
   * PostGIS ST_DWithin search — returns artisans whose base location falls within
   * `radiusKm` of (lat, lng) AND whose own serviceRadiusKm reaches the query point.
   */
  async search(dto: SearchArtisansDto) {
    const tradeFilter = dto.trade
      ? Prisma.sql`AND ${dto.trade} = ANY(p."trades")`
      : Prisma.sql``;
    const verifiedFilter = dto.verifiedOnly
      ? Prisma.sql`AND v."status" = 'APPROVED'`
      : Prisma.sql``;

    return this.prisma.$queryRaw<
      Array<{
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
      }>
    >`
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
          ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography
        ) AS "distanceM",
        (v."status" = 'APPROVED') AS "verified"
      FROM "ArtisanProfile" p
      JOIN "User" u ON u.id = p."userId"
      LEFT JOIN "Verification" v ON v."userId" = p."userId"
      WHERE p."baseLocation" IS NOT NULL
        AND ST_DWithin(
          p."baseLocation",
          ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
          ${dto.radiusKm * 1000}
        )
        ${tradeFilter}
        ${verifiedFilter}
      ORDER BY "distanceM" ASC
      LIMIT ${dto.limit}
    `;
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
    return profile;
  }
}
