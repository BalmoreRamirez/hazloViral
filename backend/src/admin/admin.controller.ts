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
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

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

  // ─── Disputas (claude.md §4.3 — Admin como árbitro) ─────────────────────────
  @Get('disputes')
  listDisputes() {
    return this.adminService.listDisputes();
  }

  @Post('disputes/:id/resolve')
  resolveDispute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.adminService.resolveDispute(id, dto);
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
