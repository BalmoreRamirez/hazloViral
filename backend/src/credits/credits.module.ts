import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { ReceiptsModule } from '../receipts/receipts.module';
import { DteModule } from '../dte/dte.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmpresaProfile]), AdminModule, DteModule, ReceiptsModule],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
