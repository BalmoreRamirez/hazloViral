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
exports.InfluencersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const influencer_profile_entity_1 = require("./entities/influencer-profile.entity");
const influencer_metric_entity_1 = require("./entities/influencer-metric.entity");
let InfluencersService = class InfluencersService {
    profilesRepo;
    metricsRepo;
    constructor(profilesRepo, metricsRepo) {
        this.profilesRepo = profilesRepo;
        this.metricsRepo = metricsRepo;
    }
    async getMyProfile(user) {
        const profile = await this.profilesRepo.findOne({
            where: { user_id: user.id },
            relations: { metrics: true },
        });
        if (!profile)
            throw new common_1.NotFoundException('Perfil de influencer no encontrado.');
        return profile;
    }
    async updateMyProfile(user, dto) {
        const profile = await this.getMyProfile(user);
        if (dto.nombre_artistico !== undefined)
            profile.nombre_artistico = dto.nombre_artistico;
        if (dto.bio !== undefined)
            profile.bio = dto.bio;
        if (dto.ubicacion !== undefined)
            profile.ubicacion = dto.ubicacion;
        if (dto.tarifa_base !== undefined)
            profile.tarifa_base = dto.tarifa_base;
        if (dto.disponibilidad !== undefined)
            profile.disponibilidad = dto.disponibilidad;
        return this.profilesRepo.save(profile);
    }
    async search(query) {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 20, 50);
        const skip = (page - 1) * limit;
        const qb = this.profilesRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.metrics', 'm')
            .where('p.disponibilidad = :disp', { disp: true });
        if (query.ubicacion) {
            qb.andWhere('LOWER(p.ubicacion) LIKE LOWER(:ub)', { ub: `%${query.ubicacion}%` });
        }
        if (query.max_tarifa !== undefined) {
            qb.andWhere('p.tarifa_base <= :tarifa', { tarifa: query.max_tarifa });
        }
        if (query.red_social) {
            qb.andWhere('m.red_social = :red', { red: query.red_social });
            if (query.min_seguidores !== undefined) {
                qb.andWhere('m.seguidores >= :seg', { seg: query.min_seguidores });
            }
        }
        qb.orderBy('p.tarifa_base', 'ASC').skip(skip).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }
    async getPublicProfile(id) {
        const profile = await this.profilesRepo.findOne({
            where: { id },
            relations: { metrics: true },
        });
        if (!profile)
            throw new common_1.NotFoundException('Influencer no encontrado.');
        return profile;
    }
    async addMetric(user, dto) {
        const profile = await this.getMyProfile(user);
        const metric = new influencer_metric_entity_1.InfluencerMetric();
        metric.influencer_id = profile.id;
        metric.red_social = dto.red_social;
        metric.username = dto.username;
        metric.seguidores = dto.seguidores;
        metric.engagement_rate = dto.engagement_rate;
        return this.metricsRepo.save(metric);
    }
    async getMyMetrics(user) {
        const profile = await this.getMyProfile(user);
        return this.metricsRepo.find({
            where: { influencer_id: profile.id },
            order: { red_social: 'ASC' },
        });
    }
    async updateMetric(user, metricId, dto) {
        const metric = await this.assertOwnsMetric(user, metricId);
        if (dto.username !== undefined)
            metric.username = dto.username;
        if (dto.seguidores !== undefined)
            metric.seguidores = dto.seguidores;
        if (dto.engagement_rate !== undefined)
            metric.engagement_rate = dto.engagement_rate;
        return this.metricsRepo.save(metric);
    }
    async deleteMetric(user, metricId) {
        const metric = await this.assertOwnsMetric(user, metricId);
        await this.metricsRepo.remove(metric);
    }
    async assertOwnsMetric(user, metricId) {
        const profile = await this.getMyProfile(user);
        const metric = await this.metricsRepo.findOne({ where: { id: metricId } });
        if (!metric)
            throw new common_1.NotFoundException('Métrica no encontrada.');
        if (metric.influencer_id !== profile.id)
            throw new common_1.ForbiddenException('No tienes acceso a esta métrica.');
        return metric;
    }
};
exports.InfluencersService = InfluencersService;
exports.InfluencersService = InfluencersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(influencer_profile_entity_1.InfluencerProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(influencer_metric_entity_1.InfluencerMetric)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], InfluencersService);
//# sourceMappingURL=influencers.service.js.map