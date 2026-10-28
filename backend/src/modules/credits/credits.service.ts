import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReceiptsService } from '../receipts/receipts.service';
import { ElectronicInvoicingService } from '../electronic-invoicing/electronic-invoicing.service';
import { randomUUID } from 'crypto';
import { PaymentReceipt } from '../receipts/entities/payment-receipt.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
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
    @InjectRepository(CompanyProfile)
    private readonly empresasRepo: Repository<CompanyProfile>,
    private readonly adminService: AdminService,
    private readonly dataSource: DataSource,
    private readonly dteService: ElectronicInvoicingService,
    private readonly receiptsService: ReceiptsService,
  ) {}

  // ─── Consulta de saldo ────────────────────────────────────────────────────────
  async getBalance(userId: number): Promise<BalanceInfo> {
    const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
    const threshold = await this.adminService.getNumber('min_credit_threshold', Number(empresa.umbral_creditos));
    return this.buildBalanceInfo(empresa, threshold);
  }

  async getBalanceByEmpresaId(empresaId: number): Promise<BalanceInfo> {
    const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    const threshold = await this.adminService.getNumber('min_credit_threshold', Number(empresa.umbral_creditos));
    return this.buildBalanceInfo(empresa, threshold);
  }

  // ─── Verificación de umbral (claude.md §5.1) ──────────────────────────────────
  async isAboveThreshold(empresaId: number): Promise<boolean> {
    const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
    if (!empresa) return false;
    const threshold = await this.adminService.getNumber('min_credit_threshold', Number(empresa.umbral_creditos));
    return Number(empresa.balance_creditos) > threshold;
  }

  /** Costo actual de abrir un chat nuevo (configurable por el admin en global_settings). */
  getChatOpenCost(): Promise<number> {
    return this.adminService.getNumber('chat_open_cost', 1.0);
  }

  // ─── Debitar créditos al abrir chat (claude.md §5.1) ─────────────────────────
  async deductChatOpenCost(empresaId: number): Promise<BalanceInfo> {
    const [cost, threshold] = await Promise.all([
      this.adminService.getNumber('chat_open_cost', 1.0),
      this.adminService.getNumber('min_credit_threshold', 5.0),
    ]);

    return this.dataSource.transaction(async (manager) => {
      // SELECT FOR UPDATE — evita condición de carrera
      const empresa = await manager
        .getRepository(CompanyProfile)
        .createQueryBuilder('e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: empresaId })
        .getOne();

      if (!empresa) throw new NotFoundException('Empresa no encontrada.');

      const balance = Number(empresa.balance_creditos);
      if (balance <= threshold) {
        throw new BadRequestException(
          `Saldo insuficiente. Necesitas superar el umbral de ${threshold} créditos para iniciar chats. Saldo actual: ${balance}.`,
        );
      }

      if (balance < cost) {
        throw new BadRequestException(
          `Saldo insuficiente. Necesitas ${cost} créditos pero tienes ${balance}.`,
        );
      }

      empresa.balance_creditos = parseFloat((balance - cost).toFixed(2));
      await manager.save(empresa);

      return this.buildBalanceInfo(empresa, threshold);
    });
  }

  // ─── Agregar créditos (llamado por Stripe webhook en Parte 7) ─────────────────
  async addCredits(empresaId: number, amount: number, simulationReference?: string): Promise<BalanceInfo> {
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('El monto debe ser positivo.');
    const threshold = await this.adminService.getNumber('min_credit_threshold', 5.0);

    let receiptId: number | null = null;
    const result = await this.dataSource.transaction(async (manager) => {
      const empresa = await manager
        .getRepository(CompanyProfile)
        .createQueryBuilder('e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: empresaId })
        .getOne();

      if (!empresa) throw new NotFoundException('Empresa no encontrada.');

      empresa.balance_creditos = parseFloat(
        (Number(empresa.balance_creditos) + amount).toFixed(2),
      );
      await manager.save(empresa);
      if (simulationReference) {
        const receipts = manager.getRepository(PaymentReceipt);
        const receipt = await receipts.save(receipts.create({
          receipt_number: `REC-DEV-${randomUUID().replace(/-/g, '').slice(0, 20)}`,
          operation_type: 'credits_top_up',
          operation_reference: simulationReference,
          wompi_transaction_id: simulationReference,
          empresa_id: empresa.id,
          influencer_id: null,
          contrato_id: null,
          amount_usd: amount,
          currency: 'USD',
          issuer_snapshot: { name: 'InfluSmart', note: 'Comprobante interno de recarga simulada. Sin validez fiscal.' },
          customer_snapshot: { name: empresa.razon_social || empresa.nombre_comercial, nit: empresa.nit ?? null, nrc: empresa.nrc ?? null, address: empresa.direccion ?? null },
          metadata: { credit_amount: amount, simulated: true },
          is_fiscal_dte: false,
          factura_enviada: false,
        }));
        receiptId = receipt.id;
        if (this.dteService.isDevelopmentMode()) {
          await this.dteService.createDevelopmentPayoutDte({
            receiptId: receipt.id, receiptNumber: receipt.receipt_number,
            transactionId: simulationReference, contractId: null, operation: 'credits_top_up',
            amountUsd: amount, influencerName: empresa.razon_social || empresa.nombre_comercial,
            influencerEmail: '', document: empresa.nit ?? null,
          }, manager);
        }
      }

      return this.buildBalanceInfo(empresa, threshold);
    });
    if (receiptId !== null) await this.receiptsService.sendCreditsTopUpInvoice(receiptId);
    return result;
  }

  async addCreditsForUser(userId: number, amount: number): Promise<BalanceInfo> {
    const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
    return this.addCredits(empresa.id, amount, `dev-creditos-${randomUUID()}`);
  }

  // ─── Actualizar umbral de seguridad ───────────────────────────────────────────
  async updateThreshold(empresaId: number, newThreshold: number): Promise<BalanceInfo> {
    if (newThreshold < 0) throw new BadRequestException('El umbral no puede ser negativo.');
    const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    empresa.umbral_creditos = newThreshold;
    await this.empresasRepo.save(empresa);
    const threshold = await this.adminService.getNumber('min_credit_threshold', newThreshold);
    return this.buildBalanceInfo(empresa, threshold);
  }

  // ─── Helper ───────────────────────────────────────────────────────────────────
  private buildBalanceInfo(empresa: CompanyProfile, configuredThreshold = Number(empresa.umbral_creditos)): BalanceInfo {
    const balance = Number(empresa.balance_creditos);
    const umbral = configuredThreshold;
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
