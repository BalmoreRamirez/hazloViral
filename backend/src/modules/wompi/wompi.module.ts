import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WompiService } from './wompi.service';
import { WompiController } from './wompi.controller';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { EscrowContract } from '../contracts/entities/escrow-contract.entity';
import { Message } from '../chats/entities/message.entity';
import { CreditsModule } from '../credits/credits.module';
import { AuthModule } from '../auth/auth.module';
import { ChatsModule } from '../chats/chats.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyProfile, InfluencerProfile, EscrowContract, Message]),
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
