import { InfluencersService } from './influencers.service';
import { User } from '../users/entities/user.entity';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { CreateMetricDto, UpdateMetricDto } from './dto/influencer-metric.dto';
export declare class InfluencersController {
    private readonly service;
    constructor(service: InfluencersService);
    search(red_social?: string, ubicacion?: string, min_seguidores?: number, max_tarifa?: string, page?: number, limit?: number): Promise<{
        data: import("./entities/influencer-profile.entity").InfluencerProfile[];
        total: number;
    }>;
    getMyProfile(user: User): Promise<import("./entities/influencer-profile.entity").InfluencerProfile>;
    updateProfile(user: User, dto: UpdateInfluencerDto): Promise<import("./entities/influencer-profile.entity").InfluencerProfile>;
    getPublicProfile(id: number): Promise<import("./entities/influencer-profile.entity").InfluencerProfile>;
    getMyMetrics(user: User): Promise<import("./entities/influencer-metric.entity").InfluencerMetric[]>;
    addMetric(user: User, dto: CreateMetricDto): Promise<import("./entities/influencer-metric.entity").InfluencerMetric>;
    updateMetric(user: User, id: number, dto: UpdateMetricDto): Promise<import("./entities/influencer-metric.entity").InfluencerMetric>;
    deleteMetric(user: User, id: number): Promise<void>;
}
