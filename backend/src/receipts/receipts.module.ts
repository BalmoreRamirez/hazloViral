import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { PaymentReceipt } from './entities/payment-receipt.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DteModule } from '../dte/dte.module';
import { DteDocument } from '../dte/entities/dte-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentReceipt, EmpresaProfile, InfluencerProfile, ContratoEscrow, DteDocument]),
    NotificationsModule,
    DteModule,
  ],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
