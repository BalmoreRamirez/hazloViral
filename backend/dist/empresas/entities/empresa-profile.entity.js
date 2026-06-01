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
exports.EmpresaProfile = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const campaign_brief_entity_1 = require("../../campaigns/entities/campaign-brief.entity");
const chat_entity_1 = require("../../chats/entities/chat.entity");
const contrato_escrow_entity_1 = require("../../contratos/entities/contrato-escrow.entity");
let EmpresaProfile = class EmpresaProfile {
    id;
    user_id;
    user;
    nombre_comercial;
    sitio_web;
    balance_creditos;
    umbral_creditos;
    briefs;
    chats;
    contratos;
};
exports.EmpresaProfile = EmpresaProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EmpresaProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], EmpresaProfile.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, (user) => user.empresaProfile),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], EmpresaProfile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], EmpresaProfile.prototype, "nombre_comercial", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], EmpresaProfile.prototype, "sitio_web", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 10.0 }),
    __metadata("design:type", Number)
], EmpresaProfile.prototype, "balance_creditos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 5.0 }),
    __metadata("design:type", Number)
], EmpresaProfile.prototype, "umbral_creditos", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => campaign_brief_entity_1.CampaignBrief, (brief) => brief.empresa),
    __metadata("design:type", Array)
], EmpresaProfile.prototype, "briefs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => chat_entity_1.Chat, (chat) => chat.empresa),
    __metadata("design:type", Array)
], EmpresaProfile.prototype, "chats", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => contrato_escrow_entity_1.ContratoEscrow, (contrato) => contrato.empresa),
    __metadata("design:type", Array)
], EmpresaProfile.prototype, "contratos", void 0);
exports.EmpresaProfile = EmpresaProfile = __decorate([
    (0, typeorm_1.Entity)('empresas_profiles')
], EmpresaProfile);
//# sourceMappingURL=empresa-profile.entity.js.map