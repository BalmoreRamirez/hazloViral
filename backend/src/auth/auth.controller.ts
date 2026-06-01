import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterEmpresaDto } from './dto/register-empresa.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
}
