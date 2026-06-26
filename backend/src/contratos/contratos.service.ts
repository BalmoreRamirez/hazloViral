import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ContratoEscrow } from './entities/contrato-escrow.entity';
import { ContratoRevisionRound } from './entities/contrato-revision-round.entity';
import { ContratoAuditLog } from './entities/contrato-audit-log.entity';
import { Message } from '../chats/entities/message.entity';
import { EmpresaProfile } from '../empresas/entities/empresa-profile.entity';
import { InfluencerProfile } from '../influencers/entities/influencer-profile.entity';
import { ChatGateway } from '../chats/chats.gateway';
import { AdminService } from '../admin/admin.service';
import { WompiService } from '../wompi/wompi.service';
import { ContratoStatus, ProposalStatus, UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { RejectProposalDto } from './dto/reject-proposal.dto';
import { CounterProposalDto } from './dto/counter-proposal.dto';
import { ResolveCounterDto } from './dto/resolve-counter.dto';
import { SubmitDeliverablesDto } from './dto/submit-deliverables.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { RegisterPublicationsDto } from './dto/register-publications.dto';
import { ReportNonComplianceDto } from './dto/report-non-compliance.dto';

const MAX_REVISION_ROUNDS = 3;

@Injectable()
export class ContratosService {
  constructor(
    @InjectRepository(ContratoEscrow)
    private readonly contratosRepo: Repository<ContratoEscrow>,
    @InjectRepository(ContratoRevisionRound)
    private readonly revisionRoundsRepo: Repository<ContratoRevisionRound>,
    @InjectRepository(ContratoAuditLog)
    private readonly auditLogRepo: Repository<ContratoAuditLog>,
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
    @InjectRepository(EmpresaProfile)
    private readonly empresasRepo: Repository<EmpresaProfile>,
    @InjectRepository(InfluencerProfile)
    private readonly influencersRepo: Repository<InfluencerProfile>,
    private readonly chatGateway: ChatGateway,
    private readonly adminService: AdminService,
    private readonly wompiService: WompiService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── 1. Influencer acepta propuesta → crea contrato ──────────────────────────
  async acceptProposal(user: User, dto: AcceptProposalDto): Promise<ContratoEscrow> {
    const message = await this.messagesRepo.findOne({
      where: { id: dto.message_id, is_proposal: true },
      relations: { chat: true },
    });
    if (!message) throw new NotFoundException('Propuesta no encontrada.');
    if (message.proposal_status !== ProposalStatus.PENDING &&
        message.proposal_status !== ProposalStatus.COUNTERED) {
      throw new BadRequestException(
        `Esta propuesta ya fue procesada (estado: ${message.proposal_status}).`,
      );
    }

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
      const prevStatus = message.proposal_status;
      message.proposal_status = ProposalStatus.ACCEPTED;
      await manager.save(message);

      const contrato = new ContratoEscrow();
      contrato.chat_id = message.chat_id;
      contrato.empresa_id = message.chat.empresa_id;
      contrato.influencer_id = influencer.id;
      contrato.monto_total = monto;
      contrato.comision_plataforma = comision;
      contrato.entregables = (message.proposal_data.entregables ?? []).map((e) => ({
        tipo: e.tipo,
        descripcion: e.descripcion,
        archivos: [],
      }));
      contrato.fecha_limite_entrega = message.proposal_data.plazo;
      if (message.proposal_data.contrato_pdf_url) {
        contrato.contrato_pdf_url = message.proposal_data.contrato_pdf_url;
      }
      contrato.status = ContratoStatus.PENDING_PAYMENT;

      const saved = await manager.save(contrato);
      message.contrato_id = saved.id;
      await manager.save(message);

      await this.writeAudit(manager, {
        contrato_id: saved.id,
        actor_id: user.id,
        action: 'proposal_accepted',
        previous_status: null,
        new_status: ContratoStatus.PENDING_PAYMENT,
        metadata: { monto, comision, prev_proposal_status: prevStatus },
      });

      this.chatGateway.server
        .to(`chat-${message.chat_id}`)
        .emit('contract_created', { contrato: saved });

      return saved;
    });
  }

  // ─── 2. Influencer rechaza propuesta ─────────────────────────────────────────
  async rejectProposal(user: User, dto: RejectProposalDto): Promise<{ ok: boolean }> {
    const message = await this.messagesRepo.findOne({
      where: { id: dto.message_id, is_proposal: true },
      relations: { chat: true },
    });
    if (!message) throw new NotFoundException('Propuesta no encontrada.');
    if (message.proposal_status !== ProposalStatus.PENDING) {
      throw new BadRequestException(`Propuesta no está en estado 'pending'.`);
    }

    const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
    if (!influencer || message.chat.influencer_id !== influencer.id) {
      throw new ForbiddenException('Solo el influencer del chat puede rechazar esta propuesta.');
    }

    message.proposal_status = ProposalStatus.REJECTED;
    await this.messagesRepo.save(message);

    this.chatGateway.server
      .to(`chat-${message.chat_id}`)
      .emit('proposal_rejected', { message_id: dto.message_id });

    return { ok: true };
  }

  // ─── 3. Influencer envía contraoferta ─────────────────────────────────────────
  async counterProposal(user: User, dto: CounterProposalDto): Promise<Message> {
    const original = await this.messagesRepo.findOne({
      where: { id: dto.message_id, is_proposal: true },
      relations: { chat: true },
    });
    if (!original) throw new NotFoundException('Propuesta no encontrada.');
    if (original.proposal_status !== ProposalStatus.PENDING) {
      throw new BadRequestException(`Solo se puede contraoferecer una propuesta 'pending'.`);
    }

    const influencer = await this.influencersRepo.findOne({ where: { user_id: user.id } });
    if (!influencer || original.chat.influencer_id !== influencer.id) {
      throw new ForbiddenException('Solo el influencer del chat puede enviar una contraoferta.');
    }

    return this.dataSource.transaction(async (manager) => {
      original.proposal_status = ProposalStatus.COUNTERED;
      await manager.save(original);

      const counter = new Message();
      counter.chat_id = original.chat_id;
      counter.sender_id = user.id;
      counter.is_proposal = true;
      counter.proposal_data = {
        ...original.proposal_data,
        tarifa: dto.tarifa_propuesta,
      };
      counter.contraoferta_data = {
        tarifa_propuesta: dto.tarifa_propuesta,
        justificacion: dto.justificacion,
      };
      counter.proposal_status = ProposalStatus.PENDING;
      const saved = await manager.save(counter);

      this.chatGateway.server
        .to(`chat-${original.chat_id}`)
        .emit('proposal_countered', {
          message: saved,
          original_message_id: original.id,
        });

      return saved;
    });
  }

  // ─── 4. Empresa resuelve contraoferta (acepta o rechaza) ──────────────────────
  async resolveCounter(user: User, dto: ResolveCounterDto): Promise<ContratoEscrow | { ok: boolean }> {
    const message = await this.messagesRepo.findOne({
      where: { id: dto.message_id, is_proposal: true },
      relations: { chat: true },
    });
    if (!message) throw new NotFoundException('Contraoferta no encontrada.');
    if (message.proposal_status !== ProposalStatus.PENDING || !message.contraoferta_data) {
      throw new BadRequestException('El mensaje no es una contraoferta pendiente.');
    }

    const empresa = await this.empresasRepo.findOne({ where: { user_id: user.id } });
    if (!empresa || message.chat.empresa_id !== empresa.id) {
      throw new ForbiddenException('Solo la empresa del chat puede resolver la contraoferta.');
    }

    if (dto.action === 'reject') {
      message.proposal_status = ProposalStatus.COUNTER_REJECTED;
      await this.messagesRepo.save(message);

      this.chatGateway.server
        .to(`chat-${message.chat_id}`)
        .emit('counter_resolved', {
          message_id: dto.message_id,
          action: 'rejected',
        });

      return { ok: true };
    }

    // accept — crear contrato con la tarifa de la contraoferta
    const commissionPct = await this.adminService.getNumber('platform_commission_pct', 10);
    const monto = message.contraoferta_data.tarifa_propuesta;
    const comision = parseFloat(((monto * commissionPct) / 100).toFixed(2));

    return this.dataSource.transaction(async (manager) => {
      message.proposal_status = ProposalStatus.ACCEPTED;
      await manager.save(message);

      const contrato = new ContratoEscrow();
      contrato.chat_id = message.chat_id;
      contrato.empresa_id = message.chat.empresa_id;
      contrato.influencer_id = message.chat.influencer_id;
      contrato.monto_total = monto;
      contrato.comision_plataforma = comision;
      contrato.entregables = (message.proposal_data?.entregables ?? []).map((e) => ({
        tipo: e.tipo,
        descripcion: e.descripcion,
        archivos: [],
      }));
      contrato.fecha_limite_entrega = message.proposal_data?.plazo ?? '';
      if (message.proposal_data?.contrato_pdf_url) {
        contrato.contrato_pdf_url = message.proposal_data.contrato_pdf_url;
      }
      contrato.status = ContratoStatus.PENDING_PAYMENT;

      const saved = await manager.save(contrato);
      message.contrato_id = saved.id;
      await manager.save(message);

      await this.writeAudit(manager, {
        contrato_id: saved.id,
        actor_id: user.id,
        action: 'counter_accepted',
        previous_status: null,
        new_status: ContratoStatus.PENDING_PAYMENT,
        metadata: { monto, comision },
      });

      this.chatGateway.server
        .to(`chat-${message.chat_id}`)
        .emit('counter_resolved', {
          message_id: dto.message_id,
          contrato: saved,
          action: 'accepted',
        });

      return saved;
    });
  }

  // ─── 5. Influencer sube entregables → under_review ───────────────────────────
  async submitDeliverables(user: User, contratoId: number, dto: SubmitDeliverablesDto): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(contratoId, user, UserRole.INFLUENCER);

    const allowed = [ContratoStatus.FUNDED_IN_ESCROW, ContratoStatus.CHANGES_REQUESTED];
    if (!allowed.includes(contrato.status)) {
      throw new BadRequestException(
        `El contrato debe estar en funded_in_escrow o changes_requested. Estado: ${contrato.status}`,
      );
    }

    const prevStatus = contrato.status;
    contrato.entregables = dto.entregables as any;
    contrato.status = ContratoStatus.UNDER_REVIEW;
    const saved = await this.contratosRepo.save(contrato);

    await this.writeAudit(null, {
      contrato_id: saved.id,
      actor_id: user.id,
      action: 'deliverables_submitted',
      previous_status: prevStatus,
      new_status: ContratoStatus.UNDER_REVIEW,
      metadata: { round: saved.revision_round },
    });

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_under_review', {
      contrato_id: saved.id,
      message: 'El influencer subió los entregables. Revisa y aprueba.',
    });

    return saved;
  }

  // ─── 7. Empresa solicita cambios (máx 3 rondas) ──────────────────────────────
  async requestChanges(user: User, dto: RequestChangesDto): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(dto.contrato_id, user, UserRole.EMPRESA);

    if (contrato.status !== ContratoStatus.UNDER_REVIEW) {
      throw new BadRequestException(`El contrato debe estar en under_review. Estado: ${contrato.status}`);
    }

    if (contrato.revision_round >= MAX_REVISION_ROUNDS) {
      throw new BadRequestException(
        `Se alcanzó el máximo de ${MAX_REVISION_ROUNDS} rondas de revisión. Considera iniciar una disputa.`,
      );
    }

    const prevStatus = contrato.status;
    contrato.revision_round += 1;
    contrato.status = ContratoStatus.CHANGES_REQUESTED;
    const saved = await this.contratosRepo.save(contrato);

    const round = new ContratoRevisionRound();
    round.contrato_id = saved.id;
    round.round_number = saved.revision_round;
    round.feedback = dto.feedback;
    round.requested_by = user.id;
    await this.revisionRoundsRepo.save(round);

    await this.writeAudit(null, {
      contrato_id: saved.id,
      actor_id: user.id,
      action: 'changes_requested',
      previous_status: prevStatus,
      new_status: ContratoStatus.CHANGES_REQUESTED,
      metadata: { round_number: saved.revision_round, feedback: dto.feedback },
    });

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('changes_requested', {
      contrato_id: saved.id,
      round_number: saved.revision_round,
      feedback: dto.feedback,
    });

    return saved;
  }

  // ─── 8. Empresa aprueba entregables → pending_publication ────────────────────
  async approveDeliverables(user: User, contratoId: number): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(contratoId, user, UserRole.EMPRESA);

    if (contrato.status !== ContratoStatus.UNDER_REVIEW) {
      throw new BadRequestException(`El contrato debe estar en under_review. Estado: ${contrato.status}`);
    }

    const prevStatus = contrato.status;
    contrato.status = ContratoStatus.PENDING_PUBLICATION;
    const saved = await this.contratosRepo.save(contrato);

    await this.writeAudit(null, {
      contrato_id: saved.id,
      actor_id: user.id,
      action: 'deliverables_approved',
      previous_status: prevStatus,
      new_status: ContratoStatus.PENDING_PUBLICATION,
    });

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('deliverables_approved', {
      contrato_id: saved.id,
      message: 'Entregables aprobados. Procede a publicar en tus redes sociales.',
    });

    return saved;
  }

  // ─── 9. Influencer registra publicaciones en RRSS ────────────────────────────
  async registerPublications(user: User, dto: RegisterPublicationsDto): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(dto.contrato_id, user, UserRole.INFLUENCER);

    if (contrato.status !== ContratoStatus.PENDING_PUBLICATION) {
      throw new BadRequestException(`El contrato debe estar en pending_publication. Estado: ${contrato.status}`);
    }

    const prevStatus = contrato.status;
    contrato.publication_links = dto.publications.map((p) => ({
      red_social: p.red_social,
      url: p.url,
      publicado_at: new Date().toISOString(),
    }));
    contrato.status = ContratoStatus.PUBLICATION_REVIEW;
    const saved = await this.contratosRepo.save(contrato);

    await this.writeAudit(null, {
      contrato_id: saved.id,
      actor_id: user.id,
      action: 'publications_registered',
      previous_status: prevStatus,
      new_status: ContratoStatus.PUBLICATION_REVIEW,
      metadata: { count: dto.publications.length },
    });

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('publications_registered', {
      contrato_id: saved.id,
      message: 'El influencer registró las publicaciones. Revisa y aprueba para liberar el pago.',
    });

    return saved;
  }

  // ─── 10. Empresa aprueba publicaciones → completed + payout ──────────────────
  async approveAndRelease(user: User, contratoId: number, wompiTransferId?: string): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(contratoId, user, UserRole.EMPRESA);

    if (contrato.status !== ContratoStatus.PUBLICATION_REVIEW) {
      throw new BadRequestException(
        `El contrato debe estar en publication_review para aprobar. Estado: ${contrato.status}`,
      );
    }

    const prevStatus = contrato.status;
    contrato.status = ContratoStatus.COMPLETED;
    if (wompiTransferId) contrato.stripe_transfer_id = wompiTransferId;
    const saved = await this.contratosRepo.save(contrato);

    await this.writeAudit(null, {
      contrato_id: saved.id,
      actor_id: user.id,
      action: 'approved',
      previous_status: prevStatus,
      new_status: ContratoStatus.COMPLETED,
    });

    this.wompiService.disbursementToInfluencer(saved.id).catch((err: any) =>
      console.error(`Payout falló para contrato ${saved.id}:`, err?.message),
    );

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('contract_completed', {
      contrato_id: saved.id,
      monto_neto: Number(saved.monto_total) - Number(saved.comision_plataforma),
      message: '¡Contrato completado! El pago ha sido liberado al influencer.',
    });

    return saved;
  }

  // ─── 11. Empresa reporta incumplimiento ──────────────────────────────────────
  async reportNonCompliance(user: User, dto: ReportNonComplianceDto): Promise<ContratoEscrow> {
    const contrato = await this.findAndAuthorize(dto.contrato_id, user, UserRole.EMPRESA);

    if (![ContratoStatus.PUBLICATION_REVIEW, ContratoStatus.UNDER_REVIEW].includes(contrato.status)) {
      throw new BadRequestException(`Solo se puede reportar incumplimiento desde publication_review o under_review.`);
    }

    const prevStatus = contrato.status;
    contrato.status = ContratoStatus.INCUMPLIMIENTO;
    contrato.motivo_incumplimiento = dto.motivo;
    const saved = await this.contratosRepo.save(contrato);

    await this.writeAudit(null, {
      contrato_id: saved.id,
      actor_id: user.id,
      action: 'noncompliance_reported',
      previous_status: prevStatus,
      new_status: ContratoStatus.INCUMPLIMIENTO,
      metadata: { motivo: dto.motivo },
    });

    this.chatGateway.server.to(`chat-${contrato.chat_id}`).emit('noncompliance_reported', {
      contrato_id: saved.id,
      message: 'La empresa reportó un incumplimiento. Un administrador revisará el caso.',
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

  async getRevisionRounds(user: User, contratoId: number): Promise<ContratoRevisionRound[]> {
    await this.findOne(user, contratoId);
    return this.revisionRoundsRepo.find({
      where: { contrato_id: contratoId },
      order: { round_number: 'ASC' },
    });
  }

  async getAuditLog(user: User, contratoId: number): Promise<ContratoAuditLog[]> {
    await this.findOne(user, contratoId);
    return this.auditLogRepo.find({
      where: { contrato_id: contratoId },
      order: { created_at: 'ASC' },
    });
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

  private async writeAudit(
    manager: any,
    data: {
      contrato_id: number;
      actor_id: number;
      action: string;
      previous_status: string | null;
      new_status: string | null;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const log = new ContratoAuditLog();
    log.contrato_id = data.contrato_id;
    log.actor_id = data.actor_id;
    log.action = data.action;
    if (data.previous_status !== null) log.previous_status = data.previous_status;
    if (data.new_status !== null) log.new_status = data.new_status;
    if (data.metadata) log.metadata = data.metadata;

    if (manager) {
      await manager.save(log);
    } else {
      await this.auditLogRepo.save(log);
    }
  }
}
