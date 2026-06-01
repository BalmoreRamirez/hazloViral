import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { CreateCreditCheckoutDto } from './dto/create-credit-checkout.dto';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // POST /api/stripe/credits/checkout — empresa inicia recarga de créditos
  @Post('credits/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPRESA)
  createCreditsCheckout(
    @GetUser() user: User,
    @Body() dto: CreateCreditCheckoutDto,
  ) {
    return this.stripeService.createCreditsCheckoutSession(user.id, dto.amount_usd);
  }

  // POST /api/stripe/contract-checkout/:contratoId — empresa fonda contrato
  @Post('contract-checkout/:contratoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPRESA)
  createContractCheckout(
    @Param('contratoId', ParseIntPipe) contratoId: number,
    @GetUser() user: User,
  ) {
    return this.stripeService.createContractCheckoutSession(contratoId, user.id);
  }

  // POST /api/stripe/connect/onboard — influencer inicia onboarding financiero
  @Post('connect/onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INFLUENCER)
  connectOnboard(@GetUser() user: User) {
    return this.stripeService.createConnectOnboardingLink(user.id);
  }

  // POST /api/stripe/webhook — webhook de Stripe (sin auth JWT, verifica firma)
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    if (!signature) throw new BadRequestException('stripe-signature header requerido.');
    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException('Raw body no disponible.');
    try {
      return await this.stripeService.handleWebhook(signature, rawBody);
    } catch (err: any) {
      throw new BadRequestException(`Webhook inválido: ${err?.message ?? 'firma incorrecta'}`);
    }
  }
}
