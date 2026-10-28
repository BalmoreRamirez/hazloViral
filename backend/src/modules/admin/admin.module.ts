import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalSetting } from './entities/global-setting.entity';
import { EscrowContract } from '../contracts/entities/escrow-contract.entity';
import { User } from '../users/entities/user.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalSetting, EscrowContract, User, CompanyProfile, InfluencerProfile]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
