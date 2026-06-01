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
exports.EmpresasService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const empresa_profile_entity_1 = require("./entities/empresa-profile.entity");
let EmpresasService = class EmpresasService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async getMyProfile(user) {
        const profile = await this.repo.findOne({ where: { user_id: user.id } });
        if (!profile)
            throw new common_1.NotFoundException('Perfil de empresa no encontrado.');
        return profile;
    }
    async updateMyProfile(user, dto) {
        const profile = await this.getMyProfile(user);
        if (dto.nombre_comercial !== undefined)
            profile.nombre_comercial = dto.nombre_comercial;
        if (dto.sitio_web !== undefined)
            profile.sitio_web = dto.sitio_web;
        if (dto.umbral_creditos !== undefined)
            profile.umbral_creditos = dto.umbral_creditos;
        return this.repo.save(profile);
    }
};
exports.EmpresasService = EmpresasService;
exports.EmpresasService = EmpresasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(empresa_profile_entity_1.EmpresaProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], EmpresasService);
//# sourceMappingURL=empresas.service.js.map