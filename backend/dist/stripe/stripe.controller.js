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
exports.StripeController = void 0;
const common_1 = require("@nestjs/common");
const stripe_service_1 = require("./stripe.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
const enums_1 = require("../common/enums");
const user_entity_1 = require("../users/entities/user.entity");
const create_credit_checkout_dto_1 = require("./dto/create-credit-checkout.dto");
let StripeController = class StripeController {
    stripeService;
    constructor(stripeService) {
        this.stripeService = stripeService;
    }
    createCreditsCheckout(user, dto) {
        return this.stripeService.createCreditsCheckoutSession(user.id, dto.amount_usd);
    }
    createContractCheckout(contratoId, user) {
        return this.stripeService.createContractCheckoutSession(contratoId, user.id);
    }
    connectOnboard(user) {
        return this.stripeService.createConnectOnboardingLink(user.id);
    }
    async handleWebhook(signature, req) {
        if (!signature)
            throw new common_1.BadRequestException('stripe-signature header requerido.');
        const rawBody = req.rawBody;
        if (!rawBody)
            throw new common_1.BadRequestException('Raw body no disponible.');
        try {
            return await this.stripeService.handleWebhook(signature, rawBody);
        }
        catch (err) {
            throw new common_1.BadRequestException(`Webhook inválido: ${err?.message ?? 'firma incorrecta'}`);
        }
    }
};
exports.StripeController = StripeController;
__decorate([
    (0, common_1.Post)('credits/checkout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        create_credit_checkout_dto_1.CreateCreditCheckoutDto]),
    __metadata("design:returntype", void 0)
], StripeController.prototype, "createCreditsCheckout", null);
__decorate([
    (0, common_1.Post)('contract-checkout/:contratoId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA),
    __param(0, (0, common_1.Param)('contratoId', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], StripeController.prototype, "createContractCheckout", null);
__decorate([
    (0, common_1.Post)('connect/onboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], StripeController.prototype, "connectOnboard", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Headers)('stripe-signature')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StripeController.prototype, "handleWebhook", null);
exports.StripeController = StripeController = __decorate([
    (0, common_1.Controller)('stripe'),
    __metadata("design:paramtypes", [stripe_service_1.StripeService])
], StripeController);
//# sourceMappingURL=stripe.controller.js.map