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
exports.CreditsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const admin_service_1 = require("../admin/admin.service");
let CreditsService = class CreditsService {
    empresasRepo;
    adminService;
    dataSource;
    constructor(empresasRepo, adminService, dataSource) {
        this.empresasRepo = empresasRepo;
        this.adminService = adminService;
        this.dataSource = dataSource;
    }
    async getBalance(userId) {
        const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
        if (!empresa)
            throw new common_1.NotFoundException('Perfil de empresa no encontrado.');
        return this.buildBalanceInfo(empresa);
    }
    async getBalanceByEmpresaId(empresaId) {
        const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
        if (!empresa)
            throw new common_1.NotFoundException('Empresa no encontrada.');
        return this.buildBalanceInfo(empresa);
    }
    async isAboveThreshold(empresaId) {
        const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
        if (!empresa)
            return false;
        return Number(empresa.balance_creditos) > Number(empresa.umbral_creditos);
    }
    async deductChatOpenCost(empresaId) {
        const cost = await this.adminService.getNumber('chat_open_cost', 1.0);
        return this.dataSource.transaction(async (manager) => {
            const empresa = await manager
                .getRepository(empresa_profile_entity_1.EmpresaProfile)
                .createQueryBuilder('e')
                .setLock('pessimistic_write')
                .where('e.id = :id', { id: empresaId })
                .getOne();
            if (!empresa)
                throw new common_1.NotFoundException('Empresa no encontrada.');
            const balance = Number(empresa.balance_creditos);
            const umbral = Number(empresa.umbral_creditos);
            if (balance < cost) {
                throw new common_1.BadRequestException(`Saldo insuficiente. Necesitas ${cost} créditos pero tienes ${balance}.`);
            }
            empresa.balance_creditos = parseFloat((balance - cost).toFixed(2));
            await manager.save(empresa);
            return this.buildBalanceInfo(empresa);
        });
    }
    async addCredits(empresaId, amount) {
        if (amount <= 0)
            throw new common_1.BadRequestException('El monto debe ser positivo.');
        return this.dataSource.transaction(async (manager) => {
            const empresa = await manager
                .getRepository(empresa_profile_entity_1.EmpresaProfile)
                .createQueryBuilder('e')
                .setLock('pessimistic_write')
                .where('e.id = :id', { id: empresaId })
                .getOne();
            if (!empresa)
                throw new common_1.NotFoundException('Empresa no encontrada.');
            empresa.balance_creditos = parseFloat((Number(empresa.balance_creditos) + amount).toFixed(2));
            await manager.save(empresa);
            return this.buildBalanceInfo(empresa);
        });
    }
    async updateThreshold(empresaId, newThreshold) {
        if (newThreshold < 0)
            throw new common_1.BadRequestException('El umbral no puede ser negativo.');
        const empresa = await this.empresasRepo.findOne({ where: { id: empresaId } });
        if (!empresa)
            throw new common_1.NotFoundException('Empresa no encontrada.');
        empresa.umbral_creditos = newThreshold;
        await this.empresasRepo.save(empresa);
        return this.buildBalanceInfo(empresa);
    }
    buildBalanceInfo(empresa) {
        const balance = Number(empresa.balance_creditos);
        const umbral = Number(empresa.umbral_creditos);
        const isAbove = balance > umbral;
        return {
            empresa_id: empresa.id,
            balance_creditos: balance,
            umbral_creditos: umbral,
            is_above_threshold: isAbove,
            deficit: isAbove ? 0 : parseFloat((umbral - balance).toFixed(2)),
        };
    }
};
exports.CreditsService = CreditsService;
exports.CreditsService = CreditsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(empresa_profile_entity_1.EmpresaProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        admin_service_1.AdminService,
        typeorm_2.DataSource])
], CreditsService);
//# sourceMappingURL=credits.service.js.map