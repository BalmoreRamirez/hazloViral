import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DteDocument } from './entities/dte-document.entity';
import { DteDetail } from './entities/dte-detail.entity';
import { DteContingencyEvent } from './entities/dte-contingency-event.entity';
import { DteService } from './dte.service';

@Module({
  imports: [TypeOrmModule.forFeature([DteDocument, DteDetail, DteContingencyEvent])],
  providers: [DteService],
  exports: [TypeOrmModule, DteService],
})
export class DteModule {}
