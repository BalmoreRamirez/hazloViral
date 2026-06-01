import { Repository } from 'typeorm';
import { CampaignBrief } from './entities/campaign-brief.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { User } from '../users/entities/user.entity';
import { CreateCampaignBriefDto, UpdateCampaignBriefDto } from './dto/campaign-brief.dto';
export declare class CampaignsService {
    private readonly briefsRepo;
    private readonly empresasRepo;
    constructor(briefsRepo: Repository<CampaignBrief>, empresasRepo: Repository<EmpresaProfile>);
    private getEmpresaId;
    create(user: User, dto: CreateCampaignBriefDto): Promise<CampaignBrief>;
    findAll(user: User): Promise<CampaignBrief[]>;
    findOne(user: User, id: number): Promise<CampaignBrief>;
    update(user: User, id: number, dto: UpdateCampaignBriefDto): Promise<CampaignBrief>;
    remove(user: User, id: number): Promise<void>;
}
