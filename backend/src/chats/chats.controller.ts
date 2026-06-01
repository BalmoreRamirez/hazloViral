import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { OpenChatDto } from './dto/open-chat.dto';

@Controller('chats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // POST /api/chats — empresa abre chat con influencer (cobra créditos)
  @Post()
  @Roles(UserRole.EMPRESA)
  openChat(@GetUser() user: User, @Body() dto: OpenChatDto) {
    return this.chatsService.openChat(user, dto);
  }

  // GET /api/chats — lista mis chats (empresa o influencer)
  @Get()
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  listChats(@GetUser() user: User) {
    return this.chatsService.listChats(user);
  }

  // GET /api/chats/:id/messages — historial paginado
  @Get(':id/messages')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  getMessages(
    @Param('id', ParseIntPipe) chatId: number,
    @GetUser() user: User,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.chatsService.getMessages(chatId, user, limit, offset);
  }
}
