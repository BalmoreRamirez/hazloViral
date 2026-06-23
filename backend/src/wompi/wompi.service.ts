import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { Message } from '../chats/entities/message.entity';
import { ChatGateway } from '../chats/chats.gateway';
import { CreditsService } from '../credits/credits.service';
import { ContratoStatus, ProposalStatus } from '../common/enums';

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integrityKey: string;
  private readonly eventsKey: string;
  private readonly frontendUrl: string;
  private readonly usdToCop: number;
  private readonly currency = 'COP';
  private readonly checkoutBaseUrl = 'https://checkout.wompi.co/p/';

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(EmpresaProfile)
    private readonly empresasRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencersRepo: Repository<InfluencerProfile>,
    @InjectRepository(ContratoEscrow)
    private readonly contratosRepo: Repository<ContratoEscrow>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    private readonly chatGateway: ChatGateway,
    private readonly creditsService: CreditsService,
  ) {
    const mode = config.get<string>('FORMA_PAGO', 'desarrollo');
    const prefix = mode === 'produccion' ? 'WOMPI_PROD' : 'WOMPI_DEV';

    this.publicKey    = config.get<string>(`${prefix}_PUBLIC_KEY`)    ?? '';
    this.privateKey   = config.get<string>(`${prefix}_PRIVATE_KEY`)   ?? '';
    this.integrityKey = config.get<string>(`${prefix}_INTEGRITY_KEY`) ?? '';
    this.eventsKey    = config.get<string>(`${prefix}_EVENTS_KEY`)    ?? '';
    this.frontendUrl  = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    this.usdToCop     = Number(config.get<string>('WOMPI_USD_TO_COP', '4000'));

    this.logger.log(`Wompi inicializado en modo: ${mode.toUpperCase()}`);
  }

  // ─── 1. Checkout: empresa recarga créditos ───────────────────────────────────
  async createCreditsPaymentLink(
    userId: number,
    amountUsd: number,
  ): Promise<{ url: string; reference: string }> {
    const empresa = await this.empresasRepo.findOne({
      where: { user_id: userId },
      relations: { user: true },
    });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');

    const reference     = `creditos-${empresa.id}-${Date.now()}`;
    const amountCentavos = Math.round(amountUsd * this.usdToCop * 100);
    const redirectUrl   = `${this.frontendUrl}/dashboard?wompi=success&tipo=creditos`;
    const signature     = this.generateIntegritySignature(reference, amountCentavos);

    const url = this.buildCheckoutUrl({
      reference,
      amountInCents: amountCentavos,
      redirectUrl,
      signature,
      customerEmail: empresa.user.email,
    });

    this.logger.log(`Checkout créditos creado — ref: ${reference}, monto: ${amountCentavos} centavos`);
    return { url, reference };
  }

  // ─── 2. Checkout: empresa fonda contrato en custodia ────────────────────────
  async createContractPaymentLink(
    contratoId: number,
    userId: number,
  ): Promise<{ url: string; reference: string }> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { empresa: { user: true } },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (contrato.status !== ContratoStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `El contrato no está en estado pending_payment. Estado: ${contrato.status}`,
      );
    }

    const empresa = contrato.empresa;
    if (!empresa || empresa.user_id !== userId) {
      throw new NotFoundException('No autorizado para fondear este contrato.');
    }

    const reference      = `contrato-${contratoId}-${Date.now()}`;
    const amountCentavos = Math.round(Number(contrato.monto_total) * this.usdToCop * 100);
    const redirectUrl    = `${this.frontendUrl}/contratos/${contratoId}?wompi=success`;
    const signature      = this.generateIntegritySignature(reference, amountCentavos);

    const url = this.buildCheckoutUrl({
      reference,
      amountInCents: amountCentavos,
      redirectUrl,
      signature,
      customerEmail: empresa.user.email,
    });

    this.logger.log(`Checkout contrato creado — ref: ${reference}, monto: ${amountCentavos} centavos`);
    return { url, reference };
  }

  // ─── 3. Webhook: recibe y procesa eventos de Wompi ──────────────────────────
  async handleWebhook(body: Record<string, any>): Promise<{ received: boolean }> {
    if (!this.verifyWebhookSignature(body)) {
      this.logger.error('Firma de webhook Wompi inválida');
      throw new BadRequestException('Firma del webhook inválida.');
    }

    const eventName: string = body['event'] ?? '';
    this.logger.log(`Webhook Wompi recibido: ${eventName}`);

    if (eventName === 'transaction.updated') {
      const tx = body['data']?.['transaction'];
      if (tx?.['status'] === 'APPROVED') {
        await this.handleApprovedTransaction(tx);
      }
    }

    return { received: true };
  }

  // ─── 4. Simulación de pago (solo FORMA_PAGO=desarrollo) ────────────────────
  async simulateFund(
    contratoId: number,
    userId: number,
  ): Promise<ContratoEscrow> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { empresa: true },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (contrato.empresa?.user_id !== userId) {
      throw new ForbiddenException('No autorizado para fondear este contrato.');
    }
    const result = await this.applyContractFunding(contratoId, `dev-simulate-${Date.now()}`);
    if (!result) throw new BadRequestException('El contrato no está en estado pending_payment.');
    this.logger.log(`Pago simulado para contrato ${contratoId} (modo desarrollo)`);
    return result;
  }

  // ─── 5. Payout al influencer (requiere cuenta bancaria — pendiente) ──────────
  async disbursementToInfluencer(contratoId: number): Promise<string | null> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { influencer: { user: true } },
    });
    if (!contrato) return null;

    // La API de Dispersiones de Wompi requiere que el influencer tenga
    // registrada su cuenta bancaria colombiana. Se implementará en fase 2.
    this.logger.warn(
      `Payout pendiente para contrato ${contratoId}. ` +
        `El influencer debe registrar su cuenta bancaria para usar Wompi Dispersiones.`,
    );
    return null;
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────
  private generateIntegritySignature(
    reference: string,
    amountInCents: number,
  ): string {
    const data = `${reference}${amountInCents}${this.currency}${this.integrityKey}`;
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private buildCheckoutUrl(params: {
    reference: string;
    amountInCents: number;
    redirectUrl: string;
    signature: string;
    customerEmail?: string;
  }): string {
    const qs = new URLSearchParams({
      'public-key':         this.publicKey,
      currency:             this.currency,
      'amount-in-cents':    String(params.amountInCents),
      reference:            params.reference,
      'redirect-url':       params.redirectUrl,
      'signature:integrity': params.signature,
    });
    if (params.customerEmail) {
      qs.set('customer-data:email', params.customerEmail);
    }
    return `${this.checkoutBaseUrl}?${qs.toString()}`;
  }

  // Verificación de firma según docs Wompi:
  // checksum = SHA256( values_of_listed_properties + timestamp + events_key )
  private verifyWebhookSignature(body: Record<string, any>): boolean {
    try {
      const timestamp: number = body['timestamp'];
      const signature = body['signature'] as {
        checksum: string;
        properties: string[];
      };
      const data = body['data'] ?? {};

      const propValues = signature.properties.map((path) => {
        const parts = path.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return parts.reduce((obj: any, key: string) => obj?.[key], data);
      });

      const checksumStr = [...propValues, timestamp, this.eventsKey].join('');
      const computed = crypto
        .createHash('sha256')
        .update(checksumStr, 'utf8')
        .digest('hex');

      return computed === signature.checksum;
    } catch {
      return false;
    }
  }

  private async handleApprovedTransaction(tx: Record<string, any>): Promise<void> {
    const reference: string = String(tx['reference'] ?? '');

    // ── Pago de créditos ────────────────────────────────────────────────────────
    if (reference.startsWith('creditos-')) {
      const parts     = reference.split('-');
      const empresaId = Number(parts[1]);
      const amountCop = Number(tx['amount_in_cents']) / 100;
      // Convertir COP pagados de regreso a unidades de crédito (1 crédito = 1 USD equiv.)
      const credits   = Math.round(amountCop / this.usdToCop);
      await this.creditsService.addCredits(empresaId, credits);
      this.logger.log(
        `Créditos añadidos — empresa ${empresaId}: ${credits} créditos (${amountCop} COP)`,
      );
    }

    // ── Fondeo de contrato ──────────────────────────────────────────────────────
    if (reference.startsWith('contrato-')) {
      const parts      = reference.split('-');
      const contratoId = Number(parts[1]);
      await this.applyContractFunding(contratoId, String(tx['id']));
    }
  }

  // Lógica central de fondeo — reutilizada por webhook y por simulación dev
  private async applyContractFunding(
    contratoId: number,
    transactionId: string,
  ): Promise<ContratoEscrow | null> {
    const contrato = await this.contratosRepo.findOne({ where: { id: contratoId } });
    if (!contrato || contrato.status !== ContratoStatus.PENDING_PAYMENT) return null;

    contrato.status           = ContratoStatus.FUNDED_IN_ESCROW;
    contrato.stripe_charge_id = transactionId; // campo reutilizado para el ID de transacción Wompi
    await this.contratosRepo.save(contrato);
    this.logger.log(`Contrato ${contratoId} fondeado — txId: ${transactionId}`);

    const msg = await this.messagesRepo.findOne({
      where: { contrato_id: contrato.id, is_proposal: true },
    });
    if (msg) {
      msg.proposal_status = ProposalStatus.FUNDED;
      await this.messagesRepo.save(msg);
    }

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_funded', {
      contrato_id:         contrato.id,
      proposal_message_id: msg?.id ?? null,
      message:             'El pago está en custodia. Puedes comenzar a trabajar de forma segura.',
    });

    return contrato;
  }
}
