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
exports.InfluencerProfile = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const influencer_metric_entity_1 = require("./influencer-metric.entity");
const chat_entity_1 = require("../../chats/entities/chat.entity");
const contrato_escrow_entity_1 = require("../../contratos/entities/contrato-escrow.entity");
let InfluencerProfile = class InfluencerProfile {
    id;
    user_id;
    user;
    nombre_artistico;
    bio;
    ubicacion;
    tarifa_base;
    disponibilidad;
    fecha_nacimiento;
    get es_menor_edad() {
        if (!this.fecha_nacimiento)
            return false;
        const birth = new Date(this.fecha_nacimiento);
        const age18 = new Date();
        age18.setFullYear(age18.getFullYear() - 18);
        return birth > age18;
    }
    tutor_nombre;
    tutor_documento_id;
    tutor_email;
    tutor_autorizacion;
    metrics;
    chats;
    contratos;
};
exports.InfluencerProfile = InfluencerProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], InfluencerProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], InfluencerProfile.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, (user) => user.influencerProfile),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], InfluencerProfile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], InfluencerProfile.prototype, "nombre_artistico", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], InfluencerProfile.prototype, "bio", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], InfluencerProfile.prototype, "ubicacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], InfluencerProfile.prototype, "tarifa_base", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], InfluencerProfile.prototype, "disponibilidad", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], InfluencerProfile.prototype, "fecha_nacimiento", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], InfluencerProfile.prototype, "tutor_nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], InfluencerProfile.prototype, "tutor_documento_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], InfluencerProfile.prototype, "tutor_email", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], InfluencerProfile.prototype, "tutor_autorizacion", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => influencer_metric_entity_1.InfluencerMetric, (metric) => metric.influencer),
    __metadata("design:type", Array)
], InfluencerProfile.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => chat_entity_1.Chat, (chat) => chat.influencer),
    __metadata("design:type", Array)
], InfluencerProfile.prototype, "chats", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => contrato_escrow_entity_1.ContratoEscrow, (contrato) => contrato.influencer),
    __metadata("design:type", Array)
], InfluencerProfile.prototype, "contratos", void 0);
exports.InfluencerProfile = InfluencerProfile = __decorate([
    (0, typeorm_1.Entity)('influencers_profiles')
], InfluencerProfile);
//# sourceMappingURL=influencer-profile.entity.js.map