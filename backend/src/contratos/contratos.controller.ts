import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ContratosService } from './contratos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { RejectProposalDto } from './dto/reject-proposal.dto';
import { CounterProposalDto } from './dto/counter-proposal.dto';
import { ResolveCounterDto } from './dto/resolve-counter.dto';
import { SubmitDeliverablesDto } from './dto/submit-deliverables.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { RegisterPublicationsDto } from './dto/register-publications.dto';
import { ReportNonComplianceDto } from './dto/report-non-compliance.dto';
import { DisputeDto } from './dto/dispute.dto';

@Controller('contratos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  // ── Consultas ──────────────────────────────────────────────────────────────
  @Get()
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  listMyContratos(@GetUser() user: User) {
    return this.contratosService.listMyContratos(user);
  }

  @Get(':id')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.findOne(user, id);
  }

  @Get(':id/revision-rounds')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  getRevisionRounds(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.getRevisionRounds(user, id);
  }

  @Get(':id/audit-log')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  getAuditLog(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.getAuditLog(user, id);
  }

  // ── Flujo de negociación (Chat) ────────────────────────────────────────────
  @Post('accept-proposal')
  @Roles(UserRole.INFLUENCER)
  acceptProposal(@GetUser() user: User, @Body() dto: AcceptProposalDto) {
    return this.contratosService.acceptProposal(user, dto);
  }

  @Post('reject-proposal')
  @Roles(UserRole.INFLUENCER)
  rejectProposal(@GetUser() user: User, @Body() dto: RejectProposalDto) {
    return this.contratosService.rejectProposal(user, dto);
  }

  @Post('counter-proposal')
  @Roles(UserRole.INFLUENCER)
  counterProposal(@GetUser() user: User, @Body() dto: CounterProposalDto) {
    return this.contratosService.counterProposal(user, dto);
  }

  @Post('resolve-counter')
  @Roles(UserRole.EMPRESA)
  resolveCounter(@GetUser() user: User, @Body() dto: ResolveCounterDto) {
    return this.contratosService.resolveCounter(user, dto);
  }

  // ── Flujo del contrato (Escrow) ────────────────────────────────────────────
  @Post(':id/fund')
  @Roles(UserRole.EMPRESA)
  fundContract(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.fundContract(user, id);
  }

  @Post(':id/submit-deliverables')
  @Roles(UserRole.INFLUENCER)
  submitDeliverables(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() dto: SubmitDeliverablesDto,
  ) {
    return this.contratosService.submitDeliverables(user, id, dto);
  }

  @Post(':id/request-changes')
  @Roles(UserRole.EMPRESA)
  requestChanges(@GetUser() user: User, @Body() dto: RequestChangesDto) {
    return this.contratosService.requestChanges(user, dto);
  }

  @Post(':id/approve-deliverables')
  @Roles(UserRole.EMPRESA)
  approveDeliverables(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.approveDeliverables(user, id);
  }

  @Post(':id/register-publications')
  @Roles(UserRole.INFLUENCER)
  registerPublications(@GetUser() user: User, @Body() dto: RegisterPublicationsDto) {
    return this.contratosService.registerPublications(user, dto);
  }

  @Post(':id/approve')
  @Roles(UserRole.EMPRESA)
  approveAndRelease(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.approveAndRelease(user, id);
  }

  @Post(':id/report-noncompliance')
  @Roles(UserRole.EMPRESA)
  reportNonCompliance(@GetUser() user: User, @Body() dto: ReportNonComplianceDto) {
    return this.contratosService.reportNonCompliance(user, dto);
  }

  @Post(':id/dispute')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  initiateDispute(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() dto: DisputeDto,
  ) {
    return this.contratosService.initiateDispute(user, id, dto);
  }
}
