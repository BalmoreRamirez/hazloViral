import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Controller('empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpresasController {
  constructor(private readonly service: EmpresasService) {}

  /** GET /api/empresas/profile — ver mi perfil de empresa */
  @Get('profile')
  @Roles(UserRole.EMPRESA)
  getProfile(@GetUser() user: User) {
    return this.service.getMyProfile(user);
  }

  /** PATCH /api/empresas/profile — actualizar datos de la marca (el umbral lo controla el admin) */
  @Patch('profile')
  @Roles(UserRole.EMPRESA)
  updateProfile(@GetUser() user: User, @Body() dto: UpdateEmpresaDto) {
    return this.service.updateMyProfile(user, dto);
  }

  /** GET /api/empresas/:id/public — perfil público de la marca (sin datos fiscales ni saldo) */
  @Get(':id/public')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER, UserRole.ADMIN)
  getPublic(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicProfile(id);
  }
}
