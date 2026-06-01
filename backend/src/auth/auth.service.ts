import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { UserRole } from '../common/enums';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 10;
// Bono de bienvenida definido en claude.md §5.1
const WELCOME_BONUS = 10.0;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Registro Empresa ────────────────────────────────────────────────────────
  async registerEmpresa(dto: RegisterEmpresaDto) {
    await this.assertEmailFree(dto.email);

    return this.dataSource.transaction(async (manager) => {
      const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

      const user = new User();
      user.email = dto.email;
      user.password = hashed;
      user.role = UserRole.EMPRESA;
      await manager.save(user);

      const profile = new EmpresaProfile();
      profile.user_id = user.id;
      profile.nombre_comercial = dto.nombre_comercial;
      if (dto.sitio_web) profile.sitio_web = dto.sitio_web;
      profile.balance_creditos = WELCOME_BONUS; // §5.1 Bono de bienvenida
      profile.umbral_creditos = 5.0;
      await manager.save(profile);

      return { user: this.sanitize(user), profile, token: this.sign(user) };
    });
  }

  // ─── Registro Influencer ─────────────────────────────────────────────────────
  async registerInfluencer(dto: RegisterInfluencerDto) {
    await this.assertEmailFree(dto.email);

    const esMenor = this.calcularEsMenor(dto.fecha_nacimiento);

    // §4.2 — si es menor, los campos del tutor son obligatorios
    if (esMenor) {
      if (!dto.tutor_nombre || !dto.tutor_documento_id || !dto.tutor_email) {
        throw new BadRequestException(
          'Influencers menores de 18 años deben proporcionar los datos del tutor legal.',
        );
      }
      if (!dto.tutor_autorizacion) {
        throw new BadRequestException(
          'El tutor legal debe confirmar la autorización para influencers menores de edad.',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

      const user = new User();
      user.email = dto.email;
      user.password = hashed;
      user.role = UserRole.INFLUENCER;
      await manager.save(user);

      const profile = new InfluencerProfile();
      profile.user_id = user.id;
      profile.nombre_artistico = dto.nombre_artistico;
      if (dto.bio) profile.bio = dto.bio;
      if (dto.ubicacion) profile.ubicacion = dto.ubicacion;
      profile.tarifa_base = dto.tarifa_base ?? 0;
      profile.fecha_nacimiento = dto.fecha_nacimiento;
      profile.tutor_nombre = esMenor ? (dto.tutor_nombre ?? '') : '';
      profile.tutor_documento_id = esMenor ? (dto.tutor_documento_id ?? '') : '';
      profile.tutor_email = esMenor ? (dto.tutor_email ?? '') : '';
      profile.tutor_autorizacion = esMenor ? (dto.tutor_autorizacion ?? false) : false;
      await manager.save(profile);

      return {
        user: this.sanitize(user),
        profile: { ...profile, es_menor_edad: esMenor },
        token: this.sign(user),
      };
    });
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email, is_active: true },
      select: { id: true, email: true, password: true, role: true, is_active: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    return { user: this.sanitize(user), token: this.sign(user) };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private async assertEmailFree(email: string): Promise<void> {
    const exists = await this.usersRepo.existsBy({ email });
    if (exists) throw new ConflictException('El email ya está registrado.');
  }

  private calcularEsMenor(fechaNacimiento: string): boolean {
    const birth = new Date(fechaNacimiento);
    const age18 = new Date();
    age18.setFullYear(age18.getFullYear() - 18);
    return birth > age18;
  }

  private sign(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  private sanitize(user: User): Omit<User, 'password'> {
    const { password: _p, ...safe } = user as User & { password: string };
    return safe;
  }
}
