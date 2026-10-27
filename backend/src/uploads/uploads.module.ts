import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { User } from '../users/entities/user.entity';
import { PaymentReceipt } from '../receipts/entities/payment-receipt.entity';
import { DteDocument } from '../dte/entities/dte-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PaymentReceipt, DteDocument])],
  controllers: [UploadsController],
})
export class UploadsModule {}
