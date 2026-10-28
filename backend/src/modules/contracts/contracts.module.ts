import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscrowContract } from './entities/escrow-contract.entity';
import { ContractRevisionRound } from './entities/contract-revision-round.entity';
import { ContractAuditLog } from './entities/contract-audit-log.entity';
import { Chat } from '../chats/entities/chat.entity';
import { Message } from '../chats/entities/message.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ChatsModule } from '../chats/chats.module';
import { AdminModule } from '../admin/admin.module';
import { WompiModule } from '../wompi/wompi.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EscrowContract,
      ContractRevisionRound,
      ContractAuditLog,
      Chat,
      Message,
      CompanyProfile,
      InfluencerProfile,
    ]),
    ChatsModule,
    AdminModule,
    WompiModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
