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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("../../common/enums");
const empresa_profile_entity_1 = require("../../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../../influencers/entities/influencer-profile.entity");
const message_entity_1 = require("./message.entity");
const contrato_escrow_entity_1 = require("../../contratos/entities/contrato-escrow.entity");
let Chat = class Chat {
    id;
    empresa_id;
    influencer_id;
    empresa;
    influencer;
    status;
    created_at;
    messages;
    contratos;
};
exports.Chat = Chat;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Chat.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Chat.prototype, "empresa_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Chat.prototype, "influencer_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => empresa_profile_entity_1.EmpresaProfile, (empresa) => empresa.chats, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'empresa_id' }),
    __metadata("design:type", empresa_profile_entity_1.EmpresaProfile)
], Chat.prototype, "empresa", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => influencer_profile_entity_1.InfluencerProfile, (influencer) => influencer.chats, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'influencer_id' }),
    __metadata("design:type", influencer_profile_entity_1.InfluencerProfile)
], Chat.prototype, "influencer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.ChatStatus, default: enums_1.ChatStatus.ACTIVE }),
    __metadata("design:type", String)
], Chat.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Chat.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (msg) => msg.chat),
    __metadata("design:type", Array)
], Chat.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => contrato_escrow_entity_1.ContratoEscrow, (contrato) => contrato.chat),
    __metadata("design:type", Array)
], Chat.prototype, "contratos", void 0);
exports.Chat = Chat = __decorate([
    (0, typeorm_1.Entity)('chats'),
    (0, typeorm_1.Unique)('unique_chat_relation', ['empresa_id', 'influencer_id'])
], Chat);
//# sourceMappingURL=chat.entity.js.map