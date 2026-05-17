import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Public,
  type AuthenticatedUser,
} from '@artisangh/api-core';
import { ArtisansService } from './artisans.service';
import { UpsertArtisanProfileDto, SearchArtisansDto } from './artisans.dto';

@ApiTags('artisans')
@Controller('artisans')
export class ArtisansController {
  constructor(private readonly artisans: ArtisansService) {}

  @ApiBearerAuth()
  @Put('me')
  async upsertMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertArtisanProfileDto,
  ) {
    return this.artisans.upsertProfile(user.id, dto);
  }

  @ApiBearerAuth()
  @Get('me')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return this.artisans.findByUserId(user.id);
  }

  @Public()
  @Get()
  async search(@Query() query: SearchArtisansDto) {
    return this.artisans.search(query);
  }

  @Public()
  @Get(':id')
  async one(@Param('id') id: string) {
    return this.artisans.findById(id);
  }
}
