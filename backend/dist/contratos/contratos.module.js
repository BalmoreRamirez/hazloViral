"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContratosModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contrato_escrow_entity_1 = require("./entities/contrato-escrow.entity");
const message_entity_1 = require("../chats/entities/message.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const contratos_service_1 = require("./contratos.service");
const contratos_controller_1 = require("./contratos.controller");
const chats_module_1 = require("../chats/chats.module");
const admin_module_1 = require("../admin/admin.module");
const stripe_module_1 = require("../stripe/stripe.module");
let ContratosModule = class ContratosModule {
};
exports.ContratosModule = ContratosModule;
exports.ContratosModule = ContratosModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([contrato_escrow_entity_1.ContratoEscrow, message_entity_1.Message, empresa_profile_entity_1.EmpresaProfile, influencer_profile_entity_1.InfluencerProfile]),
            chats_module_1.ChatsModule,
            admin_module_1.AdminModule,
            stripe_module_1.StripeModule,
        ],
        controllers: [contratos_controller_1.ContratosController],
        providers: [contratos_service_1.ContratosService],
        exports: [contratos_service_1.ContratosService],
    })
], ContratosModule);
//# sourceMappingURL=contratos.module.js.map