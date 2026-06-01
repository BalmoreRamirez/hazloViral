import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { AdminService } from '../admin/admin.service';

export interface BalanceInfo {
  empresa_id: number;
  balance_creditos: number;
  umbral_creditos: number;
  is_above_threshold: boolean;
  deficit: number; // 0 si está OK, positivo si le faltan créditos
}

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(EmpresaProfile)
    private readonly empresasRepo: Repository<EmpresaProfile>,
    private readonly adminService: AdminService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Consulta de saldo ────────────────────────────────────────────────────────
  async getBalance(userId: number): Promise<BalanceInfo> {
    const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
    return this.buildBalanceInfo(empresa);
  }

  async getBalanceByEmpresaId(empresaId: number): Promise<BalanceInfo> {
    const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    return this.buildBalanceInfo(empresa);
  }

  // ─── Verificación de umbral (claude.md §5.1) ──────────────────────────────────
  async isAboveThreshold(empresaId: number): Promise<boolean> {
    const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
    if (!empresa) return false;
    return Number(empresa.balance_creditos) > Number(empresa.umbral_creditos);
  }

  // ─── Debitar créditos al abrir chat (claude.md §5.1) ─────────────────────────
  async deductChatOpenCost(empresaId: number): Promise<BalanceInfo> {
    const cost = await this.adminService.getNumber('chat_open_cost', 1.0);

    return this.dataSource.transaction(async (manager) => {
      // SELECT FOR UPDATE — evita condición de carrera
      const empresa = await manager
        .getRepository(EmpresaProfile)
        .createQueryBuilder('e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: empresaId })
        .getOne();

      if (!empresa) throw new NotFoundException('Empresa no encontrada.');

      const balance = Number(empresa.balance_creditos);
      const umbral = Number(empresa.umbral_creditos);

      if (balance < cost) {
        throw new BadRequestException(
          `Saldo insuficiente. Necesitas ${cost} créditos pero tienes ${balance}.`,
        );
      }

      empresa.balance_creditos = parseFloat((balance - cost).toFixed(2));
      await manager.save(empresa);

      return this.buildBalanceInfo(empresa);
    });
  }

  // ─── Agregar créditos (llamado por Stripe webhook en Parte 7) ─────────────────
  async addCredits(empresaId: number, amount: number): Promise<BalanceInfo> {
    if (amount <= 0) throw new BadRequestException('El monto debe ser positivo.');

    return this.dataSource.transaction(async (manager) => {
      const empresa = await manager
        .getRepository(EmpresaProfile)
        .createQueryBuilder('e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: empresaId })
        .getOne();

      if (!empresa) throw new NotFoundException('Empresa no encontrada.');

      empresa.balance_creditos = parseFloat(
        (Number(empresa.balance_creditos) + amount).toFixed(2),
      );
      await manager.save(empresa);

      return this.buildBalanceInfo(empresa);
    });
  }

  // ─── Actualizar umbral de seguridad ───────────────────────────────────────────
  async updateThreshold(empresaId: number, newThreshold: number): Promise<BalanceInfo> {
    if (newThreshold < 0) throw new BadRequestException('El umbral no puede ser negativo.');
    const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    empresa.umbral_creditos = newThreshold;
    await this.empresasRepo.save(empresa);
    return this.buildBalanceInfo(empresa);
  }

  // ─── Helper ───────────────────────────────────────────────────────────────────
  private buildBalanceInfo(empresa: EmpresaProfile): BalanceInfo {
    const balance = Number(empresa.balance_creditos);
    const umbral = Number(empresa.umbral_creditos);
    const isAbove = balance > umbral;
    return {
      empresa_id: empresa.id,
      balance_creditos: balance,
      umbral_creditos: umbral,
      is_above_threshold: isAbove,
      deficit: isAbove ? 0 : parseFloat((umbral - balance).toFixed(2)),
    };
  }
}
