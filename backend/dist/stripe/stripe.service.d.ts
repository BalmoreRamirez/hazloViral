import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { Message } from '../chats/entities/message.entity';
import { ChatGateway } from '../chats/chats.gateway';
import { CreditsService } from '../credits/credits.service';
export declare class StripeService {
    private readonly config;
    private readonly usersRepo;
    private readonly empresasRepo;
    private readonly influencersRepo;
    private readonly contratosRepo;
    private readonly messagesRepo;
    private readonly chatGateway;
    private readonly creditsService;
    private readonly stripe;
    private readonly logger;
    private readonly frontendUrl;
    constructor(config: ConfigService, usersRepo: Repository<User>, empresasRepo: Repository<EmpresaProfile>, influencersRepo: Repository<InfluencerProfile>, contratosRepo: Repository<ContratoEscrow>, messagesRepo: Repository<Message>, chatGateway: ChatGateway, creditsService: CreditsService);
    createCreditsCheckoutSession(userId: number, amountUsd: number): Promise<{
        url: string;
    }>;
    createContractCheckoutSession(contratoId: number, userId: number): Promise<{
        url: string;
    }>;
    createConnectOnboardingLink(userId: number): Promise<{
        url: string;
    }>;
    payoutToInfluencer(contratoId: number): Promise<string | null>;
    handleWebhook(signature: string, rawBody: Buffer): Promise<{
        received: boolean;
    }>;
    private handleCheckoutCompleted;
    private handleAccountUpdated;
    private ensureStripeCustomer;
}
