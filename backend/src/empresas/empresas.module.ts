import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaProfile } from './entities/empresa-profile.entity';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmpresaProfile]), AuthModule],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [TypeOrmModule, EmpresasService],
})
export class EmpresasModule {}
