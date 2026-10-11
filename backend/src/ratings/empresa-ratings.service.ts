import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmpresaRating } from './entities/empresa-rating.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { ContratoStatus } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { UpsertRatingDto } from './dto/upsert-rating.dto';

@Injectable()
export class EmpresaRatingsService {
  constructor(
    @InjectRepository(EmpresaRating)
    private readonly repo: Repository<EmpresaRating>,
    @InjectRepository(EmpresaProfile)
    private readonly empresaRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencerRepo: Repository<InfluencerProfile>,
    @InjectRepository(ContratoEscrow)
    private readonly contratosRepo: Repository<ContratoEscrow>,
  ) {}

  private async resolveInfluencer(user: User): Promise<InfluencerProfile> {
    const influencer = await this.influencerRepo.findOne({ where: { user_id: user.id } });
    if (!influencer) throw new NotFoundException('Perfil de influencer no encontrado.');
    return influencer;
  }

  private hasCompletedContract(empresaId: number, influencerId: number): Promise<boolean> {
    return this.contratosRepo.existsBy({
      empresa_id: empresaId,
      influencer_id: influencerId,
      status: ContratoStatus.COMPLETED,
    });
  }

  async upsert(user: User, empresaId: number, dto: UpsertRatingDto): Promise<EmpresaRating> {
    const empresa = await this.empresaRepo.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    const influencer = await this.resolveInfluencer(user);

    if (!(await this.hasCompletedContract(empresaId, influencer.id))) {
      throw new ForbiddenException('Solo puedes calificar a marcas con las que completaste un contrato.');
    }

    let rating = await this.repo.findOne({ where: { empresa_id: empresaId, influencer_id: influencer.id } });
    if (rating) {
      rating.estrellas  = dto.estrellas;
      rating.comentario = dto.comentario ?? null;
    } else {
      rating = this.repo.create({
        empresa_id:    empresaId,
        influencer_id: influencer.id,
        estrellas:     dto.estrellas,
        comentario:    dto.comentario ?? null,
      });
    }
    return this.repo.save(rating);
  }

  async getSummary(empresaId: number): Promise<{ promedio: number | null; total: number }> {
    const raw = await this.repo
      .createQueryBuilder('r')
      .select('ROUND(AVG(r.estrellas)::numeric, 1)', 'promedio')
      .addSelect('COUNT(*)', 'total')
      .where('r.empresa_id = :id', { id: empresaId })
      .getRawOne<{ promedio: string | null; total: string }>();
    return {
      promedio: raw?.promedio != null ? parseFloat(raw.promedio) : null,
      total:    parseInt(raw?.total ?? '0', 10),
    };
  }

  async getAll(empresaId: number) {
    const ratings = await this.repo.find({
      where: { empresa_id: empresaId },
      relations: { influencer: true },
      order: { created_at: 'DESC' },
    });
    return ratings.map((r) => ({
      id:                r.id,
      estrellas:         r.estrellas,
      comentario:        r.comentario,
      created_at:        r.created_at,
      updated_at:        r.updated_at,
      influencer_nombre: r.influencer?.nombre_artistico ?? 'Influencer',
    }));
  }

  /** Calificación propia y si el influencer puede calificar (tiene contrato completado). */
  async getMine(user: User, empresaId: number) {
    const influencer = await this.influencerRepo.findOne({ where: { user_id: user.id } });
    if (!influencer) return { rating: null, puede_calificar: false };
    const [rating, puede_calificar] = await Promise.all([
      this.repo.findOne({ where: { empresa_id: empresaId, influencer_id: influencer.id } }),
      this.hasCompletedContract(empresaId, influencer.id),
    ]);
    return { rating, puede_calificar };
  }
}
