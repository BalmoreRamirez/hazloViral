import { User } from '../../users/entities/user.entity';
import { CampaignBrief } from '../../campaigns/entities/campaign-brief.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';
export declare class EmpresaProfile {
    id: number;
    user_id: number;
    user: User;
    nombre_comercial: string;
    sitio_web: string;
    balance_creditos: number;
    umbral_creditos: number;
    briefs: CampaignBrief[];
    chats: Chat[];
    contratos: ContratoEscrow[];
}
