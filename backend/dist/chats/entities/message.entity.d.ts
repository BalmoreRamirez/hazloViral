import { ProposalStatus } from '../../common/enums';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';
import { CampaignBrief } from '../../campaigns/entities/campaign-brief.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';
import type { ProposalData } from '../../common/types';
export declare class Message {
    id: number;
    chat_id: number;
    sender_id: number;
    campaign_brief_id: number;
    contrato_id: number;
    chat: Chat;
    sender: User;
    campaignBrief: CampaignBrief;
    contrato: ContratoEscrow;
    message_text: string;
    is_proposal: boolean;
    proposal_data: ProposalData;
    proposal_status: ProposalStatus;
    created_at: Date;
}
