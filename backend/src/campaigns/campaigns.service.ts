import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignBrief } from './entities/campaign-brief.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { User } from '../users/entities/user.entity';
import { CreateCampaignBriefDto, UpdateCampaignBriefDto } from './dto/campaign-brief.dto';

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

  async create(user: User, dto: CreateCampaignBriefDto): Promise<CampaignBrief> {
    const empresa_id = await this.getEmpresaId(user.id);
    const brief = new CampaignBrief();
    brief.empresa_id         = empresa_id;
    brief.titulo_campana     = dto.titulo_campana;
    if (dto.objetivo_principal) brief.objetivo_principal = dto.objetivo_principal;
    if (dto.tono_de_voz)        brief.tono_de_voz        = dto.tono_de_voz;
    if (dto.puntos_clave_si)    brief.puntos_clave_si    = dto.puntos_clave_si;
    if (dto.restricciones_no)   brief.restricciones_no   = dto.restricciones_no;
    if (dto.recursos_esteticos) brief.recursos_esteticos = dto.recursos_esteticos;
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
    if (dto.titulo_campana     !== undefined) brief.titulo_campana     = dto.titulo_campana;
    if (dto.objetivo_principal !== undefined) brief.objetivo_principal = dto.objetivo_principal;
    if (dto.tono_de_voz        !== undefined) brief.tono_de_voz        = dto.tono_de_voz;
    if (dto.puntos_clave_si    !== undefined) brief.puntos_clave_si    = dto.puntos_clave_si;
    if (dto.restricciones_no   !== undefined) brief.restricciones_no   = dto.restricciones_no;
    if (dto.recursos_esteticos !== undefined) brief.recursos_esteticos = dto.recursos_esteticos;
    return this.briefsRepo.save(brief);
  }

  async remove(user: User, id: number): Promise<void> {
    const brief = await this.findOne(user, id);
    await this.briefsRepo.remove(brief);
  }
}
