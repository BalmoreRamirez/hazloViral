import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WompiService } from './wompi.service';
import { WompiController } from './wompi.controller';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { Message } from '../chats/entities/message.entity';
import { CreditsModule } from '../credits/credits.module';
import { AuthModule } from '../auth/auth.module';
import { ChatsModule } from '../chats/chats.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmpresaProfile, InfluencerProfile, ContratoEscrow, Message]),
    CreditsModule,
    AuthModule,
    ChatsModule,
    ReceiptsModule,
  ],
  controllers: [WompiController],
  providers: [WompiService],
  exports: [WompiService],
})
export class WompiModule {}
