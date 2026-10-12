import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { InfluencerMetric } from './entities/influencer-metric.entity';
import { User } from '../users/entities/user.entity';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { CreateMetricDto, UpdateMetricDto } from './dto/influencer-metric.dto';
import { SocialVerificationService } from './social-verification.service';

export interface SearchInfluencerQuery {
  red_social?: string;
  ubicacion?: string;
  rubro?: string;
  min_seguidores?: number;
  max_tarifa?: number;
  disponible?: boolean;
  orden?: SearchOrden;
  page?: number;
  limit?: number;
}

export const SEARCH_ORDENES = ['tarifa', 'seguidores', 'calificacion', 'recientes'] as const;
export type SearchOrden = (typeof SEARCH_ORDENES)[number];

/** Perfil del buscador con su resumen de calificaciones (evita un request por tarjeta). */
export type SearchResultItem = InfluencerProfile & { rating: { promedio: number | null; total: number } };

@Injectable()
export class InfluencersService {
  private readonly logger = new Logger(InfluencersService.name);

  constructor(
    @InjectRepository(InfluencerProfile)
    private readonly profilesRepo: Repository<InfluencerProfile>,
    @InjectRepository(InfluencerMetric)
    private readonly metricsRepo: Repository<InfluencerMetric>,
    private readonly verificationService: SocialVerificationService,
  ) {}

  // ─── Perfil propio ────────────────────────────────────────────────────────────
  async getMyProfile(user: User): Promise<InfluencerProfile> {
    const profile = await this.profilesRepo.findOne({
      where: { user_id: user.id },
      relations: { metrics: true, user: true },
    });
    if (!profile) throw new NotFoundException('Perfil de influencer no encontrado.');
    return profile;
  }

