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
import { SubmitDeliverablesDto } from './dto/submit-deliverables.dto';
import { DisputeDto } from './dto/dispute.dto';

@Controller('contratos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  // GET /api/contratos — mis contratos
  @Get()
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  listMyContratos(@GetUser() user: User) {
    return this.contratosService.listMyContratos(user);
  }

  // GET /api/contratos/:id
  @Get(':id')
  @Roles(UserRole.EMPRESA, UserRole.INFLUENCER)
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.findOne(user, id);
  }

  // POST /api/contratos/accept-proposal — influencer acepta propuesta → crea contrato
  @Post('accept-proposal')
  @Roles(UserRole.INFLUENCER)
  acceptProposal(@GetUser() user: User, @Body() dto: AcceptProposalDto) {
    return this.contratosService.acceptProposal(user, dto);
  }

  // POST /api/contratos/:id/fund — empresa fonda el contrato (Stripe en Parte 7)
  @Post(':id/fund')
  @Roles(UserRole.EMPRESA)
  fundContract(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.fundContract(user, id);
  }

  // POST /api/contratos/:id/submit-deliverables — influencer sube evidencias
  @Post(':id/submit-deliverables')
  @Roles(UserRole.INFLUENCER)
  submitDeliverables(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() dto: SubmitDeliverablesDto,
  ) {
    return this.contratosService.submitDeliverables(user, id, dto);
  }

  // POST /api/contratos/:id/approve — empresa aprueba y libera fondos
  @Post(':id/approve')
  @Roles(UserRole.EMPRESA)
  approveAndRelease(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.contratosService.approveAndRelease(user, id);
  }

  // POST /api/contratos/:id/dispute — cualquier parte inicia disputa
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
