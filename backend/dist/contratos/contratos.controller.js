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
exports.ContratosController = void 0;
const common_1 = require("@nestjs/common");
const contratos_service_1 = require("./contratos.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
const enums_1 = require("../common/enums");
const user_entity_1 = require("../users/entities/user.entity");
const accept_proposal_dto_1 = require("./dto/accept-proposal.dto");
const submit_deliverables_dto_1 = require("./dto/submit-deliverables.dto");
const dispute_dto_1 = require("./dto/dispute.dto");
let ContratosController = class ContratosController {
    contratosService;
    constructor(contratosService) {
        this.contratosService = contratosService;
    }
    listMyContratos(user) {
        return this.contratosService.listMyContratos(user);
    }
    findOne(id, user) {
        return this.contratosService.findOne(user, id);
    }
    acceptProposal(user, dto) {
        return this.contratosService.acceptProposal(user, dto);
    }
    fundContract(id, user) {
        return this.contratosService.fundContract(user, id);
    }
    submitDeliverables(id, user, dto) {
        return this.contratosService.submitDeliverables(user, id, dto);
    }
    approveAndRelease(id, user) {
        return this.contratosService.approveAndRelease(user, id);
    }
    initiateDispute(id, user, dto) {
        return this.contratosService.initiateDispute(user, id, dto);
    }
};
exports.ContratosController = ContratosController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA, enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ContratosController.prototype, "listMyContratos", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA, enums_1.UserRole.INFLUENCER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ContratosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('accept-proposal'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, accept_proposal_dto_1.AcceptProposalDto]),
    __metadata("design:returntype", void 0)
], ContratosController.prototype, "acceptProposal", null);
__decorate([
    (0, common_1.Post)(':id/fund'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ContratosController.prototype, "fundContract", null);
__decorate([
    (0, common_1.Post)(':id/submit-deliverables'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User,
        submit_deliverables_dto_1.SubmitDeliverablesDto]),
    __metadata("design:returntype", void 0)
], ContratosController.prototype, "submitDeliverables", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ContratosController.prototype, "approveAndRelease", null);
__decorate([
    (0, common_1.Post)(':id/dispute'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA, enums_1.UserRole.INFLUENCER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User,
        dispute_dto_1.DisputeDto]),
    __metadata("design:returntype", void 0)
], ContratosController.prototype, "initiateDispute", null);
exports.ContratosController = ContratosController = __decorate([
    (0, common_1.Controller)('contratos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [contratos_service_1.ContratosService])
], ContratosController);
//# sourceMappingURL=contratos.controller.js.map