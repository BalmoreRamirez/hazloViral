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
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_entity_1 = require("./entities/chat.entity");
const message_entity_1 = require("./entities/message.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const credits_service_1 = require("../credits/credits.service");
const enums_1 = require("../common/enums");
let ChatsService = class ChatsService {
    chatsRepo;
    messagesRepo;
    empresasRepo;
    influencersRepo;
    creditsService;
    constructor(chatsRepo, messagesRepo, empresasRepo, influencersRepo, creditsService) {
        this.chatsRepo = chatsRepo;
        this.messagesRepo = messagesRepo;
        this.empresasRepo = empresasRepo;
        this.influencersRepo = influencersRepo;
        this.creditsService = creditsService;
    }
    async openChat(user, dto) {
        const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
        if (!empresa)
            throw new common_1.NotFoundException('Perfil de empresa no encontrado.');
        const influencer = await this.influencersRepo.findOne({
            where: { id: dto.influencer_id, disponibilidad: true },
        });
        if (!influencer)
            throw new common_1.NotFoundException('Influencer no disponible.');
        const balance = await this.creditsService.getBalanceByEmpresaId(empresa.id);
        if (!balance.is_above_threshold) {
            throw new common_1.BadRequestException(`Saldo insuficiente. Necesitas más de ${balance.umbral_creditos} créditos para iniciar chats. Saldo actual: ${balance.balance_creditos}.`);
        }
        const existing = await this.chatsRepo.findOne({
            where: { empresa_id: empresa.id, influencer_id: dto.influencer_id },
        });
        if (existing)
            return existing;
        await this.creditsService.deductChatOpenCost(empresa.id);
        const chat = new chat_entity_1.Chat();
        chat.empresa_id = empresa.id;
        chat.influencer_id = dto.influencer_id;
        chat.status = enums_1.ChatStatus.ACTIVE;
        return this.chatsRepo.save(chat);
    }
    async listChats(user) {
        if (user.role === enums_1.UserRole.EMPRESA) {
            const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
            if (!empresa)
                return [];
            return this.chatsRepo.find({
                where: { empresa_id: empresa.id },
                relations: { influencer: true },
                order: { created_at: 'DESC' },
            });
        }
        const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
        if (!influencer)
            return [];
        return this.chatsRepo.find({
            where: { influencer_id: influencer.id },
            relations: { empresa: true },
            order: { created_at: 'DESC' },
        });
    }
    async getMessages(chatId, user, limit = 50, offset = 0) {
        await this.assertParticipant(chatId, user);
        return this.messagesRepo.find({
            where: { chat_id: chatId },
            relations: { sender: true, campaignBrief: true, contrato: true },
            order: { created_at: 'ASC' },
            take: limit,
            skip: offset,
        });
    }
    async saveMessage(user, dto) {
        const chat = await this.chatsRepo.findOne({ where: { id: dto.chat_id } });
        if (!chat)
            throw new common_1.NotFoundException('Chat no encontrado.');
        await this.assertParticipant(dto.chat_id, user);
        if (user.role === enums_1.UserRole.EMPRESA) {
            const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
            if (empresa) {
                const aboveThreshold = await this.creditsService.isAboveThreshold(empresa.id);
                if (!aboveThreshold) {
                    throw new common_1.ForbiddenException('Chat en solo lectura. Recarga créditos para continuar enviando mensajes.');
                }
            }
        }
        if (chat.status === enums_1.ChatStatus.BLOCKED) {
            throw new common_1.ForbiddenException('Este chat está bloqueado.');
        }
        if (!dto.message_text && !dto.is_proposal) {
            throw new common_1.BadRequestException('El mensaje no puede estar vacío.');
        }
        const msg = new message_entity_1.Message();
        msg.chat_id = dto.chat_id;
        msg.sender_id = user.id;
        msg.is_proposal = dto.is_proposal ?? false;
        if (msg.is_proposal)
            msg.proposal_status = enums_1.ProposalStatus.PENDING;
        if (dto.message_text)
            msg.message_text = dto.message_text;
        if (dto.proposal_data)
            msg.proposal_data = dto.proposal_data;
        if (dto.campaign_brief_id)
            msg.campaign_brief_id = dto.campaign_brief_id;
        return this.messagesRepo.save(msg);
    }
    async assertParticipant(chatId, user) {
        const chat = await this.chatsRepo.findOne({ where: { id: chatId } });
        if (!chat)
            throw new common_1.NotFoundException('Chat no encontrado.');
        if (user.role === enums_1.UserRole.EMPRESA) {
            const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
            if (!empresa || chat.empresa_id !== empresa.id) {
                throw new common_1.ForbiddenException('No tienes acceso a este chat.');
            }
        }
        else if (user.role === enums_1.UserRole.INFLUENCER) {
            const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
            if (!influencer || chat.influencer_id !== influencer.id) {
                throw new common_1.ForbiddenException('No tienes acceso a este chat.');
            }
        }
        return chat;
    }
    async getEmpresaId(userId) {
        const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
        return empresa?.id ?? null;
    }
};
exports.ChatsService = ChatsService;
exports.ChatsService = ChatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __param(1, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(2, (0, typeorm_1.InjectRepository)(empresa_profile_entity_1.EmpresaProfile)),
    __param(3, (0, typeorm_1.InjectRepository)(influencer_profile_entity_1.InfluencerProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        credits_service_1.CreditsService])
], ChatsService);
//# sourceMappingURL=chats.service.js.map