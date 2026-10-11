import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { EmpresaRatingsService } from './empresa-ratings.service';
import { UpsertRatingDto } from './dto/upsert-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpresaRatingsController {
  constructor(private readonly svc: EmpresaRatingsService) {}

  /** Influencer califica o actualiza su calificación de la marca (requiere contrato completado) */
  @Post(':empresaId/ratings')
  @Roles(UserRole.INFLUENCER)
  upsert(
    @GetUser() user: User,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: UpsertRatingDto,
  ) {
    return this.svc.upsert(user, empresaId, dto);
  }

  @Get(':empresaId/ratings/summary')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER, UserRole.ADMIN)
  getSummary(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.svc.getSummary(empresaId);
  }

  @Get(':empresaId/ratings/mine')
  @Roles(UserRole.INFLUENCER)
  getMine(@GetUser() user: User, @Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.svc.getMine(user, empresaId);
  }

  @Get(':empresaId/ratings')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER, UserRole.ADMIN)
  getAll(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.svc.getAll(empresaId);
  }
}
