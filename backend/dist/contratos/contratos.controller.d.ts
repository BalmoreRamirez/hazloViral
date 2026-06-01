import { ContratosService } from './contratos.service';
import { User } from '../users/entities/user.entity';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { SubmitDeliverablesDto } from './dto/submit-deliverables.dto';
import { DisputeDto } from './dto/dispute.dto';
export declare class ContratosController {
    private readonly contratosService;
    constructor(contratosService: ContratosService);
    listMyContratos(user: User): Promise<import("./entities/contrato-escrow.entity").ContratoEscrow[]>;
    findOne(id: number, user: User): Promise<import("./entities/contrato-escrow.entity").ContratoEscrow>;
    acceptProposal(user: User, dto: AcceptProposalDto): Promise<import("./entities/contrato-escrow.entity").ContratoEscrow>;
    fundContract(id: number, user: User): Promise<import("./entities/contrato-escrow.entity").ContratoEscrow>;
    submitDeliverables(id: number, user: User, dto: SubmitDeliverablesDto): Promise<import("./entities/contrato-escrow.entity").ContratoEscrow>;
    approveAndRelease(id: number, user: User): Promise<import("./entities/contrato-escrow.entity").ContratoEscrow>;
    initiateDispute(id: number, user: User, dto: DisputeDto): Promise<import("./entities/contrato-escrow.entity").ContratoEscrow>;
}
