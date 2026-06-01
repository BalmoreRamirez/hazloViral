import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { GlobalSetting } from './entities/global-setting.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { User } from '../users/entities/user.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
export declare class AdminService implements OnApplicationBootstrap {
    private readonly settingsRepo;
    private readonly contratosRepo;
    private readonly usersRepo;
    private readonly empresasRepo;
    private readonly influencersRepo;
    private readonly logger;
    constructor(settingsRepo: Repository<GlobalSetting>, contratosRepo: Repository<ContratoEscrow>, usersRepo: Repository<User>, empresasRepo: Repository<EmpresaProfile>, influencersRepo: Repository<InfluencerProfile>);
    onApplicationBootstrap(): Promise<void>;
    get(key: string): Promise<string | null>;
    getNumber(key: string, fallback: number): Promise<number>;
    findAll(): Promise<GlobalSetting[]>;
    set(key: string, value: string, description?: string): Promise<GlobalSetting>;
    listDisputes(): Promise<ContratoEscrow[]>;
    resolveDispute(id: number, dto: ResolveDisputeDto): Promise<ContratoEscrow>;
    listUsers(): Promise<any[]>;
    setUserStatus(id: number, is_active: boolean): Promise<User>;
    getStats(): Promise<Record<string, number>>;
    private seedDefaults;
    private seedAdminUser;
}
