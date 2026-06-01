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
exports.InfluencerMetric = void 0;
const typeorm_1 = require("typeorm");
const influencer_profile_entity_1 = require("./influencer-profile.entity");
let InfluencerMetric = class InfluencerMetric {
    id;
    influencer_id;
    influencer;
    red_social;
    username;
    seguidores;
    engagement_rate;
    updated_at;
};
exports.InfluencerMetric = InfluencerMetric;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], InfluencerMetric.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], InfluencerMetric.prototype, "influencer_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => influencer_profile_entity_1.InfluencerProfile, (profile) => profile.metrics, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'influencer_id' }),
    __metadata("design:type", influencer_profile_entity_1.InfluencerProfile)
], InfluencerMetric.prototype, "influencer", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], InfluencerMetric.prototype, "red_social", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], InfluencerMetric.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], InfluencerMetric.prototype, "seguidores", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], InfluencerMetric.prototype, "engagement_rate", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], InfluencerMetric.prototype, "updated_at", void 0);
exports.InfluencerMetric = InfluencerMetric = __decorate([
    (0, typeorm_1.Entity)('influencer_metrics'),
    (0, typeorm_1.Index)('idx_metrics_search', ['red_social', 'seguidores', 'engagement_rate'])
], InfluencerMetric);
//# sourceMappingURL=influencer-metric.entity.js.map