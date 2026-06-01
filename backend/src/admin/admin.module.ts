import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalSetting } from './entities/global-setting.entity';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalSetting])],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
