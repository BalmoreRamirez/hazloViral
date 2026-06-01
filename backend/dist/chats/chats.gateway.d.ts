import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatsService } from './chats.service';
import { CreditsService } from '../credits/credits.service';
import { UserRole } from '../common/enums';
interface AuthSocket extends Socket {
    data: {
        userId: number;
        email: string;
        role: UserRole;
    };
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly chatsService;
    private readonly creditsService;
    server: Server;
    constructor(jwtService: JwtService, chatsService: ChatsService, creditsService: CreditsService);
    handleConnection(socket: AuthSocket): Promise<void>;
    handleDisconnect(socket: AuthSocket): void;
    handleJoinChat(socket: AuthSocket, data: {
        chat_id: number;
    }): Promise<void>;
    handleSendMessage(socket: AuthSocket, raw: unknown): Promise<void>;
    notifyCreditUpdate(empresaUserId: number): Promise<void>;
}
export {};
