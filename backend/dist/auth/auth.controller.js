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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_empresa_dto_1 = require("./dto/register-empresa.dto");
const register_influencer_dto_1 = require("./dto/register-influencer.dto");
const login_dto_1 = require("./dto/login.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    registerEmpresa(dto) {
        return this.authService.registerEmpresa(dto);
    }
    registerInfluencer(dto) {
        return this.authService.registerInfluencer(dto);
    }
    login(dto) {
        return this.authService.login(dto);
    }
    me(user) {
        return user;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register/empresa'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_empresa_dto_1.RegisterEmpresaDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "registerEmpresa", null);
__decorate([
    (0, common_1.Post)('register/influencer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_influencer_dto_1.RegisterInfluencerDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "registerInfluencer", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map