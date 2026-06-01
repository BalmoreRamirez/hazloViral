import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InfluencersService } from './influencers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { CreateMetricDto, UpdateMetricDto } from './dto/influencer-metric.dto';

@Controller('influencers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InfluencersController {
  constructor(private readonly service: InfluencersService) {}

  // ─── Buscador público §4.1 — cualquier usuario autenticado puede buscar ───────
  @Get()
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER, UserRole.ADMIN)
  search(
    @Query('red_social')                                                               red_social?: string,
    @Query('ubicacion')                                                                ubicacion?: string,
    @Query('min_seguidores', new DefaultValuePipe(0),  ParseIntPipe) min_seguidores?: number,
    @Query('max_tarifa')                                                               max_tarifa?: string,
    @Query('page',           new DefaultValuePipe(1),  ParseIntPipe) page?:           number,
    @Query('limit',          new DefaultValuePipe(20), ParseIntPipe) limit?:          number,
  ) {
    // max_tarifa solo se aplica si se envía explícitamente (evita filtrar con 0 por defecto)
    const maxTarifa = max_tarifa !== undefined ? Number(max_tarifa) : undefined;
    return this.service.search({ red_social, ubicacion, min_seguidores, max_tarifa: maxTarifa, page, limit });
  }

  // ─── Perfil propio (influencer) ───────────────────────────────────────────────
  @Get('profile')
  @Roles(UserRole.INFLUENCER)
  getMyProfile(@GetUser() user: User) {
    return this.service.getMyProfile(user);
  }

  @Patch('profile')
  @Roles(UserRole.INFLUENCER)
  updateProfile(@GetUser() user: User, @Body() dto: UpdateInfluencerDto) {
    return this.service.updateMyProfile(user, dto);
  }

  // ─── Perfil público por ID ────────────────────────────────────────────────────
  @Get(':id')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER, UserRole.ADMIN)
  getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicProfile(id);
  }

  // ─── Métricas de redes sociales (claude.md §4 "Carga Manual V1") ─────────────
  @Get('metrics/mine')
  @Roles(UserRole.INFLUENCER)
  getMyMetrics(@GetUser() user: User) {
    return this.service.getMyMetrics(user);
  }

  @Post('metrics')
  @Roles(UserRole.INFLUENCER)
  addMetric(@GetUser() user: User, @Body() dto: CreateMetricDto) {
    return this.service.addMetric(user, dto);
  }

  @Patch('metrics/:id')
  @Roles(UserRole.INFLUENCER)
  updateMetric(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMetricDto,
  ) {
    return this.service.updateMetric(user, id, dto);
  }

  @Delete('metrics/:id')
  @Roles(UserRole.INFLUENCER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMetric(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.deleteMetric(user, id);
  }
}
