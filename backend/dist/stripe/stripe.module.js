"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const stripe_service_1 = require("./stripe.service");
const stripe_controller_1 = require("./stripe.controller");
const user_entity_1 = require("../users/entities/user.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const contrato_escrow_entity_1 = require("../contratos/entities/contrato-escrow.entity");
const credits_module_1 = require("../credits/credits.module");
const auth_module_1 = require("../auth/auth.module");
let StripeModule = class StripeModule {
};
exports.StripeModule = StripeModule;
exports.StripeModule = StripeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, empresa_profile_entity_1.EmpresaProfile, influencer_profile_entity_1.InfluencerProfile, contrato_escrow_entity_1.ContratoEscrow]),
            credits_module_1.CreditsModule,
            auth_module_1.AuthModule,
        ],
        controllers: [stripe_controller_1.StripeController],
        providers: [stripe_service_1.StripeService],
        exports: [stripe_service_1.StripeService],
    })
], StripeModule);
//# sourceMappingURL=stripe.module.js.map