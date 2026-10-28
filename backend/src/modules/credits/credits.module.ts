import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { ReceiptsModule } from '../receipts/receipts.module';
import { ElectronicInvoicingModule } from '../electronic-invoicing/electronic-invoicing.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyProfile]), AdminModule, ElectronicInvoicingModule, ReceiptsModule],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
