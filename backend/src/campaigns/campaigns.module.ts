import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignBrief } from './entities/campaign-brief.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignBrief])],
  exports: [TypeOrmModule],
})
export class CampaignsModule {}
