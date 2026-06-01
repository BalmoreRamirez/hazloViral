import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratoEscrow } from './entities/contrato-escrow.entity';
import { Message } from '../chats/entities/message.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratosService } from './contratos.service';
import { ContratosController } from './contratos.controller';
import { ChatsModule } from '../chats/chats.module';
import { AdminModule } from '../admin/admin.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContratoEscrow, Message, EmpresaProfile, InfluencerProfile]),
    ChatsModule,    // exporta ChatGateway para notificaciones WebSocket
    AdminModule,    // exporta AdminService para leer platform_commission_pct
    StripeModule,   // exporta StripeService para payout en approveAndRelease
  ],
  controllers: [ContratosController],
  providers: [ContratosService],
  exports: [ContratosService],
})
export class ContratosModule {}
