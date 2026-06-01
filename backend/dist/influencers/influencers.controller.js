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
exports.InfluencersController = void 0;
const common_1 = require("@nestjs/common");
const influencers_service_1 = require("./influencers.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
const enums_1 = require("../common/enums");
const user_entity_1 = require("../users/entities/user.entity");
const update_influencer_dto_1 = require("./dto/update-influencer.dto");
const influencer_metric_dto_1 = require("./dto/influencer-metric.dto");
let InfluencersController = class InfluencersController {
    service;
    constructor(service) {
        this.service = service;
    }
    search(red_social, ubicacion, min_seguidores, max_tarifa, page, limit) {
        const maxTarifa = max_tarifa !== undefined ? Number(max_tarifa) : undefined;
        return this.service.search({ red_social, ubicacion, min_seguidores, max_tarifa: maxTarifa, page, limit });
    }
    getMyProfile(user) {
        return this.service.getMyProfile(user);
    }
    updateProfile(user, dto) {
        return this.service.updateMyProfile(user, dto);
    }
    getPublicProfile(id) {
        return this.service.getPublicProfile(id);
    }
    getMyMetrics(user) {
        return this.service.getMyMetrics(user);
    }
    addMetric(user, dto) {
        return this.service.addMetric(user, dto);
    }
    updateMetric(user, id, dto) {
        return this.service.updateMetric(user, id, dto);
    }
    deleteMetric(user, id) {
        return this.service.deleteMetric(user, id);
    }
};
exports.InfluencersController = InfluencersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA, enums_1.UserRole.INFLUENCER, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('red_social')),
    __param(1, (0, common_1.Query)('ubicacion')),
    __param(2, (0, common_1.Query)('min_seguidores', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('max_tarifa')),
    __param(4, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(5, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String, Number, Number]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, update_influencer_dto_1.UpdateInfluencerDto]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA, enums_1.UserRole.INFLUENCER, enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "getPublicProfile", null);
__decorate([
    (0, common_1.Get)('metrics/mine'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "getMyMetrics", null);
__decorate([
    (0, common_1.Post)('metrics'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, influencer_metric_dto_1.CreateMetricDto]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "addMetric", null);
__decorate([
    (0, common_1.Patch)('metrics/:id'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number, influencer_metric_dto_1.UpdateMetricDto]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "updateMetric", null);
__decorate([
    (0, common_1.Delete)('metrics/:id'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Number]),
    __metadata("design:returntype", void 0)
], InfluencersController.prototype, "deleteMetric", null);
exports.InfluencersController = InfluencersController = __decorate([
    (0, common_1.Controller)('influencers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [influencers_service_1.InfluencersService])
], InfluencersController);
//# sourceMappingURL=influencers.controller.js.map