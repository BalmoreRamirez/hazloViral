import { ChatsService } from './chats.service';
import { User } from '../users/entities/user.entity';
import { OpenChatDto } from './dto/open-chat.dto';
export declare class ChatsController {
    private readonly chatsService;
    constructor(chatsService: ChatsService);
    openChat(user: User, dto: OpenChatDto): Promise<import("./entities/chat.entity").Chat>;
    listChats(user: User): Promise<import("./entities/chat.entity").Chat[]>;
    getMessages(chatId: number, user: User, limit: number, offset: number): Promise<import("./entities/message.entity").Message[]>;
}
