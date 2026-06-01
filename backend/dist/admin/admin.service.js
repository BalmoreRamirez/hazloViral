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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const global_setting_entity_1 = require("./entities/global-setting.entity");
const DEFAULTS = [
    { key: 'chat_open_cost', value: '1.00', description: 'Créditos que consume abrir un chat (configurable por Admin)' },
    { key: 'platform_commission_pct', value: '10.00', description: 'Comisión de la plataforma sobre contratos (%)' },
    { key: 'welcome_bonus', value: '10.00', description: 'Bono de bienvenida en créditos para empresas nuevas' },
    { key: 'min_credit_threshold', value: '5.00', description: 'Umbral mínimo de créditos; por debajo los chats quedan en solo lectura' },
];
let AdminService = class AdminService {
    settingsRepo;
    constructor(settingsRepo) {
        this.settingsRepo = settingsRepo;
    }
    async onApplicationBootstrap() {
        await this.seedDefaults();
    }
    async get(key) {
        const setting = await this.settingsRepo.findOne({ where: { key } });
        return setting?.value ?? null;
    }
    async getNumber(key, fallback) {
        const raw = await this.get(key);
        const parsed = parseFloat(raw ?? '');
        return isNaN(parsed) ? fallback : parsed;
    }
    async set(key, value, description) {
        const existing = await this.settingsRepo.findOne({ where: { key } });
        if (existing) {
            existing.value = value;
            if (description)
                existing.description = description;
            return this.settingsRepo.save(existing);
        }
        return this.settingsRepo.save(this.settingsRepo.create({ key, value, description: description ?? '' }));
    }
    async findAll() {
        return this.settingsRepo.find({ order: { key: 'ASC' } });
    }
    async seedDefaults() {
        for (const def of DEFAULTS) {
            const exists = await this.settingsRepo.existsBy({ key: def.key });
            if (!exists) {
                await this.settingsRepo.save(this.settingsRepo.create(def));
            }
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(global_setting_entity_1.GlobalSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map