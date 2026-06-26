import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  min_seguidores?: number;
  max_tarifa?: number;
  disponible?: boolean;
  page?: number;
  limit?: number;
}

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
    if (dto.tipo_identificacion !== undefined) profile.tipo_identificacion = dto.tipo_identificacion;
    if (dto.numero_identificacion !== undefined) profile.numero_identificacion = dto.numero_identificacion;
    return this.profilesRepo.save(profile);
  }

  // ─── Buscador público ─────────────────────────────────────────────────────────
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
