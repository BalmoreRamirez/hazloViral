import { ChatStatus } from '../../common/enums';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
import { Message } from './message.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';
export declare class Chat {
    id: number;
    empresa_id: number;
    influencer_id: number;
    empresa: EmpresaProfile;
    influencer: InfluencerProfile;
    status: ChatStatus;
    created_at: Date;
    messages: Message[];
    contratos: ContratoEscrow[];
}
