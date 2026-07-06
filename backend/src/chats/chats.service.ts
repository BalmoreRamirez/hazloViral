import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { CreditsService } from '../credits/credits.service';
import { ChatStatus, ProposalStatus, UserRole } from '../common/enums';
import { OpenChatDto } from './dto/open-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatsRepo: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    @InjectRepository(EmpresaProfile)
    private readonly empresasRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencersRepo: Repository<InfluencerProfile>,
    private readonly creditsService: CreditsService,
  ) {}

  // ─── Abrir chat (empresa → influencer) ───────────────────────────────────────
  async openChat(user: User, dto: OpenChatDto): Promise<Chat> {
    const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado.');

    const influencer = await this.influencersRepo.findOne({
      where: { id: dto.influencer_id, disponibilidad: true },
    });
    if (!influencer) throw new NotFoundException('Influencer no disponible.');

    // Verificar umbral antes de gastar (claude.md §5.1)
    const balance = await this.creditsService.getBalanceByEmpresaId(empresa.id);
    if (!balance.is_above_threshold) {
      throw new BadRequestException(
        `Saldo insuficiente. Necesitas más de ${balance.umbral_creditos} créditos para iniciar chats. Saldo actual: ${balance.balance_creditos}.`,
      );
    }

    // Si el chat ya existe, retornarlo sin cobrar
    const existing = await this.chatsRepo.findOne({
      where: { empresa_id: empresa.id, influencer_id: dto.influencer_id },
    });
    if (existing) return existing;

    // Debitar costo de apertura y crear chat
    await this.creditsService.deductChatOpenCost(empresa.id);

    const chat = new Chat();
    chat.empresa_id = empresa.id;
    chat.influencer_id = dto.influencer_id;
    chat.status = ChatStatus.ACTIVE;
    return this.chatsRepo.save(chat);
  }

  // ─── Listar chats del usuario ─────────────────────────────────────────────────
  async listChats(user: User): Promise<Chat[]> {
    if (user.role === UserRole.EMPRESA) {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (!empresa) return [];
      return this.chatsRepo.find({
        where: { empresa_id: empresa.id },
        relations: { influencer: true },
        order: { created_at: 'DESC' },
      });
    }

    const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
    if (!influencer) return [];
    return this.chatsRepo.find({
      where: { influencer_id: influencer.id },
      relations: { empresa: true },
      order: { created_at: 'DESC' },
    });
  }

  // ─── Historial de mensajes (paginado) ────────────────────────────────────────
  async getMessages(
    chatId: number,
    user: User,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    await this.assertParticipant(chatId, user);
    return this.messagesRepo.find({
      where: { chat_id: chatId },
      relations: { sender: true, campaignBrief: true, contrato: true },
      order: { created_at: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  // ─── Marcar mensajes como leídos ─────────────────────────────────────────────
  async markMessagesRead(
    chatId: number,
    readerUserId: number,
  ): Promise<{ ids: number[]; read_at: Date }> {
    const unread = await this.messagesRepo.find({
      where: { chat_id: chatId, sender_id: Not(readerUserId), read_at: IsNull() },
      select: { id: true },
    });
    if (!unread.length) return { ids: [], read_at: new Date() };
    const ids = unread.map((m) => m.id);
    const read_at = new Date();
    await this.messagesRepo.update({ id: In(ids) }, { read_at });
    return { ids, read_at };
  }

  // ─── Guardar y retornar mensaje (llamado por Gateway) ────────────────────────
  async saveMessage(user: User, dto: SendMessageDto): Promise<Message | null> {
    const chat = await this.chatsRepo.findOne({ where: { id: dto.chat_id } });
    if (!chat) throw new NotFoundException('Chat no encontrado.');

    await this.assertParticipant(dto.chat_id, user);

    // claude.md §5.1: empresa en solo-lectura si está bajo umbral
    if (user.role === UserRole.EMPRESA) {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (empresa) {
        const aboveThreshold = await this.creditsService.isAboveThreshold(empresa.id);
        if (!aboveThreshold) {
          throw new ForbiddenException(
            'Chat en solo lectura. Recarga créditos para continuar enviando mensajes.',
          );
        }
      }
    }

    if (chat.status === ChatStatus.BLOCKED) {
      throw new ForbiddenException('Este chat está bloqueado.');
    }

    if (!dto.message_text && !dto.is_proposal && !dto.campaign_brief_id) {
      throw new BadRequestException('El mensaje no puede estar vacío.');
    }

    // Propuesta de contrato: el influencer debe tener perfil verificado completo
    if (dto.is_proposal && user.role === UserRole.EMPRESA) {
      const influencer = await this.influencersRepo.findOne({
        where: { id: chat.influencer_id },
        relations: { metrics: true, user: true },
      });
      if (!influencer?.is_verified) {
        throw new BadRequestException(
          'Este influencer aún no tiene su perfil verificado. Se requiere: documento de identidad, al menos una red social verificada, foto de perfil, correo verificado y tener 16 años o más.',
        );
      }
    }

    const msg = new Message();
    msg.chat_id = dto.chat_id;
    msg.sender_id = user.id;
    msg.is_proposal = dto.is_proposal ?? false;
    if (msg.is_proposal) msg.proposal_status = ProposalStatus.PENDING;
    if (dto.message_text) msg.message_text = dto.message_text;
    if (dto.proposal_data) msg.proposal_data = dto.proposal_data;
    if (dto.campaign_brief_id) msg.campaign_brief_id = dto.campaign_brief_id;

    const saved = await this.messagesRepo.save(msg);
    // Recargar con relaciones para que el evento WebSocket tenga datos completos
    return this.messagesRepo.findOne({
      where: { id: saved.id },
      relations: { sender: true, campaignBrief: true, contrato: true },
    });
  }

  // ─── Verificar que el usuario es participante del chat ────────────────────────
  async assertParticipant(chatId: number, user: User): Promise<Chat> {
    const chat = await this.chatsRepo.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat no encontrado.');

    if (user.role === UserRole.EMPRESA) {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (!empresa || chat.empresa_id !== empresa.id) {
        throw new ForbiddenException('No tienes acceso a este chat.');
      }
    } else if (user.role === UserRole.INFLUENCER) {
      const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
      if (!influencer || chat.influencer_id !== influencer.id) {
        throw new ForbiddenException('No tienes acceso a este chat.');
      }
    }

    return chat;
  }

  // ─── Obtener empresa_id del user (para Gateway) ───────────────────────────────
  async getEmpresaId(userId: number): Promise<number | null> {
    const empresa = await this.empresasRepo.findOne({ where: { user_id: userId } });
    return empresa?.id ?? null;
  }
}
