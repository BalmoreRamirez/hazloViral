import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import StripeLib from 'stripe';
import { User } from '../users/entities/user.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { CreditsService } from '../credits/credits.service';
import { ContratoStatus } from '../common/enums';

// Con module:nodenext + Stripe v22 (export=), el tipo instancia es ReturnType del constructor
type StripeInstance = ReturnType<typeof StripeLib>;

@Injectable()
export class StripeService {
  private readonly stripe: StripeInstance;
  private readonly logger = new Logger(StripeService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EmpresaProfile) private readonly empresasRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile) private readonly influencersRepo: Repository<InfluencerProfile>,
    @InjectRepository(ContratoEscrow) private readonly contratosRepo: Repository<ContratoEscrow>,
    private readonly creditsService: CreditsService,
  ) {
    this.stripe = new StripeLib(config.get<string>('STRIPE_SECRET_KEY')!);
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  // ─── 1. Checkout: empresa recarga créditos ────────────────────────────────────
  async createCreditsCheckoutSession(userId: number, amountUsd: number): Promise<{ url: string }> {
    const empresa = await this.empresasRepo.findOne({
      where: { user_id: userId },
      relations: { user: true },
    });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');

    const customerId = await this.ensureStripeCustomer(empresa);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amountUsd * 100),
            product_data: {
              name: `${amountUsd} Créditos HazloViral`,
              description: 'Créditos para conectar con influencers en la plataforma',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'credits',
        empresa_id: String(empresa.id),
        amount_credits: String(amountUsd),
      },
      success_url: `${this.frontendUrl}/dashboard?credits=success`,
      cancel_url: `${this.frontendUrl}/dashboard?credits=cancelled`,
    });

    return { url: session.url! };
  }

  // ─── 2. Checkout: empresa fonda contrato en custodia ─────────────────────────
  async createContractCheckoutSession(contratoId: number, userId: number): Promise<{ url: string }> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { empresa: { user: true } },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (contrato.status !== ContratoStatus.PENDING_PAYMENT) {
      throw new NotFoundException('El contrato no está en estado pending_payment.');
    }

    const empresa = contrato.empresa;
    if (!empresa || empresa.user_id !== userId) {
      throw new NotFoundException('No autorizado para fondear este contrato.');
    }

    const customerId = await this.ensureStripeCustomer(empresa);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(Number(contrato.monto_total) * 100),
            product_data: {
              name: `Contrato Escrow #${contrato.id}`,
              description: `Fondeo en custodia. Fecha límite: ${contrato.fecha_limite_entrega}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'contract',
        contrato_id: String(contrato.id),
        empresa_id: String(empresa.id),
      },
      success_url: `${this.frontendUrl}/contratos/${contrato.id}?payment=success`,
      cancel_url: `${this.frontendUrl}/contratos/${contrato.id}?payment=cancelled`,
    });

    return { url: session.url! };
  }

  // ─── 3. Stripe Connect: onboarding de influencer ─────────────────────────────
  async createConnectOnboardingLink(userId: number): Promise<{ url: string }> {
    const influencer = await this.influencersRepo.findOne({
      where: { user_id: userId },
      relations: { user: true },
    });
    if (!influencer) throw new NotFoundException('Perfil de influencer no encontrado.');

    const user = influencer.user;
    let accountId = user.stripe_connect_id;

    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: { transfers: { requested: true } },
        metadata: { user_id: String(userId), influencer_id: String(influencer.id) },
      });
      accountId = account.id;
      user.stripe_connect_id = accountId;
      await this.usersRepo.save(user);
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${this.frontendUrl}/perfil?connect=refresh`,
      return_url: `${this.frontendUrl}/perfil?connect=success`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  // ─── 4. Transfer: payout al influencer tras aprobar contrato ─────────────────
  async payoutToInfluencer(contratoId: number): Promise<string | null> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { influencer: { user: true } },
    });
    if (!contrato) return null;

    const connectId = contrato.influencer?.user?.stripe_connect_id;
    if (!connectId) {
      this.logger.warn(
        `Influencer del contrato ${contratoId} no tiene cuenta Stripe Connect. Payout pendiente.`,
      );
      return null;
    }

    const netAmount = Math.round(
      (Number(contrato.monto_total) - Number(contrato.comision_plataforma)) * 100,
    );

    const transfer = await this.stripe.transfers.create({
      amount: netAmount,
      currency: 'usd',
      destination: connectId,
      metadata: { contrato_id: String(contratoId) },
    });

    contrato.stripe_transfer_id = transfer.id;
    await this.contratosRepo.save(contrato);
    this.logger.log(`Transfer ${transfer.id} creado para contrato ${contratoId}`);
    return transfer.id;
  }

  // ─── 5. Webhook: procesar eventos de Stripe ───────────────────────────────────
  async handleWebhook(signature: string, rawBody: Buffer): Promise<{ received: boolean }> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
      this.logger.error('Webhook signature inválida:', err.message);
      throw err;
    }

    this.logger.log(`Webhook recibido: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object);
        break;
      default:
        this.logger.debug(`Evento ignorado: ${event.type}`);
    }

    return { received: true };
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleCheckoutCompleted(session: any): Promise<void> {
    const { type, empresa_id, amount_credits, contrato_id } = session.metadata ?? {};

    if (type === 'credits' && empresa_id && amount_credits) {
      await this.creditsService.addCredits(Number(empresa_id), Number(amount_credits));
      this.logger.log(`Créditos añadidos: empresa ${empresa_id}, monto ${amount_credits}`);
    }

    if (type === 'contract' && contrato_id) {
      const contrato = await this.contratosRepo.findOne({ where: { id: Number(contrato_id) } });
      if (contrato && contrato.status === ContratoStatus.PENDING_PAYMENT) {
        contrato.status = ContratoStatus.FUNDED_IN_ESCROW;
        if (session.payment_intent) contrato.stripe_charge_id = String(session.payment_intent);
        await this.contratosRepo.save(contrato);
        this.logger.log(`Contrato ${contrato_id} fondeado en custodia vía webhook`);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleAccountUpdated(account: any): Promise<void> {
    if (!account.charges_enabled) return;
    const user = await this.usersRepo.findOne({ where: { stripe_connect_id: account.id } });
    if (user) {
      this.logger.log(`Connect account ${account.id} verificado para user ${user.id}`);
    }
  }

  private async ensureStripeCustomer(empresa: EmpresaProfile & { user: User }): Promise<string> {
    if (empresa.user.stripe_customer_id) return empresa.user.stripe_customer_id;

    const customer = await this.stripe.customers.create({
      email: empresa.user.email,
      name: empresa.nombre_comercial,
      metadata: { user_id: String(empresa.user_id), empresa_id: String(empresa.id) },
    });

    empresa.user.stripe_customer_id = customer.id;
    await this.usersRepo.save(empresa.user);
    return customer.id;
  }
}
