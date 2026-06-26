import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/empresa')
  registerEmpresa(@Body() dto: RegisterEmpresaDto) {
    return this.authService.registerEmpresa(dto);
  }

  @Post('register/influencer')
  registerInfluencer(@Body() dto: RegisterInfluencerDto) {
    return this.authService.registerInfluencer(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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

  /** POST /api/auth/forgot-password — solicitar enlace de recuperación */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** POST /api/auth/reset-password — restablecer contraseña con token */
  @Post('reset-password')
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
