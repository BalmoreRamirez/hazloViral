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
exports.EmpresasController = void 0;
const common_1 = require("@nestjs/common");
const empresas_service_1 = require("./empresas.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
const enums_1 = require("../common/enums");
const user_entity_1 = require("../users/entities/user.entity");
const update_empresa_dto_1 = require("./dto/update-empresa.dto");
let EmpresasController = class EmpresasController {
    service;
    constructor(service) {
        this.service = service;
    }
    getProfile(user) {
        return this.service.getMyProfile(user);
    }
    updateProfile(user, dto) {
        return this.service.updateMyProfile(user, dto);
    }
};
exports.EmpresasController = EmpresasController;
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], EmpresasController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, update_empresa_dto_1.UpdateEmpresaDto]),
    __metadata("design:returntype", void 0)
], EmpresasController.prototype, "updateProfile", null);
exports.EmpresasController = EmpresasController = __decorate([
    (0, common_1.Controller)('empresas'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA),
    __metadata("design:paramtypes", [empresas_service_1.EmpresasService])
], EmpresasController);
//# sourceMappingURL=empresas.controller.js.map