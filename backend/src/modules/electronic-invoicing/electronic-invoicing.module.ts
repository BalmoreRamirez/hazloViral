import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectronicInvoice } from './entities/electronic-invoice.entity';
import { InvoiceDetail } from './entities/invoice-detail.entity';
import { InvoiceContingencyEvent } from './entities/invoice-contingency-event.entity';
import { ElectronicInvoicingService } from './electronic-invoicing.service';

@Module({
  imports: [TypeOrmModule.forFeature([ElectronicInvoice, InvoiceDetail, InvoiceContingencyEvent])],
  providers: [ElectronicInvoicingService],
  exports: [TypeOrmModule, ElectronicInvoicingService],
})
export class ElectronicInvoicingModule {}
