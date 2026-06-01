import { User } from '../../users/entities/user.entity';
import { InfluencerMetric } from './influencer-metric.entity';
import { Chat } from '../../chats/entities/chat.entity';
import { ContratoEscrow } from '../../contratos/entities/contrato-escrow.entity';
export declare class InfluencerProfile {
    id: number;
    user_id: number;
    user: User;
    nombre_artistico: string;
    bio: string;
    ubicacion: string;
    tarifa_base: number;
    disponibilidad: boolean;
    fecha_nacimiento: string;
    get es_menor_edad(): boolean;
    tutor_nombre: string;
    tutor_documento_id: string;
    tutor_email: string;
    tutor_autorizacion: boolean;
    metrics: InfluencerMetric[];
    chats: Chat[];
    contratos: ContratoEscrow[];
}
