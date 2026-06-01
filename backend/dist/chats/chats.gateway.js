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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const chats_service_1 = require("./chats.service");
const credits_service_1 = require("../credits/credits.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const enums_1 = require("../common/enums");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
let ChatGateway = class ChatGateway {
    jwtService;
    chatsService;
    creditsService;
    server;
    constructor(jwtService, chatsService, creditsService) {
        this.jwtService = jwtService;
        this.chatsService = chatsService;
        this.creditsService = creditsService;
    }
    async handleConnection(socket) {
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) {
            socket.emit('error', { message: 'Token requerido.' });
            socket.disconnect();
            return;
        }
        try {
            const payload = this.jwtService.verify(token);
            socket.data.userId = payload.sub;
            socket.data.email = payload.email;
            socket.data.role = payload.role;
            if (payload.role === enums_1.UserRole.EMPRESA) {
                const empresaId = await this.chatsService.getEmpresaId(payload.sub);
                if (empresaId) {
                    const balance = await this.creditsService.getBalanceByEmpresaId(empresaId);
                    socket.emit('credit_status', balance);
                }
            }
        }
        catch {
            socket.emit('error', { message: 'Token inválido.' });
            socket.disconnect();
        }
    }
    handleDisconnect(socket) {
        void socket;
    }
    async handleJoinChat(socket, data) {
        if (!socket.data.userId) {
            socket.emit('error', { message: 'No autenticado.' });
            return;
        }
        try {
            const user = { id: socket.data.userId, role: socket.data.role };
            await this.chatsService.assertParticipant(data.chat_id, user);
            const room = `chat-${data.chat_id}`;
            await socket.join(room);
            socket.emit('joined_chat', { chat_id: data.chat_id, room });
        }
        catch (err) {
            socket.emit('error', { message: err?.message ?? 'Error al unirse al chat.' });
        }
    }
    async handleSendMessage(socket, raw) {
        if (!socket.data.userId) {
            socket.emit('error', { message: 'No autenticado.' });
            return;
        }
        const dto = (0, class_transformer_1.plainToInstance)(send_message_dto_1.SendMessageDto, raw);
        const errors = await (0, class_validator_1.validate)(dto);
        if (errors.length > 0) {
            socket.emit('error', { message: 'Datos del mensaje inválidos.', errors });
            return;
        }
        try {
            const user = { id: socket.data.userId, role: socket.data.role };
            const message = await this.chatsService.saveMessage(user, dto);
            this.server.to(`chat-${dto.chat_id}`).emit('new_message', message);
            if (socket.data.role === enums_1.UserRole.EMPRESA) {
                const empresaId = await this.chatsService.getEmpresaId(socket.data.userId);
                if (empresaId) {
                    const balance = await this.creditsService.getBalanceByEmpresaId(empresaId);
                    socket.emit('credit_status', balance);
                    if (!balance.is_above_threshold) {
                        socket.emit('chat_blocked', {
                            message: 'Tus créditos cayeron bajo el umbral. El chat está en solo lectura.',
                            balance,
                        });
                    }
                }
            }
        }
        catch (err) {
            const isCreditError = err?.message?.includes('solo lectura') || err?.message?.includes('créditos');
            socket.emit(isCreditError ? 'chat_blocked' : 'error', {
                message: err?.message ?? 'Error al enviar el mensaje.',
            });
        }
    }
    async notifyCreditUpdate(empresaUserId) {
        const empresaId = await this.chatsService.getEmpresaId(empresaUserId);
        if (!empresaId)
            return;
        const balance = await this.creditsService.getBalanceByEmpresaId(empresaId);
        this.server.emit(`credit_update:${empresaUserId}`, balance);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_chat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: 'http://localhost:5173', credentials: true },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        chats_service_1.ChatsService,
        credits_service_1.CreditsService])
], ChatGateway);
//# sourceMappingURL=chats.gateway.js.map