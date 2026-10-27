import { Controller, Get, Post, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  list(@GetUser() user: User) {
    return this.receiptsService.listForUser(user);
  }

  @Post(':id/send-invoice')
  @Roles(UserRole.EMPRESA)
  sendInvoice(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.receiptsService.sendInvoiceForUser(user, id);
  }

  @Get(':id')
  findOne(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.receiptsService.findForUser(user, id);
  }
}
