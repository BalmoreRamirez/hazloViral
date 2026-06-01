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
exports.ChatsController = void 0;
const common_1 = require("@nestjs/common");
const chats_service_1 = require("./chats.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
const enums_1 = require("../common/enums");
const user_entity_1 = require("../users/entities/user.entity");
const open_chat_dto_1 = require("./dto/open-chat.dto");
let ChatsController = class ChatsController {
    chatsService;
    constructor(chatsService) {
        this.chatsService = chatsService;
    }
    openChat(user, dto) {
        return this.chatsService.openChat(user, dto);
    }
    listChats(user) {
        return this.chatsService.listChats(user);
    }
    getMessages(chatId, user, limit, offset) {
        return this.chatsService.getMessages(chatId, user, limit, offset);
    }
};
exports.ChatsController = ChatsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, open_chat_dto_1.OpenChatDto]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "openChat", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA, enums_1.UserRole.INFLUENCER),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "listChats", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.EMPRESA, enums_1.UserRole.INFLUENCER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User, Number, Number]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "getMessages", null);
exports.ChatsController = ChatsController = __decorate([
    (0, common_1.Controller)('chats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [chats_service_1.ChatsService])
], ChatsController);
//# sourceMappingURL=chats.controller.js.map