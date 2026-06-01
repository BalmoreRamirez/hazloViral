import type { ProposalData } from '../../common/types';
export declare class SendMessageDto {
    chat_id: number;
    message_text?: string;
    is_proposal?: boolean;
    proposal_data?: ProposalData;
    campaign_brief_id?: number;
}
