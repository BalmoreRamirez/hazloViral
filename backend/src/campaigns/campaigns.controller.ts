import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { CreateCampaignBriefDto, UpdateCampaignBriefDto } from './dto/campaign-brief.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EMPRESA)
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  /** POST /api/campaigns — crear brief (claude.md §6.1) */
  @Post()
  create(@GetUser() user: User, @Body() dto: CreateCampaignBriefDto) {
    return this.service.create(user, dto);
  }

  /** GET /api/campaigns — listar mis briefs */
  @Get()
  findAll(@GetUser() user: User) {
    return this.service.findAll(user);
  }

  /** GET /api/campaigns/:id */
  @Get(':id')
  findOne(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(user, id);
  }

  /** PATCH /api/campaigns/:id */
  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignBriefDto,
  ) {
    return this.service.update(user, id, dto);
  }

  /** DELETE /api/campaigns/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id);
  }
}
