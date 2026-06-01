"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const chat_entity_1 = require("./entities/chat.entity");
const message_entity_1 = require("./entities/message.entity");
const empresa_profile_entity_1 = require("../empresas/entities/empresa-profile.entity");
const influencer_profile_entity_1 = require("../influencers/entities/influencer-profile.entity");
const chats_service_1 = require("./chats.service");
const chats_controller_1 = require("./chats.controller");
const chats_gateway_1 = require("./chats.gateway");
const credits_module_1 = require("../credits/credits.module");
const auth_module_1 = require("../auth/auth.module");
let ChatsModule = class ChatsModule {
};
exports.ChatsModule = ChatsModule;
exports.ChatsModule = ChatsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([chat_entity_1.Chat, message_entity_1.Message, empresa_profile_entity_1.EmpresaProfile, influencer_profile_entity_1.InfluencerProfile]),
            credits_module_1.CreditsModule,
            auth_module_1.AuthModule,
        ],
        controllers: [chats_controller_1.ChatsController],
        providers: [chats_service_1.ChatsService, chats_gateway_1.ChatGateway],
        exports: [chats_service_1.ChatsService, chats_gateway_1.ChatGateway],
    })
], ChatsModule);
//# sourceMappingURL=chats.module.js.map