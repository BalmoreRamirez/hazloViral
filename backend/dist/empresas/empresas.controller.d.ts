import { EmpresasService } from './empresas.service';
import { User } from '../users/entities/user.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
export declare class EmpresasController {
    private readonly service;
    constructor(service: EmpresasService);
    getProfile(user: User): Promise<import("./entities/empresa-profile.entity").EmpresaProfile>;
    updateProfile(user: User, dto: UpdateEmpresaDto): Promise<import("./entities/empresa-profile.entity").EmpresaProfile>;
}
