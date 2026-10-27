import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentReceipt, PaymentReceiptType } from './entities/payment-receipt.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DteService } from '../dte/dte.service';
import { DteDocument } from '../dte/entities/dte-document.entity';

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
    @InjectRepository(DteDocument)
    private readonly dteRepo: Repository<DteDocument>,
    private readonly notifications: NotificationsService,
    private readonly dteService: DteService,
  ) {}

  async createCreditsTopUp(
    empresaId: number,
    amountUsd: number,
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
    const base = {
      wompi_transaction_id: transactionId,
      empresa_id: contrato.empresa_id,
      influencer_id: contrato.influencer_id,
      contrato_id: contrato.id,
      amount_usd: amountUsd,
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
    const existing = await this.receiptsRepo.findOne({
      where: {
        operation_type: 'influencer_payout',
        operation_reference: `payout-contrato-${contrato.id}-${transactionId}`,
      },
    });
    if (existing) return existing;

    const receipt = await this.createOnce({
      operation_type: 'influencer_payout',
      operation_reference: `payout-contrato-${contrato.id}-${transactionId}`,
      wompi_transaction_id: transactionId,
      empresa_id: contrato.empresa_id,
      influencer_id: contrato.influencer_id,
      contrato_id: contrato.id,
      amount_usd: amountUsd,
      customer_snapshot: this.influencerSnapshot(contrato.influencer),
      metadata: { payout_status: 'accepted_by_wompi' },
    });
    let developmentDte: { numeroControl: string; codigoGeneracion: string; pdfUrl: string } | null = null;
    if (this.dteService.isDevelopmentMode()) {
      developmentDte = await this.dteService.createDevelopmentPayoutDte({
        receiptId: receipt.id,
        receiptNumber: receipt.receipt_number,
        transactionId,
        contractId: contrato.id,
        amountUsd,
        influencerName: contrato.influencer.nombre_artistico,
        influencerEmail: contrato.influencer.user?.email ?? '',
        document: contrato.influencer.numero_identificacion ?? null,
      });
    }
    receipt.factura_enviada = await this.notifications.sendInfluencerPayoutReceipt({
      email: contrato.influencer.user?.email ?? '',
      influencerName: contrato.influencer.nombre_artistico,
      receiptNumber: receipt.receipt_number,
      amountUsd,
      transactionId,
      contractId: contrato.id,
      isFiscalDte: receipt.is_fiscal_dte,
      developmentDteNumber: developmentDte?.numeroControl,
      developmentDtePdfPath: developmentDte?.pdfUrl
        ? join(process.cwd(), developmentDte.pdfUrl.replace(/^\/api\/uploads\//, 'uploads/'))
        : undefined,
    });
    await this.receiptsRepo.save(receipt);
    return receipt;
  }

  async listForUser(user: User): Promise<PaymentReceipt[]> {
    if (user.role === 'empresa') {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
      return this.withDteData(await this.receiptsRepo.find({ where: { empresa_id: empresa.id }, order: { created_at: 'DESC' } }));
    }
    if (user.role === 'influencer') {
      const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
      if (!influencer) throw new NotFoundException('Perfil de influencer no encontrado.');
      return this.withDteData(await this.receiptsRepo.find({ where: { influencer_id: influencer.id }, order: { created_at: 'DESC' } }));
    }
    return [];
  }

  async findForUser(user: User, id: number): Promise<PaymentReceipt> {
    let ownerField: 'empresa_id' | 'influencer_id';
    let ownerId: number;

    if (user.role === 'empresa') {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');
      ownerField = 'empresa_id';
      ownerId = empresa.id;
    } else if (user.role === 'influencer') {
      const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
      if (!influencer) throw new NotFoundException('Perfil de influencer no encontrado.');
      ownerField = 'influencer_id';
      ownerId = influencer.id;
    } else {
      throw new NotFoundException('Comprobante no encontrado.');
    }

    const receipt = await this.receiptsRepo.findOne({
      where: { id, [ownerField]: ownerId },
    });
    if (!receipt) throw new NotFoundException('Comprobante no encontrado.');

    const [enriched] = await this.withDteData([receipt]);
    return enriched;
  }

  private async createOnce(data: Omit<PaymentReceipt, 'id' | 'receipt_number' | 'created_at' | 'currency' | 'is_fiscal_dte' | 'factura_enviada' | 'issuer_snapshot'>): Promise<PaymentReceipt> {
    const existing = await this.receiptsRepo.findOne({
      where: { operation_type: data.operation_type, operation_reference: data.operation_reference },
    });
    if (existing) return existing;
    const receipt = this.receiptsRepo.create({
      ...data,
      receipt_number: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      currency: 'USD',
      is_fiscal_dte: false,
      issuer_snapshot: INTERNAL_ISSUER,
    });
    return this.receiptsRepo.save(receipt);
  }

  private async withDteData(receipts: PaymentReceipt[]) {
    if (!receipts.length) return receipts;
    const dtes = await this.dteRepo
      .createQueryBuilder('dte')
      .where('dte.payment_receipt_id IN (:...receiptIds)', { receiptIds: receipts.map((receipt) => receipt.id) })
      .getMany();
    const byReceipt = new Map(dtes.map((dte) => [dte.payment_receipt_id, dte]));
    const enriched = await Promise.all(receipts.map(async (receipt) => {
      const dte = byReceipt.get(receipt.id);
      if (dte && this.dteService.isDevelopmentMode()) {
        const influencer = receipt.influencer_id
          ? await this.influencersRepo.findOne({ where: { id: receipt.influencer_id } })
          : null;
        const source = dte.json_original as { receptor?: { documento?: string | null } };
        if (influencer?.numero_identificacion && !source.receptor?.documento) {
          dte.json_original = {
            ...dte.json_original,
            receptor: {
              ...(source.receptor ?? {}),
              documento: influencer.numero_identificacion,
            },
          };
        }
        await this.dteService.ensureDevelopmentPdf(
          dte,
          receipt.contrato_id,
          influencer?.numero_identificacion ?? source.receptor?.documento ?? null,
        );
      }
      return Object.assign(receipt, {
        dte: dte ? {
          numero_control: dte.numero_control,
          codigo_generacion: dte.codigo_generacion,
          estado: dte.estado,
          ambiente: dte.ambiente,
          fecha_emision: dte.fecha_emision,
          pdf_url: dte.pdf_url,
        } : null,
      });
    }));
    return enriched;
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

}
