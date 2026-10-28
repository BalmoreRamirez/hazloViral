import { ContractsService } from './contracts.service';
import { ContractStatus, ProposalStatus, UserRole } from '../../common/enums';
import { EscrowContract } from './entities/escrow-contract.entity';

describe('Admin-configured contract commission', () => {
  it('snapshots the current commission when an influencer accepts a proposal', async () => {
    const proposal: any = {
      id: 4,
      chat_id: 7,
      proposal_status: ProposalStatus.PENDING,
      proposal_data: { tarifa: 200, entregables: [], plazo: '2026-11-30' },
      chat: { empresa_id: 2, influencer_id: 3 },
    };
    const messagesRepo = { findOne: jest.fn().mockResolvedValue(proposal) };
    const influencersRepo = { findOne: jest.fn().mockResolvedValue({ id: 3 }) };
    const manager = { save: jest.fn(async (entity) => {
      if (entity instanceof EscrowContract) entity.id = 99;
      return entity;
    }) };
    const dataSource = { transaction: jest.fn((callback) => callback(manager)) };
    const adminService = { getNumber: jest.fn().mockResolvedValue(15) };
    const gateway = { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } };
    const service = new ContractsService(
      {} as any, {} as any, {} as any, {} as any, messagesRepo as any, {} as any,
      influencersRepo as any, gateway as any, adminService as any, {} as any, dataSource as any,
    );
    jest.spyOn(service as any, 'attachBrief').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'writeAudit').mockResolvedValue(undefined);

    const contract = await service.acceptProposal({ id: 8, role: UserRole.INFLUENCER } as any, { message_id: 4 } as any);

    expect(adminService.getNumber).toHaveBeenCalledWith('platform_commission_pct', 10);
    expect(contract.comision_plataforma).toBe(30);
    expect(contract.monto_total).toBe(200);
    expect(contract.status).toBe(ContractStatus.PENDING_PAYMENT);
  });
});
