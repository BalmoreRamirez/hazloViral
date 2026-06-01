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
exports.CampaignBrief = void 0;
const typeorm_1 = require("typeorm");
const empresa_profile_entity_1 = require("../../empresas/entities/empresa-profile.entity");
const message_entity_1 = require("../../chats/entities/message.entity");
let CampaignBrief = class CampaignBrief {
    id;
    empresa_id;
    empresa;
    titulo_campana;
    objetivo_principal;
    tono_de_voz;
    puntos_clave_si;
    restricciones_no;
    recursos_esteticos;
    created_at;
    messages;
};
exports.CampaignBrief = CampaignBrief;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CampaignBrief.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CampaignBrief.prototype, "empresa_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => empresa_profile_entity_1.EmpresaProfile, (empresa) => empresa.briefs, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'empresa_id' }),
    __metadata("design:type", empresa_profile_entity_1.EmpresaProfile)
], CampaignBrief.prototype, "empresa", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], CampaignBrief.prototype, "titulo_campana", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CampaignBrief.prototype, "objetivo_principal", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], CampaignBrief.prototype, "tono_de_voz", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CampaignBrief.prototype, "puntos_clave_si", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CampaignBrief.prototype, "restricciones_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CampaignBrief.prototype, "recursos_esteticos", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CampaignBrief.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (msg) => msg.campaignBrief),
    __metadata("design:type", Array)
], CampaignBrief.prototype, "messages", void 0);
exports.CampaignBrief = CampaignBrief = __decorate([
    (0, typeorm_1.Entity)('campaign_briefs')
], CampaignBrief);
//# sourceMappingURL=campaign-brief.entity.js.map