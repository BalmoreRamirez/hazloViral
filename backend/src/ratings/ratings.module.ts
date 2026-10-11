import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfluencerRating } from './entities/influencer-rating.entity';
import { EmpresaRating } from './entities/empresa-rating.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ContratoEscrow } from '../contratos/entities/contrato-escrow.entity';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { EmpresaRatingsService } from './empresa-ratings.service';
import { EmpresaRatingsController } from './empresa-ratings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InfluencerRating, EmpresaRating, EmpresaProfile, InfluencerProfile, ContratoEscrow]),
  ],
  controllers: [RatingsController, EmpresaRatingsController],
  providers: [RatingsService, EmpresaRatingsService],
  exports: [RatingsService, EmpresaRatingsService],
})
export class RatingsModule {}
