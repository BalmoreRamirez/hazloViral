import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { InfluencerMetric } from './entities/influencer-metric.entity';
import { InfluencersService } from './influencers.service';
import { InfluencersController } from './influencers.controller';
import { AuthModule } from '../auth/auth.module';
import { SocialVerificationService } from './social-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([InfluencerProfile, InfluencerMetric]), AuthModule],
  controllers: [InfluencersController],
  providers: [InfluencersService, SocialVerificationService],
  exports: [TypeOrmModule, InfluencersService],
})
export class InfluencersModule {}
