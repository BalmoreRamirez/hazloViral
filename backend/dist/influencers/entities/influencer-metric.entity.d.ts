import { InfluencerProfile } from './influencer-profile.entity';
export declare class InfluencerMetric {
    id: number;
    influencer_id: number;
    influencer: InfluencerProfile;
    red_social: string;
    username: string;
    seguidores: number;
    engagement_rate: number;
    updated_at: Date;
}
