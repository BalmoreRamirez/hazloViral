import { databaseConfig } from './config/database.config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { InfluencerPrivacyInterceptor } from './common/interceptors/influencer-privacy.interceptor';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { InfluencersModule } from './modules/influencers/influencers.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ChatsModule } from './modules/chats/chats.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CreditsModule } from './modules/credits/credits.module';
import { WompiModule } from './modules/wompi/wompi.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ElectronicInvoicingModule } from './modules/electronic-invoicing/electronic-invoicing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    UsersModule,
    CompaniesModule,
    InfluencersModule,
    CampaignsModule,
    ChatsModule,
    ContractsModule,
    AdminModule,
    AuthModule,
    CreditsModule,
    WompiModule,
    UploadsModule,
    NotificationsModule,
    RatingsModule,
    ReceiptsModule,
    ElectronicInvoicingModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_INTERCEPTOR, useClass: InfluencerPrivacyInterceptor }],
})
export class AppModule {}
