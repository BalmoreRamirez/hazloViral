import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignBrief } from './entities/campaign-brief.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignBrief, EmpresaProfile]), AuthModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [TypeOrmModule, CampaignsService],
})
export class CampaignsModule {}
