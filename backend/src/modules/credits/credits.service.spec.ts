import { CreditsService } from './credits.service';

describe('Historial de recargas simuladas', () => {
  function setup(receiptError?: Error) {
    const empresa = { id: 1, balance_creditos: 10, umbral_creditos: 5, nombre_comercial: 'Marca' };
    const receiptRepo = {
      create: jest.fn(data => data),
      save: jest.fn(async data => { if (receiptError) throw receiptError; return data; }),
    };
    const query = { setLock: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(empresa) };
    let repositories = 0;
    const manager = {
      getRepository: jest.fn(() => ++repositories === 1 ? { createQueryBuilder: () => query } : receiptRepo),
      save: jest.fn().mockResolvedValue(empresa),
    };
    const source = { transaction: jest.fn(async callback => callback(manager)) };
    const dte = { isDevelopmentMode: () => true, createDevelopmentPayoutDte: jest.fn().mockResolvedValue({}) };
    const adminService = { getNumber: jest.fn(async (key: string, fallback: number) => key === 'chat_open_cost' ? 2 : key === 'min_credit_threshold' ? 5 : fallback) };
    const service = new CreditsService({ findOne: async () => empresa } as any, adminService as any, source as any, dte as any, { sendCreditsTopUpInvoice: jest.fn().mockResolvedValue(true) } as any);
    return { service, receiptRepo, source, dte, empresa, adminService };
  }

  it('acredita y registra la simulación en la misma transacción', async () => {
    const { service, receiptRepo, source, dte } = setup();
    const result = await service.addCreditsForUser(1, 25);
    expect(result.balance_creditos).toBe(35);
    expect(source.transaction).toHaveBeenCalledTimes(1);
    expect(dte.createDevelopmentPayoutDte).toHaveBeenCalledWith(expect.objectContaining({ operation: 'credits_top_up', amountUsd: 25, contractId: null }), expect.anything());
    expect(receiptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      empresa_id: 1, amount_usd: 25, operation_type: 'credits_top_up',
      metadata: { simulated: true, credit_amount: 25 },
    }));
  });

  it('propaga el fallo del comprobante para que TypeORM revierta la transacción', async () => {
    const { service } = setup(new Error('No se pudo guardar el comprobante'));
    await expect(service.addCreditsForUser(1, 25)).rejects.toThrow('No se pudo guardar el comprobante');
  });

  it('rechaza la transacción si falla la generación de la factura', async () => {
    const { service, dte } = setup();
    dte.createDevelopmentPayoutDte.mockRejectedValueOnce(new Error('Error DTE'));
    await expect(service.addCreditsForUser(1, 25)).rejects.toThrow('Error DTE');
  });

  it('no duplica el comprobante del flujo de pagos reales', async () => {
    const { service, receiptRepo } = setup();
    await service.addCredits(1, 25);
    expect(receiptRepo.save).not.toHaveBeenCalled();
  });

  it('uses the admin-configured chat cost when debiting a new conversation', async () => {
    const { service, empresa, adminService } = setup();
    const result = await service.deductChatOpenCost(empresa.id);

    expect(adminService.getNumber).toHaveBeenCalledWith('chat_open_cost', 1);
    expect(empresa.balance_creditos).toBe(8);
    expect(result.balance_creditos).toBe(8);
  });

  it('applies the current global threshold when building a company balance', async () => {
    const { service, empresa, adminService } = setup();
    adminService.getNumber.mockImplementation(async (key: string, fallback: number) => key === 'min_credit_threshold' ? 12 : fallback);

    const result = await service.getBalance(1);
    expect(result.umbral_creditos).toBe(12);
    expect(result.is_above_threshold).toBe(false);
    expect(result.deficit).toBe(2);
  });
});
