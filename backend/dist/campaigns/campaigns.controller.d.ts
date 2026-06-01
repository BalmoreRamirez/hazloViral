import { CampaignsService } from './campaigns.service';
import { User } from '../users/entities/user.entity';
import { CreateCampaignBriefDto, UpdateCampaignBriefDto } from './dto/campaign-brief.dto';
export declare class CampaignsController {
    private readonly service;
    constructor(service: CampaignsService);
    create(user: User, dto: CreateCampaignBriefDto): Promise<import("./entities/campaign-brief.entity").CampaignBrief>;
    findAll(user: User): Promise<import("./entities/campaign-brief.entity").CampaignBrief[]>;
    findOne(user: User, id: number): Promise<import("./entities/campaign-brief.entity").CampaignBrief>;
    update(user: User, id: number, dto: UpdateCampaignBriefDto): Promise<import("./entities/campaign-brief.entity").CampaignBrief>;
    remove(user: User, id: number): Promise<void>;
}
