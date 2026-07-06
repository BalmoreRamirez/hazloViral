import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatsService } from './chats.service';
import { CreditsService } from '../credits/credits.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UserRole } from '../common/enums';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

interface AuthSocket extends Socket {
  data: {
    userId: number;
    email: string;
    role: UserRole;
  };
}

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatsService: ChatsService,
    private readonly creditsService: CreditsService,
  ) {}

  // ─── Autenticación en la conexión ─────────────────────────────────────────────
  async handleConnection(socket: AuthSocket) {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization as string)?.split(' ')[1];

    if (!token) {
      socket.emit('error', { message: 'Token requerido.' });
      socket.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: number; email: string; role: UserRole }>(token);
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      socket.data.role = payload.role;

      // Si es empresa, emitir estado de créditos inmediatamente
      if (payload.role === UserRole.EMPRESA) {
        const empresaId = await this.chatsService.getEmpresaId(payload.sub);
        if (empresaId) {
          const balance = await this.creditsService.getBalanceByEmpresaId(empresaId);
          socket.emit('credit_status', balance);
        }
      }
    } catch {
      socket.emit('error', { message: 'Token inválido.' });
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthSocket) {
    // Limpieza implícita — Socket.io elimina el socket de todas las salas
    void socket;
  }

  // ─── Unirse a sala de chat ────────────────────────────────────────────────────
  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { chat_id: number },
  ) {
    if (!socket.data.userId) {
      socket.emit('error', { message: 'No autenticado.' });
      return;
    }

    try {
      // Construir un User parcial para validar participación
      const user = { id: socket.data.userId, role: socket.data.role } as any;
      await this.chatsService.assertParticipant(data.chat_id, user);

      const room = `chat-${data.chat_id}`;
      await socket.join(room);
      socket.emit('joined_chat', { chat_id: data.chat_id, room });

      // Marcar mensajes del otro participante como leídos y notificar a la sala
      const { ids, read_at } = await this.chatsService.markMessagesRead(
        data.chat_id,
        socket.data.userId,
      );
      if (ids.length > 0) {
        this.server.to(room).emit('messages_read', { chat_id: data.chat_id, ids, read_at });
      }
    } catch (err: any) {
      socket.emit('error', { message: err?.message ?? 'Error al unirse al chat.' });
    }
  }

  // ─── Enviar mensaje ───────────────────────────────────────────────────────────
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() raw: unknown,
  ) {
    if (!socket.data.userId) {
      socket.emit('error', { message: 'No autenticado.' });
      return;
    }

    // Validar DTO en el Gateway
    const dto = plainToInstance(SendMessageDto, raw);
    const errors = await validate(dto);
    if (errors.length > 0) {
      socket.emit('error', { message: 'Datos del mensaje inválidos.', errors });
      return;
    }

    try {
      const user = { id: socket.data.userId, role: socket.data.role } as any;
      const message = await this.chatsService.saveMessage(user, dto);
      if (!message) return;

      // Emitir a todos en la sala, incluido el remitente
      this.server.to(`chat-${dto.chat_id}`).emit('new_message', message);

      // Si es empresa, emitir estado actualizado de créditos
      if (socket.data.role === UserRole.EMPRESA) {
        const empresaId = await this.chatsService.getEmpresaId(socket.data.userId);
        if (empresaId) {
          const balance = await this.creditsService.getBalanceByEmpresaId(empresaId);
          socket.emit('credit_status', balance);

          // Notificar bloqueo si cayó bajo el umbral (claude.md §5.1)
          if (!balance.is_above_threshold) {
            socket.emit('chat_blocked', {
              message: 'Tus créditos cayeron bajo el umbral. El chat está en solo lectura.',
              balance,
            });
          }
        }
      }
    } catch (err: any) {
      // Distinguir error de solo-lectura vs error genérico
      const isCreditError =
        err?.message?.includes('solo lectura') || err?.message?.includes('créditos');
      socket.emit(isCreditError ? 'chat_blocked' : 'error', {
        message: err?.message ?? 'Error al enviar el mensaje.',
      });
    }
  }

  // ─── Utilidad: notificar a todos los sockets de una empresa ──────────────────
  async notifyCreditUpdate(empresaUserId: number) {
    const empresaId = await this.chatsService.getEmpresaId(empresaUserId);
    if (!empresaId) return;
    const balance = await this.creditsService.getBalanceByEmpresaId(empresaId);

    // Emitir a todos los sockets identificados con ese userId
    // (se usa cuando Stripe actualiza créditos en Parte 7)
    this.server.emit(`credit_update:${empresaUserId}`, balance);
  }
}
