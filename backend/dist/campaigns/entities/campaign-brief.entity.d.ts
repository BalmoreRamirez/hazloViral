import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { Message } from '../../chats/entities/message.entity';
export declare class CampaignBrief {
    id: number;
    empresa_id: number;
    empresa: EmpresaProfile;
    titulo_campana: string;
    objetivo_principal: string;
    tono_de_voz: string;
    puntos_clave_si: string;
    restricciones_no: string;
    recursos_esteticos: string;
    created_at: Date;
    messages: Message[];
}
