import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ContratoEscrow } from './entities/contrato-escrow.entity';
import { Message } from '../chats/entities/message.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ChatGateway } from '../chats/chats.gateway';
import { AdminService } from '../admin/admin.service';
import { StripeService } from '../stripe/stripe.service';
import { ContratoStatus, ProposalStatus, UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { SubmitDeliverablesDto } from './dto/submit-deliverables.dto';
import { DisputeDto } from './dto/dispute.dto';

@Injectable()
export class ContratosService {
  constructor(
    @InjectRepository(ContratoEscrow)
    private readonly contratosRepo: Repository<ContratoEscrow>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    @InjectRepository(EmpresaProfile)
    private readonly empresasRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencersRepo: Repository<InfluencerProfile>,
    private readonly chatGateway: ChatGateway,
    private readonly adminService: AdminService,
    private readonly stripeService: StripeService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── 1. Influencer acepta propuesta → crea contrato ──────────────────────────
  // claude.md §5.2 Fase 1
  async acceptProposal(user: User, dto: AcceptProposalDto): Promise<ContratoEscrow> {
    const message = await this.messagesRepo.findOne({
      where: { id: dto.message_id, is_proposal: true },
      relations: { chat: true },
    });
    if (!message) throw new NotFoundException('Propuesta no encontrada.');
    if (message.proposal_status !== ProposalStatus.PENDING) {
      throw new BadRequestException(
        `Esta propuesta ya fue procesada (estado: ${message.proposal_status}).`,
      );
    }

    // Solo el influencer del chat puede aceptar
    const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
    if (!influencer || message.chat.influencer_id !== influencer.id) {
      throw new ForbiddenException('Solo el influencer del chat puede aceptar esta propuesta.');
    }

    if (!message.proposal_data) {
      throw new BadRequestException('La propuesta no contiene datos válidos.');
    }

    const commissionPct = await this.adminService.getNumber('platform_commission_pct', 10);
    const monto = message.proposal_data.tarifa;
    const comision = parseFloat(((monto * commissionPct) / 100).toFixed(2));

    return this.dataSource.transaction(async (manager) => {
      // Marcar propuesta como aceptada
      message.proposal_status = ProposalStatus.ACCEPTED;
      await manager.save(message);

      // Crear contrato en pending_payment
      const contrato = new ContratoEscrow();
      contrato.chat_id = message.chat_id;
      contrato.empresa_id = message.chat.empresa_id;
      contrato.influencer_id = influencer.id;
      contrato.monto_total = monto;
      contrato.comision_plataforma = comision;
      contrato.entregables = message.proposal_data.entregables;
      contrato.fecha_limite_entrega = message.proposal_data.plazo;
      contrato.status = ContratoStatus.PENDING_PAYMENT;

      // Enlazar el mensaje al contrato recién creado
      const saved = await manager.save(contrato);
      message.contrato_id = saved.id;
      await manager.save(message);

      // Notificar a la sala de chat
      this.chatGateway.server
        .to(`chat-${message.chat_id}`)
        .emit('contract_created', { contrato: saved });

      return saved;
    });
  }

  // ─── 2. Empresa fonda el contrato (Stripe en Parte 7, aquí lógica de estado) ─
  // claude.md §5.2 Fase 2
  async fundContract(
    user: User,
    contratoId: number,
    stripeChargeId?: string,
  ): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(contratoId, user, UserRole.EMPRESA);

    if (contrato.status !== ContratoStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `El contrato debe estar en pending_payment. Estado actual: ${contrato.status}`,
      );
    }

    contrato.status = ContratoStatus.FUNDED_IN_ESCROW;
    if (stripeChargeId) contrato.stripe_charge_id = stripeChargeId;
    const saved = await this.contratosRepo.save(contrato);

    // Notificar al influencer que puede comenzar a trabajar (claude.md §5.2 Fase 2)
    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_funded', {
      contrato_id: saved.id,
      message: 'El pago está en custodia. Puedes comenzar a trabajar.',
    });

    return saved;
  }

  // ─── 3. Influencer sube evidencias → under_review ────────────────────────────
  // claude.md §5.2 Fase 3
  async submitDeliverables(
    user: User,
    contratoId: number,
    dto: SubmitDeliverablesDto,
  ): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(contratoId, user, UserRole.INFLUENCER);

    if (contrato.status !== ContratoStatus.FUNDED_IN_ESCROW) {
      throw new BadRequestException(
        `El contrato debe estar en funded_in_escrow para entregar. Estado: ${contrato.status}`,
      );
    }

    // Guardar evidencias en el JSONB de entregables
    contrato.entregables = dto.evidencias as any;
    contrato.status = ContratoStatus.UNDER_REVIEW;
    const saved = await this.contratosRepo.save(contrato);

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_under_review', {
      contrato_id: saved.id,
      message: 'El influencer subió los entregables. Revisa y aprueba para liberar el pago.',
    });

    return saved;
  }

  // ─── 4. Empresa aprueba → completed + payout (Stripe en Parte 7) ─────────────
  // claude.md §5.2 Fase 4
  async approveAndRelease(
    user: User,
    contratoId: number,
    stripeTransferId?: string,
  ): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(contratoId, user, UserRole.EMPRESA);

    if (contrato.status !== ContratoStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `El contrato debe estar under_review para aprobar. Estado: ${contrato.status}`,
      );
    }

    contrato.status = ContratoStatus.COMPLETED;
    if (stripeTransferId) contrato.stripe_transfer_id = stripeTransferId;
    const saved = await this.contratosRepo.save(contrato);

    // Payout al influencer vía Stripe Transfer (claude.md §5.2 Fase 4)
    // Si el influencer no tiene Connect configurado, el payout queda pendiente con log de aviso
    this.stripeService.payoutToInfluencer(saved.id).catch((err) =>
      console.error(`Payout falló para contrato ${saved.id}:`, err?.message),
    );

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_completed', {
      contrato_id: saved.id,
      monto_neto: saved.monto_total - saved.comision_plataforma,
      message: '¡Contrato completado! El pago ha sido liberado al influencer.',
    });

    return saved;
  }

  // ─── 5. Disputa (cualquier parte) → in_dispute ───────────────────────────────
  // claude.md §5.2 Nota de Disputas
  async initiateDispute(
    user: User,
    contratoId: number,
    dto: DisputeDto,
  ): Promise<ContratoEscrow> {
    const contrato = await this.contratosRepo.findOne({ where: { id: contratoId } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');

    const allowedStatuses = [
      ContratoStatus.FUNDED_IN_ESCROW,
      ContratoStatus.UNDER_REVIEW,
    ];
    if (!allowedStatuses.includes(contrato.status)) {
      throw new BadRequestException(
        `No se puede disputar un contrato en estado ${contrato.status}.`,
      );
    }

    await this.assertIsParticipant(contrato, user);

    contrato.status = ContratoStatus.IN_DISPUTE;
    const saved = await this.contratosRepo.save(contrato);

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_disputed', {
      contrato_id: saved.id,
      motivo: dto.motivo,
      message: 'Se ha iniciado una disputa. Un administrador revisará el caso.',
    });

    return saved;
  }

  // ─── Consultas ────────────────────────────────────────────────────────────────
  async listMyContratos(user: User): Promise<ContratoEscrow[]> {
    if (user.role === UserRole.EMPRESA) {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (!empresa) return [];
      return this.contratosRepo.find({
        where: { empresa_id: empresa.id },
        relations: { influencer: true, chat: true },
        order: { created_at: 'DESC' },
      });
    }
    const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
    if (!influencer) return [];
    return this.contratosRepo.find({
      where: { influencer_id: influencer.id },
      relations: { empresa: true, chat: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(user: User, contratoId: number): Promise<ContratoEscrow> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
      relations: { empresa: true, influencer: true, chat: true },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    await this.assertIsParticipant(contrato, user);
    return contrato;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  private async findAndAuthorize(
    contratoId: number,
    user: User,
    expectedRole: UserRole,
  ): Promise<ContratoEscrow> {
    if (user.role !== expectedRole) {
      throw new ForbiddenException(`Solo un ${expectedRole} puede realizar esta acción.`);
    }
    const contrato = await this.contratosRepo.findOne({ where: { id: contratoId } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    await this.assertIsParticipant(contrato, user);
    return contrato;
  }

  private async assertIsParticipant(contrato: ContratoEscrow, user: User): Promise<void> {
    if (user.role === UserRole.EMPRESA) {
      const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
      if (!empresa || contrato.empresa_id !== empresa.id) {
        throw new ForbiddenException('No tienes acceso a este contrato.');
      }
    } else if (user.role === UserRole.INFLUENCER) {
      const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
      if (!influencer || contrato.influencer_id !== influencer.id) {
        throw new ForbiddenException('No tienes acceso a este contrato.');
      }
    }
  }
}
