import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyProfile } from './entities/company-profile.entity';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AuthModule } from '../auth/auth.module';
import { EscrowContract } from '../contracts/entities/escrow-contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyProfile, EscrowContract]), AuthModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [TypeOrmModule, CompaniesService],
})
export class CompaniesModule {}
