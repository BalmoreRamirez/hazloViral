import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { User } from '../users/entities/user.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { Message } from '../chats/entities/message.entity';
import { CreditsModule } from '../credits/credits.module';
import { AuthModule } from '../auth/auth.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmpresaProfile, InfluencerProfile, ContratoEscrow, Message]),
    CreditsModule,
    AuthModule,
    ChatsModule, // exporta ChatGateway para notificaciones WS desde el webhook de Stripe
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
