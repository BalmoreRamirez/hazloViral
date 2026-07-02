import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { UpsertRatingDto } from './dto/upsert-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('influencers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly svc: RatingsService) {}

  // Empresa califica / actualiza su calificación
  @Post(':influencerId/ratings')
  @Roles(UserRole.EMPRESA)
  upsert(
    @GetUser() user: User,
    @Param('influencerId', ParseIntPipe) influencerId: number,
    @Body() dto: UpsertRatingDto,
  ) {
    return this.svc.upsert(user, influencerId, dto);
  }

  // Resumen público: promedio + total
  @Get(':influencerId/ratings/summary')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER, UserRole.ADMIN)
  getSummary(@Param('influencerId', ParseIntPipe) influencerId: number) {
    return this.svc.getSummary(influencerId);
  }

  // Todas las calificaciones (lista pública)
  @Get(':influencerId/ratings')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER, UserRole.ADMIN)
  getAll(@Param('influencerId', ParseIntPipe) influencerId: number) {
    return this.svc.getAll(influencerId);
  }

  // La calificación propia de esta empresa para ese influencer
  @Get(':influencerId/ratings/mine')
  @Roles(UserRole.EMPRESA)
  getMine(
    @GetUser() user: User,
    @Param('influencerId', ParseIntPipe) influencerId: number,
  ) {
    return this.svc.getMyRating(user, influencerId);
  }
}
