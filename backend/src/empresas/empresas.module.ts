import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaProfile } from './entities/empresa-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmpresaProfile])],
  exports: [TypeOrmModule],
})
export class EmpresasModule {}
