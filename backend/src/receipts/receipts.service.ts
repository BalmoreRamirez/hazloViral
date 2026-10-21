import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentReceipt, PaymentReceiptType } from './entities/payment-receipt.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { User } from '../users/entities/user.entity';

const INTERNAL_ISSUER = {
  name: 'InfluSmart',
  nit: null,
  nrc: null,
  address: null,
  note: 'Comprobante interno no fiscal. No sustituye un DTE autorizado por el Ministerio de Hacienda.',
};

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(PaymentReceipt)
    private readonly receiptsRepo: Repository<PaymentReceipt>,
    @InjectRepository(EmpresaProfile)
    private readonly empresasRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencersRepo: Repository<InfluencerProfile>,
    @InjectRepository(ContratoEscrow)
    private readonly contratosRepo: Repository<ContratoEscrow>,
  ) {}

  async createCreditsTopUp(
    empresaId: number,
    amountUsd: number,
    amountCop: number,
    transactionId: string,
  ): Promise<PaymentReceipt> {
    const empresa = await this.empresasRepo.findOne({
      where: { id: empresaId },
      relations: { user: true },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    return this.createOnce({
      operation_type: 'credits_top_up',
      operation_reference: `creditos-${transactionId}`,
      wompi_transaction_id: transactionId,
      empresa_id: empresa.id,
      influencer_id: null,
      contrato_id: null,
      amount_usd: amountUsd,
      amount_cop: amountCop,
      customer_snapshot: this.companySnapshot(empresa),
      metadata: { credit_amount: amountUsd },
    });
  }

  async createEscrowReceipts(contratoId: number, transactionId: string): Promise<void> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { empresa: { user: true }, influencer: { user: true } },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');

    const amountUsd = Number(contrato.monto_total);
    const amountCop = Number((amountUsd * this.usdToCop()).toFixed(2));
    const base = {
      wompi_transaction_id: transactionId,
      empresa_id: contrato.empresa_id,
      influencer_id: contrato.influencer_id,
      contrato_id: contrato.id,
      amount_usd: amountUsd,
      amount_cop: amountCop,
      customer_snapshot: this.companySnapshot(contrato.empresa),
    };

    await this.createOnce({
      ...base,
      operation_type: 'escrow_funding',
      operation_reference: `contrato-${contrato.id}-${transactionId}`,
      metadata: { escrow_status: 'funded_in_escrow' },
    });

    const commission = Number(contrato.comision_plataforma);
    if (commission > 0) {
      await this.createOnce({
        ...base,
        operation_type: 'platform_commission',
        operation_reference: `comision-contrato-${contrato.id}-${transactionId}`,
        amount_usd: commission,
        amount_cop: Number((commission * this.usdToCop()).toFixed(2)),
        metadata: { included_in_escrow_funding: true },
      });
    }
  }

  async createInfluencerPayout(contratoId: number, transactionId: string): Promise<PaymentReceipt> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { empresa: { user: true }, influencer: { user: true } },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    const amountUsd = Number(contrato.monto_total) - Number(contrato.comision_plataforma);
    return this.createOnce({
      operation_type: 'influencer_payout',
      operation_reference: `payout-contrato-${contrato.id}-${transactionId}`,
      wompi_transaction_id: transactionId,
      empresa_id: contrato.empresa_id,
      influencer_id: contrato.influencer_id,
      contrato_id: contrato.id,
      amount_usd: amountUsd,
      amount_cop: Number((amountUsd * this.usdToCop()).toFixed(2)),
      customer_snapshot: this.influencerSnapshot(contrato.influencer),
      metadata: { payout_status: 'accepted_by_wompi' },
    });
  }

  async listForUser(user: User): Promise<PaymentReceipt[]> {
    if (user.role === 'empresa') {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
      return this.receiptsRepo.find({ where: { empresa_id: empresa.id }, order: { created_at: 'DESC' } });
    }
    if (user.role === 'influencer') {
      const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
      if (!influencer) throw new NotFoundException('Perfil de influencer no encontrado.');
      return this.receiptsRepo.find({ where: { influencer_id: influencer.id }, order: { created_at: 'DESC' } });
    }
    return [];
  }

  async findForUser(user: User, id: number): Promise<PaymentReceipt> {
    const receipt = await this.receiptsRepo.findOne({ where: { id } });
    if (!receipt) throw new NotFoundException('Comprobante no encontrado.');
    const receipts = await this.listForUser(user);
    if (!receipts.some((item) => item.id === receipt.id)) {
      throw new NotFoundException('Comprobante no encontrado.');
    }
    return receipt;
  }

  private async createOnce(data: Omit<PaymentReceipt, 'id' | 'receipt_number' | 'created_at' | 'currency' | 'is_fiscal_dte' | 'issuer_snapshot'>): Promise<PaymentReceipt> {
    const existing = await this.receiptsRepo.findOne({
      where: { operation_type: data.operation_type, operation_reference: data.operation_reference },
    });
    if (existing) return existing;
    const receipt = this.receiptsRepo.create({
      ...data,
      receipt_number: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      currency: 'COP',
      is_fiscal_dte: false,
      issuer_snapshot: INTERNAL_ISSUER,
    });
    return this.receiptsRepo.save(receipt);
  }

  private companySnapshot(empresa: EmpresaProfile): Record<string, string | null> {
    return {
      name: empresa.razon_social || empresa.nombre_comercial,
      email: empresa.user?.email ?? null,
      nit: empresa.nit ?? null,
      nrc: empresa.nrc ?? null,
      address: empresa.direccion ?? null,
    };
  }

  private influencerSnapshot(influencer: InfluencerProfile): Record<string, string | null> {
    return {
      name: influencer.nombre_artistico,
      email: influencer.user?.email ?? null,
      document: influencer.numero_identificacion ?? null,
    };
  }

  private usdToCop(): number {
    return Number(process.env.WOMPI_USD_TO_COP ?? 4000);
  }
}
