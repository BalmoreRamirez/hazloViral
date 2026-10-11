import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignBrief } from './entities/campaign-brief.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { User } from '../users/entities/user.entity';
import { CreateCampaignBriefDto, UpdateCampaignBriefDto } from './dto/campaign-brief.dto';

/** Campos que la empresa puede escribir en un brief */
const WRITABLE_FIELDS = [
  'titulo_campana', 'objetivo_principal', 'tono_de_voz', 'puntos_clave_si', 'restricciones_no',
  'recursos_esteticos', 'presupuesto_min', 'presupuesto_max', 'publico_objetivo', 'fecha_inicio',
  'fecha_fin', 'plataformas', 'formatos', 'hashtags_menciones', 'derechos_uso', 'exclusividad_dias',
  'exclusividad_detalle', 'requiere_disclosure', 'archivos',
] as const;

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(CampaignBrief)
    private readonly briefsRepo: Repository<CampaignBrief>,
    @InjectRepository(EmpresaProfile)
    private readonly empresasRepo: Repository<EmpresaProfile>,
  ) {}

  private async getEmpresaId(userId: number): Promise<number> {
    const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
    return empresa.id;
  }

  /** Copia los campos del DTO al brief. Cadenas vacías se guardan como NULL. */
  private applyDto(brief: CampaignBrief, dto: CreateCampaignBriefDto | UpdateCampaignBriefDto) {
    for (const field of WRITABLE_FIELDS) {
      const value = (dto as any)[field];
      if (value === undefined) continue;
      (brief as any)[field] = value === '' ? null : value;
    }
  }

  /** Reglas de coherencia entre campos */
  private assertConsistent(brief: CampaignBrief) {
    const min = brief.presupuesto_min != null ? Number(brief.presupuesto_min) : null;
    const max = brief.presupuesto_max != null ? Number(brief.presupuesto_max) : null;
    if (min != null && max != null && max < min) {
      throw new BadRequestException('El presupuesto máximo no puede ser menor que el mínimo.');
    }
    if (brief.fecha_inicio && brief.fecha_fin && brief.fecha_fin < brief.fecha_inicio) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
  }

  async create(user: User, dto: CreateCampaignBriefDto): Promise<CampaignBrief> {
    const brief = new CampaignBrief();
    brief.empresa_id = await this.getEmpresaId(user.id);
    this.applyDto(brief, dto);
    this.assertConsistent(brief);
    return this.briefsRepo.save(brief);
  }

  async findAll(user: User): Promise<CampaignBrief[]> {
    const empresa_id = await this.getEmpresaId(user.id);
    return this.briefsRepo.find({
      where: { empresa_id },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(user: User, id: number): Promise<CampaignBrief> {
    const empresa_id = await this.getEmpresaId(user.id);
    const brief = await this.briefsRepo.findOne({ where: { id } });
    if (!brief) throw new NotFoundException('Brief no encontrado.');
    if (brief.empresa_id !== empresa_id) throw new ForbiddenException('No tienes acceso a este brief.');
    return brief;
  }

  async update(user: User, id: number, dto: UpdateCampaignBriefDto): Promise<CampaignBrief> {
    const brief = await this.findOne(user, id);
    this.applyDto(brief, dto);
    this.assertConsistent(brief);
    return this.briefsRepo.save(brief);
  }

  async remove(user: User, id: number): Promise<void> {
    const brief = await this.findOne(user, id);
    await this.briefsRepo.remove(brief);
  }
}
