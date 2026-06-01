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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContratosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contrato_escrow_entity_1 = require("./entities/contrato-escrow.entity");
const message_entity_1 = require("../chats/entities/message.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const chats_gateway_1 = require("../chats/chats.gateway");
const admin_service_1 = require("../admin/admin.service");
const stripe_service_1 = require("../stripe/stripe.service");
const enums_1 = require("../common/enums");
let ContratosService = class ContratosService {
    contratosRepo;
    messagesRepo;
    empresasRepo;
    influencersRepo;
    chatGateway;
    adminService;
    stripeService;
    dataSource;
    constructor(contratosRepo, messagesRepo, empresasRepo, influencersRepo, chatGateway, adminService, stripeService, dataSource) {
        this.contratosRepo = contratosRepo;
        this.messagesRepo = messagesRepo;
        this.empresasRepo = empresasRepo;
        this.influencersRepo = influencersRepo;
        this.chatGateway = chatGateway;
        this.adminService = adminService;
        this.stripeService = stripeService;
        this.dataSource = dataSource;
    }
    async acceptProposal(user, dto) {
        const message = await this.messagesRepo.findOne({
            where: { id: dto.message_id, is_proposal: true },
            relations: { chat: true },
        });
        if (!message)
            throw new common_1.NotFoundException('Propuesta no encontrada.');
        if (message.proposal_status !== enums_1.ProposalStatus.PENDING) {
            throw new common_1.BadRequestException(`Esta propuesta ya fue procesada (estado: ${message.proposal_status}).`);
        }
        const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
        if (!influencer || message.chat.influencer_id !== influencer.id) {
            throw new common_1.ForbiddenException('Solo el influencer del chat puede aceptar esta propuesta.');
        }
        if (!message.proposal_data) {
            throw new common_1.BadRequestException('La propuesta no contiene datos válidos.');
        }
        const commissionPct = await this.adminService.getNumber('platform_commission_pct', 10);
        const monto = message.proposal_data.tarifa;
        const comision = parseFloat(((monto * commissionPct) / 100).toFixed(2));
        return this.dataSource.transaction(async (manager) => {
            message.proposal_status = enums_1.ProposalStatus.ACCEPTED;
            await manager.save(message);
            const contrato = new contrato_escrow_entity_1.ContratoEscrow();
            contrato.chat_id = message.chat_id;
            contrato.empresa_id = message.chat.empresa_id;
            contrato.influencer_id = influencer.id;
            contrato.monto_total = monto;
            contrato.comision_plataforma = comision;
            contrato.entregables = message.proposal_data.entregables;
            contrato.fecha_limite_entrega = message.proposal_data.plazo;
            contrato.status = enums_1.ContratoStatus.PENDING_PAYMENT;
            const saved = await manager.save(contrato);
            message.contrato_id = saved.id;
            await manager.save(message);
            this.chatGateway.server
                .to(`chat-${message.chat_id}`)
                .emit('contract_created', { contrato: saved });
            return saved;
        });
    }
    async fundContract(user, contratoId, stripeChargeId) {
        const contrato = await this.findAndAuthorize(contratoId, user, enums_1.UserRole.EMPRESA);
        if (contrato.status !== enums_1.ContratoStatus.PENDING_PAYMENT) {
            throw new common_1.BadRequestException(`El contrato debe estar en pending_payment. Estado actual: ${contrato.status}`);
        }
        contrato.status = enums_1.ContratoStatus.FUNDED_IN_ESCROW;
        if (stripeChargeId)
            contrato.stripe_charge_id = stripeChargeId;
        const saved = await this.contratosRepo.save(contrato);
        const msg = await this.messagesRepo.findOne({
            where: { contrato_id: saved.id, is_proposal: true },
        });
        if (msg) {
            msg.proposal_status = enums_1.ProposalStatus.FUNDED;
            await this.messagesRepo.save(msg);
        }
        this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_funded', {
            contrato_id: saved.id,
            message: 'El pago está en custodia. Puedes comenzar a trabajar.',
        });
        return saved;
    }
    async submitDeliverables(user, contratoId, dto) {
        const contrato = await this.findAndAuthorize(contratoId, user, enums_1.UserRole.INFLUENCER);
        if (contrato.status !== enums_1.ContratoStatus.FUNDED_IN_ESCROW) {
            throw new common_1.BadRequestException(`El contrato debe estar en funded_in_escrow para entregar. Estado: ${contrato.status}`);
        }
        contrato.entregables = dto.evidencias;
        contrato.status = enums_1.ContratoStatus.UNDER_REVIEW;
        const saved = await this.contratosRepo.save(contrato);
        this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_under_review', {
            contrato_id: saved.id,
            message: 'El influencer subió los entregables. Revisa y aprueba para liberar el pago.',
        });
        return saved;
    }
    async approveAndRelease(user, contratoId, stripeTransferId) {
        const contrato = await this.findAndAuthorize(contratoId, user, enums_1.UserRole.EMPRESA);
        if (contrato.status !== enums_1.ContratoStatus.UNDER_REVIEW) {
            throw new common_1.BadRequestException(`El contrato debe estar under_review para aprobar. Estado: ${contrato.status}`);
        }
        contrato.status = enums_1.ContratoStatus.COMPLETED;
        if (stripeTransferId)
            contrato.stripe_transfer_id = stripeTransferId;
        const saved = await this.contratosRepo.save(contrato);
        this.stripeService.payoutToInfluencer(saved.id).catch((err) => console.error(`Payout falló para contrato ${saved.id}:`, err?.message));
        this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_completed', {
            contrato_id: saved.id,
            monto_neto: saved.monto_total - saved.comision_plataforma,
            message: '¡Contrato completado! El pago ha sido liberado al influencer.',
        });
        return saved;
    }
    async initiateDispute(user, contratoId, dto) {
        const contrato = await this.contratosRepo.findOne({ where: { id: contratoId } });
        if (!contrato)
            throw new common_1.NotFoundException('Contrato no encontrado.');
        const allowedStatuses = [
            enums_1.ContratoStatus.FUNDED_IN_ESCROW,
            enums_1.ContratoStatus.UNDER_REVIEW,
        ];
        if (!allowedStatuses.includes(contrato.status)) {
            throw new common_1.BadRequestException(`No se puede disputar un contrato en estado ${contrato.status}.`);
        }
        await this.assertIsParticipant(contrato, user);
        contrato.status = enums_1.ContratoStatus.IN_DISPUTE;
        const saved = await this.contratosRepo.save(contrato);
        this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_disputed', {
            contrato_id: saved.id,
            motivo: dto.motivo,
            message: 'Se ha iniciado una disputa. Un administrador revisará el caso.',
        });
        return saved;
    }
    async listMyContratos(user) {
        if (user.role === enums_1.UserRole.EMPRESA) {
            const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
            if (!empresa)
                return [];
            return this.contratosRepo.find({
                where: { empresa_id: empresa.id },
                relations: { influencer: true, chat: true },
                order: { created_at: 'DESC' },
            });
        }
        const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
        if (!influencer)
            return [];
        return this.contratosRepo.find({
            where: { influencer_id: influencer.id },
            relations: { empresa: true, chat: true },
            order: { created_at: 'DESC' },
        });
    }
    async findOne(user, contratoId) {
        const contrato = await this.contratosRepo.findOne({
            where: { id: contratoId },
            relations: { empresa: true, influencer: true, chat: true },
        });
        if (!contrato)
            throw new common_1.NotFoundException('Contrato no encontrado.');
        await this.assertIsParticipant(contrato, user);
        return contrato;
    }
    async findAndAuthorize(contratoId, user, expectedRole) {
        if (user.role !== expectedRole) {
            throw new common_1.ForbiddenException(`Solo un ${expectedRole} puede realizar esta acción.`);
        }
        const contrato = await this.contratosRepo.findOne({ where: { id: contratoId } });
        if (!contrato)
            throw new common_1.NotFoundException('Contrato no encontrado.');
        await this.assertIsParticipant(contrato, user);
        return contrato;
    }
    async assertIsParticipant(contrato, user) {
        if (user.role === enums_1.UserRole.EMPRESA) {
            const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
            if (!empresa || contrato.empresa_id !== empresa.id) {
                throw new common_1.ForbiddenException('No tienes acceso a este contrato.');
            }
        }
        else if (user.role === enums_1.UserRole.INFLUENCER) {
            const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
            if (!influencer || contrato.influencer_id !== influencer.id) {
                throw new common_1.ForbiddenException('No tienes acceso a este contrato.');
            }
        }
    }
};
exports.ContratosService = ContratosService;
exports.ContratosService = ContratosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contrato_escrow_entity_1.ContratoEscrow)),
    __param(1, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(2, (0, typeorm_1.InjectRepository)(empresa_profile_entity_1.EmpresaProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(influencer_profile_entity_1.InfluencerProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        chats_gateway_1.ChatGateway,
        admin_service_1.AdminService,
        stripe_service_1.StripeService,
        typeorm_2.DataSource])
], ContratosService);
//# sourceMappingURL=contratos.service.js.map