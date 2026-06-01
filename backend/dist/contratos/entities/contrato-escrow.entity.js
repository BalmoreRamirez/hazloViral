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
exports.ContratoEscrow = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("../../common/enums");
const chat_entity_1 = require("../../chats/entities/chat.entity");
const empresa_profile_entity_1 = require("../../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../../influencers/entities/influencer-profile.entity");
let ContratoEscrow = class ContratoEscrow {
    id;
    chat_id;
    empresa_id;
    influencer_id;
    chat;
    empresa;
    influencer;
    monto_total;
    comision_plataforma;
    entregables;
    fecha_limite_entrega;
    status;
    stripe_charge_id;
    stripe_transfer_id;
    created_at;
    updated_at;
};
exports.ContratoEscrow = ContratoEscrow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ContratoEscrow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContratoEscrow.prototype, "chat_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContratoEscrow.prototype, "empresa_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContratoEscrow.prototype, "influencer_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_entity_1.Chat, (chat) => chat.contratos, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'chat_id' }),
    __metadata("design:type", chat_entity_1.Chat)
], ContratoEscrow.prototype, "chat", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => empresa_profile_entity_1.EmpresaProfile, (empresa) => empresa.contratos, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'empresa_id' }),
    __metadata("design:type", empresa_profile_entity_1.EmpresaProfile)
], ContratoEscrow.prototype, "empresa", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => influencer_profile_entity_1.InfluencerProfile, (influencer) => influencer.contratos, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'influencer_id' }),
    __metadata("design:type", influencer_profile_entity_1.InfluencerProfile)
], ContratoEscrow.prototype, "influencer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], ContratoEscrow.prototype, "monto_total", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], ContratoEscrow.prototype, "comision_plataforma", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Array)
], ContratoEscrow.prototype, "entregables", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], ContratoEscrow.prototype, "fecha_limite_entrega", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.ContratoStatus, default: enums_1.ContratoStatus.PENDING_PAYMENT }),
    __metadata("design:type", String)
], ContratoEscrow.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], ContratoEscrow.prototype, "stripe_charge_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], ContratoEscrow.prototype, "stripe_transfer_id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ContratoEscrow.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ContratoEscrow.prototype, "updated_at", void 0);
exports.ContratoEscrow = ContratoEscrow = __decorate([
    (0, typeorm_1.Entity)('contratos_escrow'),
    (0, typeorm_1.Index)('idx_contratos_status', ['status'])
], ContratoEscrow);
//# sourceMappingURL=contrato-escrow.entity.js.map