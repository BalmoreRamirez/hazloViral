"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const global_setting_entity_1 = require("./entities/global-setting.entity");
const contrato_escrow_entity_1 = require("../contratos/entities/contrato-escrow.entity");
const user_entity_1 = require("../users/entities/user.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const enums_1 = require("../common/enums");
const DEFAULTS = [
    { key: 'chat_open_cost', value: '1.00', description: 'Créditos que consume abrir un chat' },
    { key: 'platform_commission_pct', value: '10.00', description: 'Comisión de la plataforma sobre contratos (%)' },
    { key: 'welcome_bonus', value: '10.00', description: 'Bono de bienvenida en créditos para empresas nuevas' },
    { key: 'min_credit_threshold', value: '5.00', description: 'Umbral mínimo; por debajo los chats quedan en solo lectura' },
];
let AdminService = AdminService_1 = class AdminService {
    settingsRepo;
    contratosRepo;
    usersRepo;
    empresasRepo;
    influencersRepo;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(settingsRepo, contratosRepo, usersRepo, empresasRepo, influencersRepo) {
        this.settingsRepo = settingsRepo;
        this.contratosRepo = contratosRepo;
        this.usersRepo = usersRepo;
        this.empresasRepo = empresasRepo;
        this.influencersRepo = influencersRepo;
    }
    async onApplicationBootstrap() {
        await this.seedDefaults();
        await this.seedAdminUser();
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
    async findAll() {
        return this.settingsRepo.find({ order: { key: 'ASC' } });
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
    async listDisputes() {
        return this.contratosRepo.find({
            where: { status: enums_1.ContratoStatus.IN_DISPUTE },
            relations: { empresa: { user: true }, influencer: { user: true }, chat: true },
            order: { updated_at: 'DESC' },
        });
    }
    async resolveDispute(id, dto) {
        const contrato = await this.contratosRepo.findOne({
            where: { id, status: enums_1.ContratoStatus.IN_DISPUTE },
        });
        if (!contrato)
            throw new common_1.NotFoundException('Disputa no encontrada o ya resuelta.');
        contrato.status = enums_1.ContratoStatus.COMPLETED;
        const resolution = `ADMIN:${dto.decision.toUpperCase()}:${dto.nota.slice(0, 50)}`;
        contrato.stripe_transfer_id = resolution;
        const saved = await this.contratosRepo.save(contrato);
        this.logger.log(`Disputa #${id} resuelta a favor de ${dto.decision}: ${dto.nota}`);
        return saved;
    }
    async listUsers() {
        const users = await this.usersRepo.find({
            order: { created_at: 'DESC' },
            select: { id: true, email: true, role: true, is_active: true, created_at: true,
                stripe_customer_id: true, stripe_connect_id: true },
        });
        return Promise.all(users.map(async (u) => {
            let profile = null;
            if (u.role === enums_1.UserRole.EMPRESA) {
                profile = await this.empresasRepo.findOne({ where: { user_id: u.id } });
            }
            else if (u.role === enums_1.UserRole.INFLUENCER) {
                profile = await this.influencersRepo.findOne({ where: { user_id: u.id } });
            }
            return { ...u, profile };
        }));
    }
    async setUserStatus(id, is_active) {
        const user = await this.usersRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado.');
        user.is_active = is_active;
        return this.usersRepo.save(user);
    }
    async getStats() {
        const [users, empresas, influencers, contratos, disputas] = await Promise.all([
            this.usersRepo.count(),
            this.usersRepo.count({ where: { role: enums_1.UserRole.EMPRESA } }),
            this.usersRepo.count({ where: { role: enums_1.UserRole.INFLUENCER } }),
            this.contratosRepo.count(),
            this.contratosRepo.count({ where: { status: enums_1.ContratoStatus.IN_DISPUTE } }),
        ]);
        return { users, empresas, influencers, contratos, disputas };
    }
    async seedDefaults() {
        for (const def of DEFAULTS) {
            const exists = await this.settingsRepo.existsBy({ key: def.key });
            if (!exists)
                await this.settingsRepo.save(this.settingsRepo.create(def));
        }
    }
    async seedAdminUser() {
        const ADMIN_EMAIL = 'admin@hazloviral.com';
        const exists = await this.usersRepo.existsBy({ email: ADMIN_EMAIL });
        if (exists)
            return;
        const hashed = await bcrypt.hash('Admin123!', 10);
        const admin = new user_entity_1.User();
        admin.email = ADMIN_EMAIL;
        admin.password = hashed;
        admin.role = enums_1.UserRole.ADMIN;
        await this.usersRepo.save(admin);
        this.logger.log(`Usuario admin creado: ${ADMIN_EMAIL} / Admin123!`);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(global_setting_entity_1.GlobalSetting)),
    __param(1, (0, typeorm_1.InjectRepository)(contrato_escrow_entity_1.ContratoEscrow)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(empresa_profile_entity_1.EmpresaProfile)),
    __param(4, (0, typeorm_1.InjectRepository)(influencer_profile_entity_1.InfluencerProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map