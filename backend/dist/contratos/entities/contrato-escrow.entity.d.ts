import { ContratoStatus } from '../../common/enums';
import { Chat } from '../../chats/entities/chat.entity';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
export interface Entregable {
    tipo: string;
    descripcion: string;
}
export declare class ContratoEscrow {
    id: number;
    chat_id: number;
    empresa_id: number;
    influencer_id: number;
    chat: Chat;
    empresa: EmpresaProfile;
    influencer: InfluencerProfile;
    monto_total: number;
    comision_plataforma: number;
    entregables: Entregable[];
    fecha_limite_entrega: string;
    status: ContratoStatus;
    stripe_charge_id: string;
    stripe_transfer_id: string;
    created_at: Date;
    updated_at: Date;
}
