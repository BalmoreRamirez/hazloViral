import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { UserRole } from '../common/enums';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

const SALT_ROUNDS = 10;
// Bono de bienvenida definido en claude.md §5.1
const WELCOME_BONUS = 10.0;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepo: Repository<PasswordResetToken>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerifRepo: Repository<EmailVerificationToken>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
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
      if (dto.sitio_web)  profile.sitio_web  = dto.sitio_web;
      if (dto.pais)       profile.pais       = dto.pais;
      if (dto.direccion)  profile.direccion  = dto.direccion;
      profile.representante_tipo_identificacion   = dto.representante_tipo_identificacion;
      profile.representante_numero_identificacion = dto.representante_numero_identificacion;
      profile.balance_creditos = WELCOME_BONUS; // §5.1 Bono de bienvenida
      profile.umbral_creditos = 5.0;
      await manager.save(profile);

      const result = { user: this.sanitize(user), profile, token: this.sign(user) };
      const devVerifyUrl = await this.sendVerificationEmail(user);
      return devVerifyUrl ? { ...result, dev_verify_url: devVerifyUrl } : result;
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
      if (dto.bio)       profile.bio       = dto.bio;
      if (dto.ubicacion) profile.ubicacion = dto.ubicacion;
      if (dto.direccion) profile.direccion = dto.direccion;
      profile.tarifa_base = dto.tarifa_base ?? 0;
      profile.fecha_nacimiento = dto.fecha_nacimiento;
      profile.tipo_identificacion   = dto.tipo_identificacion;
      profile.numero_identificacion = dto.numero_identificacion;
      profile.tutor_nombre = esMenor ? (dto.tutor_nombre ?? '') : '';
      profile.tutor_documento_id = esMenor ? (dto.tutor_documento_id ?? '') : '';
      profile.tutor_email = esMenor ? (dto.tutor_email ?? '') : '';
      profile.tutor_autorizacion = esMenor ? (dto.tutor_autorizacion ?? false) : false;
      await manager.save(profile);

      const result = {
        user: this.sanitize(user),
        profile: { ...profile, es_menor_edad: esMenor },
        token: this.sign(user),
      };

      if (esMenor) {
        this.notifications
          .sendTutorConfirmation({
            tutorEmail:        dto.tutor_email!,
            tutorNombre:       dto.tutor_nombre!,
            influencerNombre:  dto.nombre_artistico,
            influencerEmail:   dto.email,
          })
          .catch(() => undefined);
      }

      const devVerifyUrl = await this.sendVerificationEmail(user);
      return devVerifyUrl ? { ...result, dev_verify_url: devVerifyUrl } : result;
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

  // ─── Cambio de contraseña ────────────────────────────────────────────────────
  async changePassword(userId: number, currentPwd: string, newPwd: string): Promise<void> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: { id: true, email: true, password: true, role: true, is_active: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const valid = await bcrypt.compare(currentPwd, user.password);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta.');
    user.password = await bcrypt.hash(newPwd, 10);
    await this.usersRepo.save(user);
  }

  // ─── Verificación de email ────────────────────────────────────────────────────
  private async createEmailVerificationToken(userId: number): Promise<string> {
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.emailVerifRepo.update({ user_id: userId, used: false }, { used: true });

    const record = new EmailVerificationToken();
    record.user_id    = userId;
    record.token_hash = tokenHash;
    record.expires_at = expiresAt;
    await this.emailVerifRepo.save(record);
    return rawToken;
  }

  private async sendVerificationEmail(user: User): Promise<string | undefined> {
    const rawToken   = await this.createEmailVerificationToken(user.id);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const verifyUrl  = `${frontendUrl}/verify-email?token=${rawToken}`;
    let devUrl: string | undefined;

    try {
      await this.notifications.sendEmailVerification({ email: user.email, verifyUrl });
    } catch {
      // Error ya logueado en NotificationsService
    }

    if (this.config.get<string>('NODE_ENV') !== 'production') devUrl = verifyUrl;
    return devUrl;
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.emailVerifRepo.findOne({ where: { token_hash: tokenHash, used: false } });
    if (!record) throw new BadRequestException('El enlace de verificación no es válido o ya fue usado.');
    if (record.expires_at < new Date()) throw new BadRequestException('El enlace expiró. Solicita uno nuevo desde tu perfil.');

    await this.usersRepo.update({ id: record.user_id }, { is_email_verified: true });
    record.used = true;
    await this.emailVerifRepo.save(record);
  }

  async resendVerificationEmail(userId: number): Promise<{ dev_verify_url?: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (user.is_email_verified) throw new BadRequestException('El correo ya está verificado.');

    const devUrl = await this.sendVerificationEmail(user);
    return devUrl ? { dev_verify_url: devUrl } : {};
  }

  async testSmtp(): Promise<{ ok: boolean; message: string }> {
    try {
      const message = await this.notifications.testConnection();
      return { ok: true, message };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? 'Error desconocido' };
    }
  }

  // ─── Recuperación de contraseña ───────────────────────────────────────────────
  async forgotPassword(email: string): Promise<{ dev_reset_url?: string }> {
    const user = await this.usersRepo.findOne({ where: { email, is_active: true } });
    // Siempre responde OK para no revelar si el email existe
    if (!user) return {};

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalida tokens previos del mismo usuario
    await this.resetTokensRepo.update({ user_id: user.id, used: false }, { used: true });

    const resetToken = new PasswordResetToken();
    resetToken.user_id    = user.id;
    resetToken.token_hash = tokenHash;
    resetToken.expires_at = expiresAt;
    await this.resetTokensRepo.save(resetToken);

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    let smtpError: string | undefined;
    try {
      await this.notifications.sendPasswordReset({ email, resetUrl });
    } catch (err: any) {
      smtpError = err?.message;
    }

    // En desarrollo devuelve el URL y el error SMTP si hubo uno
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      return { dev_reset_url: resetUrl, ...(smtpError ? { smtp_error: smtpError } : {}) };
    }
    return {};
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const record = await this.resetTokensRepo.findOne({ where: { token_hash: tokenHash, used: false } });
    if (!record) throw new BadRequestException('El enlace de recuperación no es válido o ya fue usado.');
    if (record.expires_at < new Date()) throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');

    const user = await this.usersRepo.findOne({
      where: { id: record.user_id },
      select: { id: true, email: true, password: true, role: true, is_active: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    record.used   = true;

    await this.usersRepo.save(user);
    await this.resetTokensRepo.save(record);
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
