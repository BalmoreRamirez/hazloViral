import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyProfile } from './entities/company-profile.entity';
import { User } from '../users/entities/user.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { EscrowContract } from '../contracts/entities/escrow-contract.entity';
import { ContractStatus } from '../../common/enums';

/** Campos editables por la empresa (el umbral de créditos queda fuera a propósito). */
const EDITABLE_FIELDS: (keyof UpdateCompanyDto)[] = [
  'nombre_comercial', 'razon_social', 'nit', 'nrc', 'telefono', 'email_facturacion',
  'descripcion', 'sitio_web', 'instagram_url', 'tiktok_url', 'pais', 'direccion',
  'representante_nombre', 'representante_tipo_identificacion', 'representante_numero_identificacion',
  'rubro',
];

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(CompanyProfile)
    private readonly repo: Repository<CompanyProfile>,
    @InjectRepository(EscrowContract)
    private readonly contratosRepo: Repository<EscrowContract>,
  ) {}

  /** Serializa el perfil propio incluyendo los campos calculados de verificación. */
  private serializeOwn(profile: CompanyProfile) {
    const { user, ...rest } = profile;
    return {
      ...rest,
      is_verified: profile.is_verified,
      verification_checklist: profile.verification_checklist,
    };
  }

  private async loadOwn(user: User): Promise<CompanyProfile> {
    const profile = await this.repo.findOne({ where: { user_id: user.id }, relations: { user: true } });
    if (!profile) throw new NotFoundException('Perfil de empresa no encontrado.');
    return profile;
  }

  async getMyProfile(user: User) {
    return this.serializeOwn(await this.loadOwn(user));
  }

  async updateMyProfile(user: User, dto: UpdateCompanyDto) {
    const profile = await this.loadOwn(user);
    for (const field of EDITABLE_FIELDS) {
      const value = dto[field];
      if (value === undefined) continue;
      // Cadenas vacías en campos opcionales se guardan como NULL
      (profile as any)[field] = value === '' && field !== 'nombre_comercial' ? null : value;
    }
    await this.repo.save(profile);
    return this.serializeOwn(profile);
  }

  /**
   * Perfil público de la marca — visible para influencers y admin.
   * Excluye datos sensibles: NIT, NRC, documento del representante, saldo y contactos.
   */
  async getPublicProfile(id: number) {
    const profile = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!profile) throw new NotFoundException('Empresa no encontrada.');

    const stats = await this.contratosRepo
      .createQueryBuilder('c')
      .select('COUNT(*) FILTER (WHERE c.status = :completed)', 'completados')
      .addSelect('COUNT(DISTINCT c.influencer_id) FILTER (WHERE c.status = :completed)', 'influencers')
      .addSelect('COUNT(*) FILTER (WHERE c.status = :incumplimiento)', 'disputas')
      .where('c.empresa_id = :id', { id })
      .setParameters({ completed: ContractStatus.COMPLETED, incumplimiento: ContractStatus.INCUMPLIMIENTO })
      .getRawOne<{ completados: string; influencers: string; disputas: string }>();

    return {
      id:                 profile.id,
      nombre_comercial:   profile.nombre_comercial,
      descripcion:        profile.descripcion,
      rubro:              profile.rubro,
      pais:               profile.pais,
      sitio_web:          profile.sitio_web,
      instagram_url:      profile.instagram_url,
      tiktok_url:         profile.tiktok_url,
      avatar_url:         profile.user?.avatar_url ?? null,
      miembro_desde:      profile.user?.created_at ?? null,
      is_verified:        profile.is_verified,
      stats: {
        contratos_completados: parseInt(stats?.completados ?? '0', 10),
        influencers_contratados: parseInt(stats?.influencers ?? '0', 10),
        disputas: parseInt(stats?.disputas ?? '0', 10),
      },
    };
  }
}
