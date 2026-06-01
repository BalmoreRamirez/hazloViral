import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersRepo;
    private readonly jwtService;
    private readonly dataSource;
    constructor(usersRepo: Repository<User>, jwtService: JwtService, dataSource: DataSource);
    registerEmpresa(dto: RegisterEmpresaDto): Promise<{
        user: Omit<User, "password">;
        profile: EmpresaProfile;
        token: string;
    }>;
    registerInfluencer(dto: RegisterInfluencerDto): Promise<{
        user: Omit<User, "password">;
        profile: {
            es_menor_edad: boolean;
            id: number;
            user_id: number;
            user: User;
            nombre_artistico: string;
            bio: string;
            ubicacion: string;
            tarifa_base: number;
            disponibilidad: boolean;
            fecha_nacimiento: string;
            tutor_nombre: string;
            tutor_documento_id: string;
            tutor_email: string;
            tutor_autorizacion: boolean;
            metrics: import("../influencers/entities/influencer-metric.entity").InfluencerMetric[];
            chats: import("../chats/entities/chat.entity").Chat[];
            contratos: import("../contratos/entities/contrato-escrow.entity").ContratoEscrow[];
        };
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: Omit<User, "password">;
        token: string;
    }>;
    private assertEmailFree;
    private calcularEsMenor;
    private sign;
    private sanitize;
}
