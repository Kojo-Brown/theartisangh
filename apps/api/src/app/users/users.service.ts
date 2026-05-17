import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@artisangh/api-core';
import type { UpdateMeDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { artisanProfile: true, verification: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }
}
