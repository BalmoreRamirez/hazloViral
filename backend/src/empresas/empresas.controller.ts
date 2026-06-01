import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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
@Roles(UserRole.EMPRESA)
export class EmpresasController {
  constructor(private readonly service: EmpresasService) {}

  /** GET /api/empresas/profile — ver mi perfil de empresa */
  @Get('profile')
  getProfile(@GetUser() user: User) {
    return this.service.getMyProfile(user);
  }

  /** PATCH /api/empresas/profile — actualizar nombre, sitio web, umbral */
  @Patch('profile')
  updateProfile(@GetUser() user: User, @Body() dto: UpdateEmpresaDto) {
    return this.service.updateMyProfile(user, dto);
  }
}
