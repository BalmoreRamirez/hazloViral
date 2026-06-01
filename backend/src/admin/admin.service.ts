import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalSetting } from './entities/global-setting.entity';

// Valores por defecto según claude.md §5.1
const DEFAULTS: { key: string; value: string; description: string }[] = [
  { key: 'chat_open_cost', value: '1.00', description: 'Créditos que consume abrir un chat (configurable por Admin)' },
  { key: 'platform_commission_pct', value: '10.00', description: 'Comisión de la plataforma sobre contratos (%)' },
  { key: 'welcome_bonus', value: '10.00', description: 'Bono de bienvenida en créditos para empresas nuevas' },
  { key: 'min_credit_threshold', value: '5.00', description: 'Umbral mínimo de créditos; por debajo los chats quedan en solo lectura' },
];

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(GlobalSetting)
    private readonly settingsRepo: Repository<GlobalSetting>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaults();
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    return setting?.value ?? null;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.get(key);
    const parsed = parseFloat(raw ?? '');
    return isNaN(parsed) ? fallback : parsed;
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

  async findAll(): Promise<GlobalSetting[]> {
    return this.settingsRepo.find({ order: { key: 'ASC' } });
  }

  private async seedDefaults(): Promise<void> {
    for (const def of DEFAULTS) {
      const exists = await this.settingsRepo.existsBy({ key: def.key });
      if (!exists) {
        await this.settingsRepo.save(this.settingsRepo.create(def));
      }
    }
  }
}
