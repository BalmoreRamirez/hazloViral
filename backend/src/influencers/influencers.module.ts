import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { InfluencerMetric } from './entities/influencer-metric.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InfluencerProfile, InfluencerMetric])],
  exports: [TypeOrmModule],
})
export class InfluencersModule {}
