import { DataSource, Repository } from 'typeorm';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { AdminService } from '../admin/admin.service';
export interface BalanceInfo {
    empresa_id: number;
    balance_creditos: number;
    umbral_creditos: number;
    is_above_threshold: boolean;
    deficit: number;
}
export declare class CreditsService {
    private readonly empresasRepo;
    private readonly adminService;
    private readonly dataSource;
    constructor(empresasRepo: Repository<EmpresaProfile>, adminService: AdminService, dataSource: DataSource);
    getBalance(userId: number): Promise<BalanceInfo>;
    getBalanceByEmpresaId(empresaId: number): Promise<BalanceInfo>;
    isAboveThreshold(empresaId: number): Promise<boolean>;
    deductChatOpenCost(empresaId: number): Promise<BalanceInfo>;
    addCredits(empresaId: number, amount: number): Promise<BalanceInfo>;
    updateThreshold(empresaId: number, newThreshold: number): Promise<BalanceInfo>;
    private buildBalanceInfo;
}
