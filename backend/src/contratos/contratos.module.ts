import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratoEscrow } from './entities/contrato-escrow.entity';
import { ContratoRevisionRound } from './entities/contrato-revision-round.entity';
import { ContratoAuditLog } from './entities/contrato-audit-log.entity';
import { Message } from '../chats/entities/message.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratosService } from './contratos.service';
import { ContratosController } from './contratos.controller';
import { ChatsModule } from '../chats/chats.module';
import { AdminModule } from '../admin/admin.module';
import { WompiModule } from '../wompi/wompi.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContratoEscrow,
      ContratoRevisionRound,
      ContratoAuditLog,
      Message,
      EmpresaProfile,
      InfluencerProfile,
    ]),
    ChatsModule,
    AdminModule,
    WompiModule,
  ],
  controllers: [ContratosController],
  providers: [ContratosService],
  exports: [ContratosService],
})
export class ContratosModule {}
