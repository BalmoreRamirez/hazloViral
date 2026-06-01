import { Repository } from 'typeorm';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { InfluencerMetric } from './entities/influencer-metric.entity';
import { User } from '../users/entities/user.entity';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { CreateMetricDto, UpdateMetricDto } from './dto/influencer-metric.dto';
export interface SearchInfluencerQuery {
    red_social?: string;
    ubicacion?: string;
    min_seguidores?: number;
    max_tarifa?: number;
    disponible?: boolean;
    page?: number;
    limit?: number;
}
export declare class InfluencersService {
    private readonly profilesRepo;
    private readonly metricsRepo;
    constructor(profilesRepo: Repository<InfluencerProfile>, metricsRepo: Repository<InfluencerMetric>);
    getMyProfile(user: User): Promise<InfluencerProfile>;
    updateMyProfile(user: User, dto: UpdateInfluencerDto): Promise<InfluencerProfile>;
    search(query: SearchInfluencerQuery): Promise<{
        data: InfluencerProfile[];
        total: number;
    }>;
    getPublicProfile(id: number): Promise<InfluencerProfile>;
    addMetric(user: User, dto: CreateMetricDto): Promise<InfluencerMetric>;
    getMyMetrics(user: User): Promise<InfluencerMetric[]>;
    updateMetric(user: User, metricId: number, dto: UpdateMetricDto): Promise<InfluencerMetric>;
    deleteMetric(user: User, metricId: number): Promise<void>;
    private assertOwnsMetric;
}
