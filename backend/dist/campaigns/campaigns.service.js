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
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const campaign_brief_entity_1 = require("./entities/campaign-brief.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
let CampaignsService = class CampaignsService {
    briefsRepo;
    empresasRepo;
    constructor(briefsRepo, empresasRepo) {
        this.briefsRepo = briefsRepo;
        this.empresasRepo = empresasRepo;
    }
    async getEmpresaId(userId) {
        const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
        if (!empresa)
            throw new common_1.NotFoundException('Perfil de empresa no encontrado.');
        return empresa.id;
    }
    async create(user, dto) {
        const empresa_id = await this.getEmpresaId(user.id);
        const brief = new campaign_brief_entity_1.CampaignBrief();
        brief.empresa_id = empresa_id;
        brief.titulo_campana = dto.titulo_campana;
        if (dto.objetivo_principal)
            brief.objetivo_principal = dto.objetivo_principal;
        if (dto.tono_de_voz)
            brief.tono_de_voz = dto.tono_de_voz;
        if (dto.puntos_clave_si)
            brief.puntos_clave_si = dto.puntos_clave_si;
        if (dto.restricciones_no)
            brief.restricciones_no = dto.restricciones_no;
        if (dto.recursos_esteticos)
            brief.recursos_esteticos = dto.recursos_esteticos;
        return this.briefsRepo.save(brief);
    }
    async findAll(user) {
        const empresa_id = await this.getEmpresaId(user.id);
        return this.briefsRepo.find({
            where: { empresa_id },
            order: { created_at: 'DESC' },
        });
    }
    async findOne(user, id) {
        const empresa_id = await this.getEmpresaId(user.id);
        const brief = await this.briefsRepo.findOne({ where: { id } });
        if (!brief)
            throw new common_1.NotFoundException('Brief no encontrado.');
        if (brief.empresa_id !== empresa_id)
            throw new common_1.ForbiddenException('No tienes acceso a este brief.');
        return brief;
    }
    async update(user, id, dto) {
        const brief = await this.findOne(user, id);
        if (dto.titulo_campana !== undefined)
            brief.titulo_campana = dto.titulo_campana;
        if (dto.objetivo_principal !== undefined)
            brief.objetivo_principal = dto.objetivo_principal;
        if (dto.tono_de_voz !== undefined)
            brief.tono_de_voz = dto.tono_de_voz;
        if (dto.puntos_clave_si !== undefined)
            brief.puntos_clave_si = dto.puntos_clave_si;
        if (dto.restricciones_no !== undefined)
            brief.restricciones_no = dto.restricciones_no;
        if (dto.recursos_esteticos !== undefined)
            brief.recursos_esteticos = dto.recursos_esteticos;
        return this.briefsRepo.save(brief);
    }
    async remove(user, id) {
        const brief = await this.findOne(user, id);
        await this.briefsRepo.remove(brief);
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(campaign_brief_entity_1.CampaignBrief)),
    __param(1, (0, typeorm_1.InjectRepository)(empresa_profile_entity_1.EmpresaProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map