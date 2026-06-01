import { Repository } from 'typeorm';
import { EmpresaProfile } from './entities/empresa-profile.entity';
import { User } from '../users/entities/user.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
export declare class EmpresasService {
    private readonly repo;
    constructor(repo: Repository<EmpresaProfile>);
    getMyProfile(user: User): Promise<EmpresaProfile>;
    updateMyProfile(user: User, dto: UpdateEmpresaDto): Promise<EmpresaProfile>;
}
