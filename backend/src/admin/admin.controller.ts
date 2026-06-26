import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ResolveIncumplimientoDto } from './dto/resolve-incumplimiento.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Estadísticas ─────────────────────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Incumplimientos ──────────────────────────────────────────────────────────
  @Get('incumplimientos')
  listIncumplimientos() {
    return this.adminService.listIncumplimientos();
  }

  @Post('incumplimientos/:id/resolve')
  resolveIncumplimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveIncumplimientoDto,
  ) {
    return this.adminService.resolveIncumplimiento(id, dto.resolucion);
  }

  // ─── Global Settings (claude.md §4.3) ────────────────────────────────────────
  @Get('settings')
  getSettings() {
    return this.adminService.findAll();
  }

  @Patch('settings/:key')
  updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.adminService.set(key, dto.value);
  }

  // ─── Usuarios ─────────────────────────────────────────────────────────────────
  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/status')
  setUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.setUserStatus(id, dto.is_active);
  }
}
