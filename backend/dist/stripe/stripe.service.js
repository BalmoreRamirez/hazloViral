"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stripe_1 = __importDefault(require("stripe"));
const user_entity_1 = require("../users/entities/user.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const contrato_escrow_entity_1 = require("../contratos/entities/contrato-escrow.entity");
const message_entity_1 = require("../chats/entities/message.entity");
const chats_gateway_1 = require("../chats/chats.gateway");
const credits_service_1 = require("../credits/credits.service");
const enums_1 = require("../common/enums");
let StripeService = StripeService_1 = class StripeService {
    config;
    usersRepo;
    empresasRepo;
    influencersRepo;
    contratosRepo;
    messagesRepo;
    chatGateway;
    creditsService;
    stripe;
    logger = new common_1.Logger(StripeService_1.name);
    frontendUrl;
    constructor(config, usersRepo, empresasRepo, influencersRepo, contratosRepo, messagesRepo, chatGateway, creditsService) {
        this.config = config;
        this.usersRepo = usersRepo;
        this.empresasRepo = empresasRepo;
        this.influencersRepo = influencersRepo;
        this.contratosRepo = contratosRepo;
        this.messagesRepo = messagesRepo;
        this.chatGateway = chatGateway;
        this.creditsService = creditsService;
        this.stripe = new stripe_1.default(config.get('STRIPE_SECRET_KEY'));
        this.frontendUrl = config.get('FRONTEND_URL', 'http://localhost:5173');
    }
    async createCreditsCheckoutSession(userId, amountUsd) {
        const empresa = await this.empresasRepo.findOne({
            where: { user_id: userId },
            relations: { user: true },
        });
        if (!empresa)
            throw new common_1.NotFoundException('Perfil de empresa no encontrado.');
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
        return { url: session.url };
    }
    async createContractCheckoutSession(contratoId, userId) {
        const contrato = await this.contratosRepo.findOne({
            where: { id: contratoId },
            relations: { empresa: { user: true } },
        });
        if (!contrato)
            throw new common_1.NotFoundException('Contrato no encontrado.');
        if (contrato.status !== enums_1.ContratoStatus.PENDING_PAYMENT) {
            throw new common_1.NotFoundException('El contrato no está en estado pending_payment.');
        }
        const empresa = contrato.empresa;
        if (!empresa || empresa.user_id !== userId) {
            throw new common_1.NotFoundException('No autorizado para fondear este contrato.');
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
        return { url: session.url };
    }
    async createConnectOnboardingLink(userId) {
        const influencer = await this.influencersRepo.findOne({
            where: { user_id: userId },
            relations: { user: true },
        });
        if (!influencer)
            throw new common_1.NotFoundException('Perfil de influencer no encontrado.');
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
    async payoutToInfluencer(contratoId) {
        const contrato = await this.contratosRepo.findOne({
            where: { id: contratoId },
            relations: { influencer: { user: true } },
        });
        if (!contrato)
            return null;
        const connectId = contrato.influencer?.user?.stripe_connect_id;
        if (!connectId) {
            this.logger.warn(`Influencer del contrato ${contratoId} no tiene cuenta Stripe Connect. Payout pendiente.`);
            return null;
        }
        const netAmount = Math.round((Number(contrato.monto_total) - Number(contrato.comision_plataforma)) * 100);
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
    async handleWebhook(signature, rawBody) {
        const secret = this.config.get('STRIPE_WEBHOOK_SECRET');
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
        }
        catch (err) {
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
    async handleCheckoutCompleted(session) {
        const { type, empresa_id, amount_credits, contrato_id } = session.metadata ?? {};
        if (type === 'credits' && empresa_id && amount_credits) {
            await this.creditsService.addCredits(Number(empresa_id), Number(amount_credits));
            this.logger.log(`Créditos añadidos: empresa ${empresa_id}, monto ${amount_credits}`);
        }
        if (type === 'contract' && contrato_id) {
            const contrato = await this.contratosRepo.findOne({ where: { id: Number(contrato_id) } });
            if (contrato && contrato.status === enums_1.ContratoStatus.PENDING_PAYMENT) {
                contrato.status = enums_1.ContratoStatus.FUNDED_IN_ESCROW;
                if (session.payment_intent)
                    contrato.stripe_charge_id = String(session.payment_intent);
                await this.contratosRepo.save(contrato);
                this.logger.log(`Contrato ${contrato_id} fondeado en custodia vía webhook`);
                const msg = await this.messagesRepo.findOne({
                    where: { contrato_id: contrato.id, is_proposal: true },
                });
                if (msg) {
                    msg.proposal_status = enums_1.ProposalStatus.FUNDED;
                    await this.messagesRepo.save(msg);
                }
                this.chatGateway.server
                    .to(`chat-${contrato.chat_id}`)
                    .emit('contract_funded', {
                    contrato_id: contrato.id,
                    message: 'El pago está en custodia. Puedes comenzar a trabajar de forma segura.',
                });
            }
        }
    }
    async handleAccountUpdated(account) {
        if (!account.charges_enabled)
            return;
        const user = await this.usersRepo.findOne({ where: { stripe_connect_id: account.id } });
        if (user) {
            this.logger.log(`Connect account ${account.id} verificado para user ${user.id}`);
        }
    }
    async ensureStripeCustomer(empresa) {
        if (empresa.user.stripe_customer_id)
            return empresa.user.stripe_customer_id;
        const customer = await this.stripe.customers.create({
            email: empresa.user.email,
            name: empresa.nombre_comercial,
            metadata: { user_id: String(empresa.user_id), empresa_id: String(empresa.id) },
        });
        empresa.user.stripe_customer_id = customer.id;
        await this.usersRepo.save(empresa.user);
        return customer.id;
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(empresa_profile_entity_1.EmpresaProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(influencer_profile_entity_1.InfluencerProfile)),
    __param(4, (0, typeorm_1.InjectRepository)(contrato_escrow_entity_1.ContratoEscrow)),
    __param(5, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        chats_gateway_1.ChatGateway,
        credits_service_1.CreditsService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map