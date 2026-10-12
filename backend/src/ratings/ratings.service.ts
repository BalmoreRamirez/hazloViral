import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfluencerRating } from './entities/influencer-rating.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { ContratoStatus } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { UpsertRatingDto } from './dto/upsert-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(InfluencerRating)
    private readonly repo: Repository<InfluencerRating>,
    @InjectRepository(EmpresaProfile)
    private readonly empresaRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencerRepo: Repository<InfluencerProfile>,
    @InjectRepository(ContratoEscrow)
    private readonly contratosRepo: Repository<ContratoEscrow>,
  ) {}

  private async resolveEmpresa(user: User): Promise<EmpresaProfile> {
    const empresa = await this.empresaRepo.findOne({ where: { user_id: user.id } });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
    return empresa;
  }

  async upsert(user: User, influencerId: number, dto: UpsertRatingDto): Promise<InfluencerRating> {
    const influencer = await this.influencerRepo.findOne({ where: { id: influencerId } });
    if (!influencer) throw new NotFoundException('Influencer no encontrado.');

    const empresa = await this.resolveEmpresa(user);

    // Solo quien trabajó con el influencer puede calificarlo (evita reseñas falsas o de venganza)
    if (!(await this.hasCompletedContract(empresa.id, influencerId))) {
      throw new ForbiddenException('Solo puedes calificar a influencers con los que completaste un contrato.');
    }

    let rating = await this.repo.findOne({
      where: { influencer_id: influencerId, empresa_id: empresa.id },
    });

    if (rating) {
      rating.estrellas  = dto.estrellas;
      rating.comentario = dto.comentario ?? null;
    } else {
      rating = this.repo.create({
        influencer_id: influencerId,
        empresa_id:    empresa.id,
        estrellas:     dto.estrellas,
        comentario:    dto.comentario ?? null,
      });
    }

    return this.repo.save(rating);
  }

  async getSummary(influencerId: number): Promise<{ promedio: number | null; total: number }> {
    const raw = await this.repo
      .createQueryBuilder('r')
      .select('ROUND(AVG(r.estrellas)::numeric, 1)', 'promedio')
      .addSelect('COUNT(*)', 'total')
      .where('r.influencer_id = :id', { id: influencerId })
      .getRawOne<{ promedio: string | null; total: string }>();

    return {
      promedio: raw?.promedio != null ? parseFloat(raw.promedio) : null,
      total:    parseInt(raw?.total ?? '0', 10),
    };
  }

  async getAll(influencerId: number) {
    const ratings = await this.repo.find({
      where: { influencer_id: influencerId },
      relations: { empresa: true },
      order: { created_at: 'DESC' },
    });

    return ratings.map(r => ({
      id:                r.id,
      estrellas:         r.estrellas,
      comentario:        r.comentario,
      created_at:        r.created_at,
      updated_at:        r.updated_at,
      empresa_nombre:    r.empresa?.nombre_comercial ?? 'Empresa',
    }));
  }

  /** Calificación propia y si la empresa puede calificar (tiene un contrato completado con el influencer). */
  async getMyRating(user: User, influencerId: number): Promise<{ rating: InfluencerRating | null; puede_calificar: boolean }> {
    const empresa = await this.empresaRepo.findOne({ where: { user_id: user.id } });
    if (!empresa) return { rating: null, puede_calificar: false };
    const [rating, puede_calificar] = await Promise.all([
      this.repo.findOne({ where: { influencer_id: influencerId, empresa_id: empresa.id } }),
      this.hasCompletedContract(empresa.id, influencerId),
    ]);
    return { rating, puede_calificar };
  }

  private hasCompletedContract(empresaId: number, influencerId: number): Promise<boolean> {
    return this.contratosRepo.existsBy({
      empresa_id: empresaId,
      influencer_id: influencerId,
      status: ContratoStatus.COMPLETED,
    });
  }
}
