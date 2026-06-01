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
exports.Message = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("../../common/enums");
const chat_entity_1 = require("./chat.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const campaign_brief_entity_1 = require("../../campaigns/entities/campaign-brief.entity");
const contrato_escrow_entity_1 = require("../../contratos/entities/contrato-escrow.entity");
let Message = class Message {
    id;
    chat_id;
    sender_id;
    campaign_brief_id;
    contrato_id;
    chat;
    sender;
    campaignBrief;
    contrato;
    message_text;
    is_proposal;
    proposal_data;
    proposal_status;
    created_at;
};
exports.Message = Message;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Message.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Message.prototype, "chat_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Message.prototype, "sender_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Message.prototype, "campaign_brief_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Message.prototype, "contrato_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_entity_1.Chat, (chat) => chat.messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'chat_id' }),
    __metadata("design:type", chat_entity_1.Chat)
], Message.prototype, "chat", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'sender_id' }),
    __metadata("design:type", user_entity_1.User)
], Message.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => campaign_brief_entity_1.CampaignBrief, (brief) => brief.messages, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'campaign_brief_id' }),
    __metadata("design:type", campaign_brief_entity_1.CampaignBrief)
], Message.prototype, "campaignBrief", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contrato_escrow_entity_1.ContratoEscrow, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'contrato_id' }),
    __metadata("design:type", contrato_escrow_entity_1.ContratoEscrow)
], Message.prototype, "contrato", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "message_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Message.prototype, "is_proposal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Message.prototype, "proposal_data", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.ProposalStatus, nullable: true }),
    __metadata("design:type", String)
], Message.prototype, "proposal_status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Message.prototype, "created_at", void 0);
exports.Message = Message = __decorate([
    (0, typeorm_1.Entity)('messages'),
    (0, typeorm_1.Index)('idx_messages_chat_id', ['chat_id', 'created_at'])
], Message);
//# sourceMappingURL=message.entity.js.map