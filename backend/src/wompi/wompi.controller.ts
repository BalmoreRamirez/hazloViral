import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WompiService } from './wompi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CreateCreditsCheckoutDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount_usd: number;
}

@Controller('wompi')
export class WompiController {
  constructor(
    private readonly wompiService: WompiService,
    private readonly config: ConfigService,
  ) {}

  // POST /api/wompi/credits/checkout — empresa inicia recarga de créditos
  @Post('credits/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPRESA)
  createCreditsCheckout(
    @GetUser() user: User,
    @Body() dto: CreateCreditsCheckoutDto,
  ) {
    return this.wompiService.createCreditsPaymentLink(user.id, dto.amount_usd);
  }

  // POST /api/wompi/contract-checkout/:contratoId — empresa fonda contrato en custodia
  @Post('contract-checkout/:contratoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPRESA)
  createContractCheckout(
    @Param('contratoId', ParseIntPipe) contratoId: number,
    @GetUser() user: User,
  ) {
    return this.wompiService.createContractPaymentLink(contratoId, user.id);
  }

  // POST /api/wompi/webhook — webhook de Wompi (sin auth JWT, verifica firma interna)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: Record<string, any>) {
    return this.wompiService.handleWebhook(body);
  }

  // POST /api/wompi/dev/simulate-fund/:contratoId — simula fondeo (solo desarrollo)
  @Post('dev/simulate-fund/:contratoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPRESA)
  simulateFund(
    @Param('contratoId', ParseIntPipe) contratoId: number,
    @GetUser() user: User,
  ) {
    if (this.config.get<string>('FORMA_PAGO') === 'produccion') {
      throw new ForbiddenException('La simulación solo está disponible en modo desarrollo.');
    }
    return this.wompiService.simulateFund(contratoId, user.id);
  }
}
