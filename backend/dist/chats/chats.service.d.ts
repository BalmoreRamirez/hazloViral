import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { CreditsService } from '../credits/credits.service';
import { OpenChatDto } from './dto/open-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from '../users/entities/user.entity';
export declare class ChatsService {
    private readonly chatsRepo;
    private readonly messagesRepo;
    private readonly empresasRepo;
    private readonly influencersRepo;
    private readonly creditsService;
    constructor(chatsRepo: Repository<Chat>, messagesRepo: Repository<Message>, empresasRepo: Repository<EmpresaProfile>, influencersRepo: Repository<InfluencerProfile>, creditsService: CreditsService);
    openChat(user: User, dto: OpenChatDto): Promise<Chat>;
    listChats(user: User): Promise<Chat[]>;
    getMessages(chatId: number, user: User, limit?: number, offset?: number): Promise<Message[]>;
    saveMessage(user: User, dto: SendMessageDto): Promise<Message>;
    assertParticipant(chatId: number, user: User): Promise<Chat>;
    getEmpresaId(userId: number): Promise<number | null>;
}
