import { registrationDocuments } from './legal/registration-documents';
import { RegistrationConsentDto } from './dto/registration-consent.dto';
import { calculateAge } from '../../common/utils/date.util';
import {
  BadRequestException,
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
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { GlobalSetting } from '../admin/entities/global-setting.entity';
import { UserRole } from '../../common/enums';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

const SALT_ROUNDS = 10;
const REGISTRATION_MESSAGE = 'Si la solicitud puede registrarse, recibirás un correo con los siguientes pasos.';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepo: Repository<PasswordResetToken>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerifRepo: Repository<EmailVerificationToken>,
    @InjectRepository(GlobalSetting)
    private readonly settingsRepo: Repository<GlobalSetting>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  getRegistrationDocuments() {
    return registrationDocuments(
      this.config.get<string>('LEGAL_CONTROLLER_NAME') || 'InfluSmart',
      this.config.get<string>('LEGAL_PRIVACY_EMAIL') || 'admin@yopmail.com',
    );
  }

  private registrationConsent(dto: RegistrationConsentDto) {
    const documents = this.getRegistrationDocuments();
    if (dto.accepted_terms !== true || dto.accepted_privacy !== true) {
      throw new BadRequestException('Debes aceptar los términos y el aviso de privacidad antes de crear la cuenta.');
    }
    if (dto.terms_version !== documents.terms.version || dto.privacy_version !== documents.privacy.version) {
      throw new BadRequestException('Los documentos legales han cambiado. Vuelve a leerlos y confirma su aceptación.');
    }
    return { accepted_terms: true, accepted_privacy: true, accepted_at: new Date().toISOString(), documents, source: 'registration' };
  }

  private async getConfiguredNumber(key: string, fallback: number): Promise<number> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    const value = Number(setting?.value);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  // ─── Registro Empresa ────────────────────────────────────────────────────────
  async registerEmpresa(dto: RegisterCompanyDto) {
    const consent = this.registrationConsent(dto);
    if (!(await this.isEmailFree(dto.email))) {
      await bcrypt.hash(dto.password, SALT_ROUNDS);
      return { message: REGISTRATION_MESSAGE };
    }
    const [welcomeBonus, creditThreshold] = await Promise.all([
      this.getConfiguredNumber('welcome_bonus', 10),
      this.getConfiguredNumber('min_credit_threshold', 5),
    ]);

    let result: { user: Pick<User, 'id' | 'email'> };
    try {
      result = await this.dataSource.transaction(async (manager) => {
      const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

      const user = new User();
      user.registration_consent = consent;
      user.email = dto.email;
      user.password = hashed;
      user.role = UserRole.EMPRESA;
      await manager.save(user);

      const profile = new CompanyProfile();
      profile.user_id = user.id;
      profile.nombre_comercial = dto.nombre_comercial;
      if (dto.sitio_web)  profile.sitio_web  = dto.sitio_web;
      if (dto.pais)       profile.pais       = dto.pais;
      if (dto.direccion)  profile.direccion  = dto.direccion;
      if (dto.rubro)      profile.rubro      = dto.rubro;
      if (dto.razon_social) profile.razon_social = dto.razon_social;
      if (dto.nit)          profile.nit          = dto.nit;
      if (dto.nrc)          profile.nrc          = dto.nrc;
      profile.telefono                            = dto.telefono;
      profile.representante_nombre                = dto.representante_nombre;
      profile.representante_tipo_identificacion   = dto.representante_tipo_identificacion;
      profile.representante_numero_identificacion = dto.representante_numero_identificacion;
      profile.balance_creditos = welcomeBonus;
      profile.umbral_creditos = creditThreshold;
      await manager.save(profile);

      return { user: this.sanitize(user), profile };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) return { message: REGISTRATION_MESSAGE };
      throw error;
    }

    // The verification-token table references users, so create it only after
    // the account transaction commits and the user is visible to the repository.
    await this.sendVerificationEmail(result.user);
    return { message: REGISTRATION_MESSAGE };
  }

  // ─── Registro Influencer ─────────────────────────────────────────────────────
  async registerInfluencer(dto: RegisterInfluencerDto) {
    const consent = this.registrationConsent(dto);
    if (!(await this.isEmailFree(dto.email))) {
      await bcrypt.hash(dto.password, SALT_ROUNDS);
      return { message: REGISTRATION_MESSAGE };
    }

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

    let result: { user: Pick<User, 'id' | 'email'> };
    try {
      result = await this.dataSource.transaction(async (manager) => {
      const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

      const user = new User();
      user.registration_consent = consent;
      user.email = dto.email;
      user.password = hashed;
      user.role = UserRole.INFLUENCER;
      await manager.save(user);

      const profile = new InfluencerProfile();
      profile.user_id = user.id;
      profile.username         = dto.username;
      profile.nombre_artistico = dto.nombre_artistico;
      if (dto.bio)       profile.bio       = dto.bio;
      if (dto.ubicacion) profile.ubicacion = dto.ubicacion;
      if (dto.direccion) profile.direccion = dto.direccion;
      if (dto.rubros?.length) profile.rubros = dto.rubros;
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
      };

      return result;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) return { message: REGISTRATION_MESSAGE };
      throw error;
    }

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

    // Keep external side effects outside the account transaction. The token
    // repository must see the committed user to satisfy its foreign key.
    await this.sendVerificationEmail(result.user);
    return { message: REGISTRATION_MESSAGE };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email, is_active: true },
      select: { id: true, email: true, password: true, role: true, is_active: true, session_version: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    await this.usersRepo.update({ id: user.id }, { last_activity_at: new Date() });

    return { user: this.sanitize(user), token: this.sign(user) };
  }

  // ─── Cambio de contraseña ────────────────────────────────────────────────────
  async changePassword(userId: number, currentPwd: string, newPwd: string): Promise<void> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: { id: true, email: true, password: true, role: true, is_active: true, session_version: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const valid = await bcrypt.compare(currentPwd, user.password);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta.');
    await this.usersRepo.update({ id: userId }, {
      password: await bcrypt.hash(newPwd, SALT_ROUNDS),
      session_version: user.session_version + 1,
    });
  }

  async logout(userId: number): Promise<void> {
    await this.usersRepo.increment({ id: userId, is_active: true }, 'session_version', 1);
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

  private async sendVerificationEmail(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const rawToken   = await this.createEmailVerificationToken(user.id);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const verifyUrl  = `${frontendUrl}/verify-email?token=${rawToken}`;

    try {
      await this.notifications.sendEmailVerification({ email: user.email, verifyUrl });
    } catch {
      // Error ya logueado en NotificationsService
    }
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

  async resendVerificationEmail(userId: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (user.is_email_verified) throw new BadRequestException('El correo ya está verificado.');

    await this.sendVerificationEmail(user);
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
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({ where: { email, is_active: true } });
    // Siempre responde OK para no revelar si el email existe
    if (!user) return { message: 'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.' };

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

    try {
      await this.notifications.sendPasswordReset({ email, resetUrl });
    } catch {
      // El cliente siempre recibe una respuesta uniforme; los detalles quedan en el log SMTP.
    }
    return { message: 'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.' };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.dataSource.transaction(async (manager) => {
      const record = await manager.getRepository(PasswordResetToken)
        .createQueryBuilder('token')
        .setLock('pessimistic_write')
        .where('token.token_hash = :tokenHash AND token.used = false', { tokenHash })
        .getOne();
      if (!record) throw new BadRequestException('El enlace de recuperación no es válido o ya fue usado.');
      if (record.expires_at < new Date()) throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');

      const users = manager.getRepository(User);
      const user = await users.findOne({ where: { id: record.user_id, is_active: true } });
      if (!user) throw new NotFoundException('Usuario no encontrado.');

      await manager.update(User, { id: user.id }, {
        password: passwordHash,
        session_version: () => '"session_version" + 1',
      });
      record.used = true;
      await manager.save(record);
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private async isEmailFree(email: string): Promise<boolean> {
    return !(await this.usersRepo.existsBy({ email }));
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
  }

  private calcularEsMenor(fechaNacimiento: string): boolean {
    return calculateAge(fechaNacimiento) < 18;
  }

  private sign(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, session_version: user.session_version ?? 0 };
    return this.jwtService.sign(payload);
  }

  private sanitize(user: User): Omit<User, 'password' | 'registration_consent' | 'session_version'> {
    const { password: _p, registration_consent: _consent, session_version: _version, ...safe } = user as User & { password: string };
    return safe;
  }
}
