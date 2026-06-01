import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { InfluencerMetric } from './entities/influencer-metric.entity';
import { User } from '../users/entities/user.entity';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { CreateMetricDto, UpdateMetricDto } from './dto/influencer-metric.dto';

export interface SearchInfluencerQuery {
  red_social?: string;
  ubicacion?: string;
  min_seguidores?: number;
  max_tarifa?: number;
  disponible?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class InfluencersService {
  constructor(
    @InjectRepository(InfluencerProfile)
    private readonly profilesRepo: Repository<InfluencerProfile>,
    @InjectRepository(InfluencerMetric)
    private readonly metricsRepo: Repository<InfluencerMetric>,
  ) {}

  // ─── Perfil propio ────────────────────────────────────────────────────────────
  async getMyProfile(user: User): Promise<InfluencerProfile> {
    const profile = await this.profilesRepo.findOne({
      where: { user_id: user.id },
      relations: { metrics: true },
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
    return this.profilesRepo.save(profile);
  }

  // ─── Buscador público (claude.md §4.1 — acceso gratuito para empresas) ────────
  async search(query: SearchInfluencerQuery): Promise<{ data: InfluencerProfile[]; total: number }> {
    const page  = query.page  ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip  = (page - 1) * limit;

    const qb = this.profilesRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.metrics', 'm')
      .where('p.disponibilidad = :disp', { disp: true });

    if (query.ubicacion) {
      qb.andWhere('LOWER(p.ubicacion) LIKE LOWER(:ub)', { ub: `%${query.ubicacion}%` });
    }
    if (query.max_tarifa !== undefined) {
      qb.andWhere('p.tarifa_base <= :tarifa', { tarifa: query.max_tarifa });
    }
    if (query.red_social) {
      qb.andWhere('m.red_social = :red', { red: query.red_social });
      if (query.min_seguidores !== undefined) {
        qb.andWhere('m.seguidores >= :seg', { seg: query.min_seguidores });
      }
    }

    qb.orderBy('p.tarifa_base', 'ASC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getPublicProfile(id: number): Promise<InfluencerProfile> {
    const profile = await this.profilesRepo.findOne({
      where: { id },
      relations: { metrics: true },
    });
    if (!profile) throw new NotFoundException('Influencer no encontrado.');
    return profile;
  }

  // ─── Métricas de redes sociales (claude.md §4 "Carga Manual en V1") ──────────
  async addMetric(user: User, dto: CreateMetricDto): Promise<InfluencerMetric> {
    const profile = await this.getMyProfile(user);
    const metric = new InfluencerMetric();
    metric.influencer_id = profile.id;
    metric.red_social    = dto.red_social;
    metric.username      = dto.username;
    metric.seguidores    = dto.seguidores;
    metric.engagement_rate = dto.engagement_rate;
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

  private async assertOwnsMetric(user: User, metricId: number): Promise<InfluencerMetric> {
    const profile = await this.getMyProfile(user);
    const metric  = await this.metricsRepo.findOne({ where: { id: metricId } });
    if (!metric) throw new NotFoundException('Métrica no encontrada.');
    if (metric.influencer_id !== profile.id) throw new ForbiddenException('No tienes acceso a esta métrica.');
    return metric;
  }
}
