import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly config: ConfigService) {}

  private sessionCookieOptions() {
    const configuredSameSite = this.config.get<string>('AUTH_COOKIE_SAME_SITE', 'lax');
    const sameSite = ['strict', 'lax', 'none'].includes(configuredSameSite) ? configuredSameSite as 'strict' | 'lax' | 'none' : 'lax';
    const secure = this.config.get<string>('AUTH_COOKIE_SECURE') === 'true'
      || this.config.get<string>('NODE_ENV') === 'production'
      || sameSite === 'none';
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    };
  }

  @Get('legal-documents')
  legalDocuments() {
    return this.authService.getRegistrationDocuments();
  }

  @Post('register/empresa')
  @UseGuards(AuthRateLimitGuard)
  registerEmpresa(@Body() dto: RegisterCompanyDto) {
    return this.authService.registerEmpresa(dto);
  }

  @Post('register/influencer')
  @UseGuards(AuthRateLimitGuard)
  registerInfluencer(@Body() dto: RegisterInfluencerDto) {
    return this.authService.registerInfluencer(dto);
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.login(dto);
    response.cookie('hv_session', session.token, this.sessionCookieOptions());
    return { user: session.user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@GetUser() user: User) {
    return user;
  }

  /** PATCH /api/auth/password — cambiar contraseña (todos los roles) */
  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@GetUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.current_password, dto.new_password);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@GetUser() user: User, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(user.id);
    response.clearCookie('hv_session', this.sessionCookieOptions());
  }

  /** POST /api/auth/forgot-password — solicitar enlace de recuperación */
  @Post('forgot-password')
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** POST /api/auth/reset-password — restablecer contraseña con token */
  @Post('reset-password')
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.new_password);
  }

  /** GET /api/auth/verify-email?token=xxx — verificar email desde el enlace del correo */
  @Get('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /** POST /api/auth/resend-verification — reenviar email de verificación */
  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  resendVerification(@GetUser() user: User) {
    return this.authService.resendVerificationEmail(user.id);
  }

  /** GET /api/auth/test-smtp — diagnóstico de conexión SMTP (solo dev) */
  @Get('test-smtp')
  testSmtp() {
    return this.authService.testSmtp();
  }
}
