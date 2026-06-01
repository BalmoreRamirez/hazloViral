import { AdminService } from './admin.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<Record<string, number>>;
    getSettings(): Promise<import("./entities/global-setting.entity").GlobalSetting[]>;
    updateSetting(key: string, dto: UpdateSettingDto): Promise<import("./entities/global-setting.entity").GlobalSetting>;
    listDisputes(): Promise<import("../contratos/entities/contrato-escrow.entity").ContratoEscrow[]>;
    resolveDispute(id: number, dto: ResolveDisputeDto): Promise<import("../contratos/entities/contrato-escrow.entity").ContratoEscrow>;
    listUsers(): Promise<any[]>;
    setUserStatus(id: number, dto: UpdateUserStatusDto): Promise<import("../users/entities/user.entity").User>;
}
