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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../users/entities/user.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const enums_1 = require("../common/enums");
const SALT_ROUNDS = 10;
const WELCOME_BONUS = 10.0;
let AuthService = class AuthService {
    usersRepo;
    jwtService;
    dataSource;
    constructor(usersRepo, jwtService, dataSource) {
        this.usersRepo = usersRepo;
        this.jwtService = jwtService;
        this.dataSource = dataSource;
    }
    async registerEmpresa(dto) {
        await this.assertEmailFree(dto.email);
        return this.dataSource.transaction(async (manager) => {
            const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
            const user = new user_entity_1.User();
            user.email = dto.email;
            user.password = hashed;
            user.role = enums_1.UserRole.EMPRESA;
            await manager.save(user);
            const profile = new empresa_profile_entity_1.EmpresaProfile();
            profile.user_id = user.id;
            profile.nombre_comercial = dto.nombre_comercial;
            if (dto.sitio_web)
                profile.sitio_web = dto.sitio_web;
            profile.balance_creditos = WELCOME_BONUS;
            profile.umbral_creditos = 5.0;
            await manager.save(profile);
            return { user: this.sanitize(user), profile, token: this.sign(user) };
        });
    }
    async registerInfluencer(dto) {
        await this.assertEmailFree(dto.email);
        const esMenor = this.calcularEsMenor(dto.fecha_nacimiento);
        if (esMenor) {
            if (!dto.tutor_nombre || !dto.tutor_documento_id || !dto.tutor_email) {
                throw new common_1.BadRequestException('Influencers menores de 18 años deben proporcionar los datos del tutor legal.');
            }
            if (!dto.tutor_autorizacion) {
                throw new common_1.BadRequestException('El tutor legal debe confirmar la autorización para influencers menores de edad.');
            }
        }
        return this.dataSource.transaction(async (manager) => {
            const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
            const user = new user_entity_1.User();
            user.email = dto.email;
            user.password = hashed;
            user.role = enums_1.UserRole.INFLUENCER;
            await manager.save(user);
            const profile = new influencer_profile_entity_1.InfluencerProfile();
            profile.user_id = user.id;
            profile.nombre_artistico = dto.nombre_artistico;
            if (dto.bio)
                profile.bio = dto.bio;
            if (dto.ubicacion)
                profile.ubicacion = dto.ubicacion;
            profile.tarifa_base = dto.tarifa_base ?? 0;
            profile.fecha_nacimiento = dto.fecha_nacimiento;
            profile.tutor_nombre = esMenor ? (dto.tutor_nombre ?? '') : '';
            profile.tutor_documento_id = esMenor ? (dto.tutor_documento_id ?? '') : '';
            profile.tutor_email = esMenor ? (dto.tutor_email ?? '') : '';
            profile.tutor_autorizacion = esMenor ? (dto.tutor_autorizacion ?? false) : false;
            await manager.save(profile);
            return {
                user: this.sanitize(user),
                profile: { ...profile, es_menor_edad: esMenor },
                token: this.sign(user),
            };
        });
    }
    async login(dto) {
        const user = await this.usersRepo.findOne({
            where: { email: dto.email, is_active: true },
            select: { id: true, email: true, password: true, role: true, is_active: true },
        });
        if (!user || !(await bcrypt.compare(dto.password, user.password))) {
            throw new common_1.UnauthorizedException('Credenciales incorrectas.');
        }
        return { user: this.sanitize(user), token: this.sign(user) };
    }
    async assertEmailFree(email) {
        const exists = await this.usersRepo.existsBy({ email });
        if (exists)
            throw new common_1.ConflictException('El email ya está registrado.');
    }
    calcularEsMenor(fechaNacimiento) {
        const birth = new Date(fechaNacimiento);
        const age18 = new Date();
        age18.setFullYear(age18.getFullYear() - 18);
        return birth > age18;
    }
    sign(user) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        return this.jwtService.sign(payload);
    }
    sanitize(user) {
        const { password: _p, ...safe } = user;
        return safe;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        typeorm_2.DataSource])
], AuthService);
//# sourceMappingURL=auth.service.js.map