import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { PaymentReceipt } from './entities/payment-receipt.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { EscrowContract } from '../contracts/entities/escrow-contract.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ElectronicInvoicingModule } from '../electronic-invoicing/electronic-invoicing.module';
import { ElectronicInvoice } from '../electronic-invoicing/entities/electronic-invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentReceipt, CompanyProfile, InfluencerProfile, EscrowContract, ElectronicInvoice]),
    NotificationsModule,
    ElectronicInvoicingModule,
  ],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
