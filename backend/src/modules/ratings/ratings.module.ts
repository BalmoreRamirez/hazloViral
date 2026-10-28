import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfluencerRating } from './entities/influencer-rating.entity';
import { CompanyRating } from './entities/company-rating.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { EscrowContract } from '../contracts/entities/escrow-contract.entity';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { CompanyRatingsService } from './company-ratings.service';
import { CompanyRatingsController } from './company-ratings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InfluencerRating, CompanyRating, CompanyProfile, InfluencerProfile, EscrowContract]),
  ],
  controllers: [RatingsController, CompanyRatingsController],
  providers: [RatingsService, CompanyRatingsService],
  exports: [RatingsService, CompanyRatingsService],
})
export class RatingsModule {}
