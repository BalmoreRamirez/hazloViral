import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ChatsService } from './chats.service';
import { CampaignBrief } from '../campaigns/entities/campaign-brief.entity';
import { ChatsController } from './chats.controller';
import { ChatGateway } from './chats.gateway';
import { CreditsModule } from '../credits/credits.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, CompanyProfile, InfluencerProfile, CampaignBrief, User]),
    CreditsModule,
    AuthModule, // exporta JwtModule para que Gateway use JwtService
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatGateway],
  exports: [ChatsService, ChatGateway],
})
export class ChatsModule {}
