import { UserRole } from '../../common/enums';
import { EmpresaProfile } from '../../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../../influencers/entities/influencer-profile.entity';
export declare class User {
    id: number;
    email: string;
    password: string;
    role: UserRole;
    stripe_customer_id: string;
    stripe_connect_id: string;
    is_active: boolean;
    created_at: Date;
    empresaProfile: EmpresaProfile;
    influencerProfile: InfluencerProfile;
}
