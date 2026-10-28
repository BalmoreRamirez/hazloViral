import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { GlobalSetting } from './entities/global-setting.entity';
import { EscrowContract } from '../contracts/entities/escrow-contract.entity';
import { User } from '../users/entities/user.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { UserRole, ContractStatus } from '../../common/enums';

// Valores por defecto según claude.md §5.1
const DEFAULTS: { key: string; value: string; description: string }[] = [
  { key: 'chat_open_cost',          value: '1.00',  description: 'Créditos que consume abrir un chat' },
  { key: 'platform_commission_pct', value: '10.00', description: 'Comisión de la plataforma sobre contratos (%)' },
  { key: 'welcome_bonus',           value: '10.00', description: 'Bono de bienvenida en créditos para empresas nuevas' },
  { key: 'min_credit_threshold',    value: '5.00',  description: 'Umbral mínimo; por debajo los chats quedan en solo lectura' },
];

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(GlobalSetting)
    private readonly settingsRepo: Repository<GlobalSetting>,
    @InjectRepository(EscrowContract)
    private readonly contratosRepo: Repository<EscrowContract>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(CompanyProfile)
    private readonly empresasRepo: Repository<CompanyProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencersRepo: Repository<InfluencerProfile>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaults();
    await this.seedDemoUsers();
  }

  // ─── Global Settings ──────────────────────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    return setting?.value ?? null;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.get(key);
    const parsed = parseFloat(raw ?? '');
    return isNaN(parsed) ? fallback : parsed;
  }

  async findAll(): Promise<GlobalSetting[]> {
    return this.settingsRepo.find({ order: { key: 'ASC' } });
  }

  async set(key: string, value: string, description?: string): Promise<GlobalSetting> {
    const existing = await this.settingsRepo.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      if (description) existing.description = description;
      return this.settingsRepo.save(existing);
    }
    return this.settingsRepo.save(
      this.settingsRepo.create({ key, value, description: description ?? '' }),
    );
  }

  // ─── Usuarios ─────────────────────────────────────────────────────────────────
  async listUsers(): Promise<any[]> {
    const users = await this.usersRepo.find({
      order: { created_at: 'DESC' },
      select: { id: true, email: true, role: true, is_active: true, created_at: true,
                stripe_customer_id: true, stripe_connect_id: true },
    });

    return Promise.all(
      users.map(async (u) => {
        let profile: any = null;
        if (u.role === UserRole.EMPRESA) {
          profile = await this.empresasRepo.findOne({ where: { user_id: u.id } });
        } else if (u.role === UserRole.INFLUENCER) {
          profile = await this.influencersRepo.findOne({ where: { user_id: u.id } });
        }
        return { ...u, profile };
      }),
    );
  }

  async setUserStatus(id: number, is_active: boolean): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    user.is_active = is_active;
    return this.usersRepo.save(user);
  }

  // ─── Incumplimientos ──────────────────────────────────────────────────────────
  async listIncumplimientos(): Promise<EscrowContract[]> {
    return this.contratosRepo.find({
      where: { status: ContractStatus.INCUMPLIMIENTO },
      relations: { empresa: true, influencer: true },
      order: { updated_at: 'DESC' },
    });
  }

  async resolveIncumplimiento(id: number, resolucion: string): Promise<EscrowContract> {
    const contrato = await this.contratosRepo.findOne({ where: { id } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    contrato.resolucion_admin   = resolucion;
    contrato.resuelto_por_admin = true;
    return this.contratosRepo.save(contrato);
  }

  // ─── Estadísticas globales ────────────────────────────────────────────────────
  async getStats(): Promise<Record<string, number>> {
    const [users, empresas, influencers, contratos, incumplimientos] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { role: UserRole.EMPRESA } }),
      this.usersRepo.count({ where: { role: UserRole.INFLUENCER } }),
      this.contratosRepo.count(),
      this.contratosRepo.count({ where: { status: ContractStatus.INCUMPLIMIENTO, resuelto_por_admin: false } }),
    ]);
    return { users, empresas, influencers, contratos, incumplimientos };
  }

  // ─── Seeds ────────────────────────────────────────────────────────────────────
  private async seedDefaults(): Promise<void> {
    for (const def of DEFAULTS) {
      const exists = await this.settingsRepo.existsBy({ key: def.key });
      if (!exists) await this.settingsRepo.save(this.settingsRepo.create(def));
    }
  }

  private async seedDemoUsers(): Promise<void> {
    const password = await bcrypt.hash('Admin123!', 10);

    const admin = await this.upsertSeedUser('hazloviral@yopmail.com', UserRole.ADMIN, password);
    this.logger.log(`Usuario admin disponible: ${admin.email}`);

    const empresa = await this.upsertSeedUser('nique@yopmail.com', UserRole.EMPRESA, password);
    let empresaProfile = await this.empresasRepo.findOne({ where: { user_id: empresa.id } });
    if (!empresaProfile) {
      empresaProfile = this.empresasRepo.create({
        user_id: empresa.id,
        nombre_comercial: 'Nique',
        telefono: '+503 7000-0000',
        representante_nombre: 'Nique',
        representante_tipo_identificacion: 'DUI',
        representante_numero_identificacion: '00000000-0',
        balance_creditos: 10,
        umbral_creditos: 5,
      });
      await this.empresasRepo.save(empresaProfile);
    }
    this.logger.log(`Usuario empresa disponible: ${empresa.email}`);

    const influencer = await this.upsertSeedUser('mike@yopmail.com', UserRole.INFLUENCER, password);
    let influencerProfile = await this.influencersRepo.findOne({ where: { user_id: influencer.id } });
    if (!influencerProfile) {
      influencerProfile = this.influencersRepo.create({
        user_id: influencer.id,
        username: 'mike',
        nombre_artistico: 'Mike',
        fecha_nacimiento: '1995-01-01',
        tipo_identificacion: 'DUI',
        numero_identificacion: '00000000-0',
      });
      await this.influencersRepo.save(influencerProfile);
    }
    this.logger.log(`Usuario influencer disponible: ${influencer.email}`);
  }

  private async upsertSeedUser(email: string, role: UserRole, password: string): Promise<User> {
    let user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      user = this.usersRepo.create({ email, role, password });
    } else {
      user.role = role;
      user.password = password;
      user.is_active = true;
    }
    return this.usersRepo.save(user);
  }
}
