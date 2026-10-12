import { Controller, Get, UseGuards } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('credits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  // GET /api/credits/balance — retorna saldo y estado del umbral
  @Get('balance')
  @Roles(UserRole.EMPRESA)
  getBalance(@GetUser() user: User) {
    return this.creditsService.getBalance(user.id);
  }

  // GET /api/credits/chat-cost — costo actual de abrir un chat nuevo (lo define el admin)
  @Get('chat-cost')
  @Roles(UserRole.EMPRESA)
  async getChatCost() {
    return { costo: await this.creditsService.getChatOpenCost() };
  }
}