  async updateMyProfile(user: User, dto: UpdateInfluencerDto): Promise<InfluencerProfile> {
    const profile = await this.getMyProfile(user);
    if (dto.nombre_artistico !== undefined) profile.nombre_artistico = dto.nombre_artistico;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.ubicacion !== undefined) profile.ubicacion = dto.ubicacion;
    if (dto.tarifa_base !== undefined) profile.tarifa_base = dto.tarifa_base;
    if (dto.disponibilidad !== undefined) profile.disponibilidad = dto.disponibilidad;
    if (dto.tipo_identificacion !== undefined) profile.tipo_identificacion = dto.tipo_identificacion;
    if (dto.numero_identificacion !== undefined) profile.numero_identificacion = dto.numero_identificacion;
    if (dto.banco_nombre !== undefined) profile.banco_nombre = dto.banco_nombre;
    if (dto.banco_cuenta_numero !== undefined) profile.banco_cuenta_numero = dto.banco_cuenta_numero;
    if (dto.banco_cuenta_tipo !== undefined) profile.banco_cuenta_tipo = dto.banco_cuenta_tipo;
    if (dto.username !== undefined) profile.username = dto.username;
    if (dto.rubros !== undefined) profile.rubros = dto.rubros;
    return this.profilesRepo.save(profile);
  }

  async findByUsername(username: string): Promise<InfluencerProfile> {
    const profile = await this.profilesRepo.findOne({
      where: { username },
      relations: { metrics: true, user: true },
    });
    if (!profile) throw new NotFoundException(`No se encontró un influencer con el username @${username}.`);
    return profile;
  }

  // ─── Buscador público ─────────────────────────────────────────────────────────
  async search(query: SearchInfluencerQuery): Promise<{ data: SearchResultItem[]; total: number; page: number; limit: number }> {
    const page  = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    const skip  = (page - 1) * limit;

    const soloDisponibles = query.disponible !== false;

    // Paso 1: filtrar, ordenar y paginar solo IDs (sin unir métricas, para que la paginación
    // no se rompa con filas duplicadas y el orden pueda usar expresiones calculadas).
    const qb = this.profilesRepo
      .createQueryBuilder('p')
      .innerJoin('p.user', 'u');

    // Solo influencers con perfil verificado completo
    qb.where('u.is_email_verified = true')
      .andWhere('u.avatar_url IS NOT NULL')
      .andWhere('p.tipo_identificacion IS NOT NULL')
      .andWhere('p.numero_identificacion IS NOT NULL')
      .andWhere(
        'EXISTS (SELECT 1 FROM influencer_metrics vm WHERE vm.influencer_id = p.id AND vm.is_verified = true)',
      )
      .andWhere(
        `DATE_PART('year', AGE(CAST(p.fecha_nacimiento AS DATE))) >= 16`,
      );

    if (soloDisponibles) {
      qb.andWhere('p.disponibilidad = true');
    }

    if (query.ubicacion) {
      qb.andWhere('LOWER(p.ubicacion) LIKE LOWER(:ub)', { ub: `%${query.ubicacion}%` });
    }
    if (query.rubro) {
      qb.andWhere('p.rubro @> CAST(:rubro AS jsonb)', { rubro: JSON.stringify([query.rubro]) });
    }
    if (query.max_tarifa !== undefined) {
      qb.andWhere('p.tarifa_base <= :tarifa', { tarifa: query.max_tarifa });
    }
    // Red social y mínimo de seguidores. Sin red elegida, el mínimo aplica a cualquiera de sus redes.
    const minSeg = query.min_seguidores && query.min_seguidores > 0 ? query.min_seguidores : null;
    if (query.red_social) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM influencer_metrics fm WHERE fm.influencer_id = p.id AND fm.red_social = :red${minSeg ? ' AND fm.seguidores >= :seg' : ''})`,
        { red: query.red_social, seg: minSeg },
      );
    } else if (minSeg) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM influencer_metrics fm WHERE fm.influencer_id = p.id AND fm.seguidores >= :seg)',
        { seg: minSeg },
      );
    }

    const total = await qb.getCount();

    const orden = query.orden ?? 'tarifa';
    const SEGUIDORES = '(SELECT COALESCE(MAX(sm.seguidores), 0) FROM influencer_metrics sm WHERE sm.influencer_id = p.id AND sm.is_verified = true)';
    const RATING_AVG = '(SELECT COALESCE(AVG(r.estrellas), 0) FROM influencer_ratings r WHERE r.influencer_id = p.id)';
    const RATING_CNT = '(SELECT COUNT(*) FROM influencer_ratings r WHERE r.influencer_id = p.id)';

    qb.select('p.id', 'id');
    if (orden === 'seguidores') {
      qb.addSelect(SEGUIDORES, 'k1').orderBy('k1', 'DESC');
    } else if (orden === 'calificacion') {
      qb.addSelect(RATING_AVG, 'k1').addSelect(RATING_CNT, 'k2').orderBy('k1', 'DESC').addOrderBy('k2', 'DESC');
    } else if (orden === 'recientes') {
      qb.addSelect('u.created_at', 'k1').orderBy('k1', 'DESC');
    } else {
      // Menor tarifa primero; "a convenir" (tarifa 0) al final
      qb.addSelect('CASE WHEN p.tarifa_base > 0 THEN 0 ELSE 1 END', 'k1')
        .addSelect('p.tarifa_base', 'k2')
        .orderBy('k1', 'ASC').addOrderBy('k2', 'ASC');
    }
    qb.addOrderBy('p.id', 'ASC').offset(skip).limit(limit);

    const ids = (await qb.getRawMany<{ id: number }>()).map((r) => Number(r.id));
    if (!ids.length) return { data: [], total, page, limit };

    // Paso 2: cargar los perfiles completos y las calificaciones de la página en dos consultas
    const [profiles, ratings] = await Promise.all([
      this.profilesRepo.find({ where: { id: In(ids) }, relations: { user: true, metrics: true } }),
      this.profilesRepo.manager
        .createQueryBuilder()
        .select('r.influencer_id', 'influencer_id')
        .addSelect('ROUND(AVG(r.estrellas)::numeric, 1)', 'promedio')
        .addSelect('COUNT(*)', 'total')
        .from('influencer_ratings', 'r')
        .where('r.influencer_id IN (:...ids)', { ids })
        .groupBy('r.influencer_id')
        .getRawMany<{ influencer_id: number; promedio: string; total: string }>(),
    ]);

    const byId = new Map(profiles.map((p) => [p.id, p]));
    const ratingById = new Map(ratings.map((r) => [Number(r.influencer_id), r]));
    const data = ids
      .map((id) => byId.get(id))
      .filter((p): p is InfluencerProfile => !!p)
      .map((p) => {
        const r = ratingById.get(p.id);
        return Object.assign(p, {
          rating: { promedio: r ? parseFloat(r.promedio) : null, total: r ? parseInt(r.total, 10) : 0 },
        }) as SearchResultItem;
      });

    return { data, total, page, limit };
  }

  async getPublicProfile(id: number): Promise<InfluencerProfile> {
    const profile = await this.profilesRepo.findOne({
      where: { id },
      relations: { metrics: true, user: true },
    });
    if (!profile) throw new NotFoundException('Influencer no encontrado.');
    return profile;
  }

  // ─── Métricas ─────────────────────────────────────────────────────────────────
  async addMetric(user: User, dto: CreateMetricDto): Promise<InfluencerMetric> {
    const profile = await this.getMyProfile(user);

    const username = dto.username.replace(/^@/, '').trim();

    // Unicidad global: el mismo username+red_social no puede estar en dos cuentas
    const existing = await this.metricsRepo.findOne({
      where: { red_social: dto.red_social, username },
    });
    if (existing) {
      throw new BadRequestException(
        `@${username} ya está registrado en ${dto.red_social} por otra cuenta de la plataforma.`,
      );
    }

    // Para plataformas soportadas, verificar ANTES de guardar
    if (this.verificationService.isSupported(dto.red_social)) {
      const result = await this.verificationService.verify(dto.red_social, username);
      if (!result) {
        throw new BadRequestException(
          `No se pudo verificar @${username} en ${dto.red_social}. Asegúrate de que la cuenta sea pública y el username sea correcto.`,
        );
      }
      const metric = new InfluencerMetric();
      metric.influencer_id   = profile.id;
      metric.red_social      = dto.red_social;
      metric.username        = username;
      metric.seguidores      = result.followers;
      metric.engagement_rate = result.engagement_rate;
      metric.is_verified     = true;
      metric.verified_at     = new Date();
      return this.metricsRepo.save(metric);
    }

    // Plataformas no soportadas (YouTube, Twitter, etc.) — carga manual
    const metric = new InfluencerMetric();
    metric.influencer_id   = profile.id;
    metric.red_social      = dto.red_social;
    metric.username        = username;
    metric.seguidores      = dto.seguidores ?? 0;
    metric.engagement_rate = dto.engagement_rate ?? 0;
    metric.is_verified     = false;
    metric.verified_at     = null;
    return this.metricsRepo.save(metric);
  }

  async getMyMetrics(user: User): Promise<InfluencerMetric[]> {
    const profile = await this.getMyProfile(user);
    return this.metricsRepo.find({
      where: { influencer_id: profile.id },
      order: { red_social: 'ASC' },
    });
  }

  async updateMetric(user: User, metricId: number, dto: UpdateMetricDto): Promise<InfluencerMetric> {
    const metric = await this.assertOwnsMetric(user, metricId);
    if (dto.username !== undefined) metric.username = dto.username;
    if (dto.seguidores !== undefined) metric.seguidores = dto.seguidores;
    if (dto.engagement_rate !== undefined) metric.engagement_rate = dto.engagement_rate;
    return this.metricsRepo.save(metric);
  }

  async deleteMetric(user: User, metricId: number): Promise<void> {
    const metric = await this.assertOwnsMetric(user, metricId);
    await this.metricsRepo.remove(metric);
  }

  async reVerifyMetric(user: User, metricId: number): Promise<InfluencerMetric> {
    const metric = await this.assertOwnsMetric(user, metricId);
    return this.runVerification(metric);
  }

  // ─── Verificación ─────────────────────────────────────────────────────────────
  private async runVerification(metric: InfluencerMetric): Promise<InfluencerMetric> {
    if (!this.verificationService.isSupported(metric.red_social)) return metric;

    const result = await this.verificationService.verify(metric.red_social, metric.username);
    if (result) {
      metric.seguidores      = result.followers;
      metric.engagement_rate = result.engagement_rate;
      metric.is_verified     = true;
      metric.verified_at     = new Date();
    } else {
      metric.is_verified = false;
      metric.verified_at = null;
    }
    return this.metricsRepo.save(metric);
  }

  // ─── Cron: re-verificación semanal (domingos 3 AM) ───────────────────────────
  @Cron('0 3 * * 0')
  async reVerifyAllMetrics(): Promise<void> {
    this.logger.log('Iniciando re-verificación semanal de métricas...');
    const metrics = await this.metricsRepo.find();
    let verified = 0;
    for (const metric of metrics) {
      if (!this.verificationService.isSupported(metric.red_social)) continue;
      try {
        await this.runVerification(metric);
        verified++;
      } catch (err: any) {
        this.logger.warn(`Re-verificación fallida para metric #${metric.id}: ${err?.message}`);
      }
    }
    this.logger.log(`Re-verificación completada: ${verified} métricas actualizadas.`);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private async assertOwnsMetric(user: User, metricId: number): Promise<InfluencerMetric> {
    const profile = await this.getMyProfile(user);
    const metric  = await this.metricsRepo.findOne({ where: { id: metricId } });
    if (!metric) throw new NotFoundException('Métrica no encontrada.');
    if (metric.influencer_id !== profile.id) throw new ForbiddenException('No tienes acceso a esta métrica.');
    return metric;
  }
}
