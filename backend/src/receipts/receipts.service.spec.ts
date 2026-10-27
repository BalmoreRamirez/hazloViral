import { ReceiptsService } from './receipts.service';

describe('Correo de factura de recarga', () => {
  function setup(sent: boolean, alreadySent = false) {
    const receipt = { id: 3, operation_type: 'credits_top_up', empresa_id: 1, amount_usd: '100.00', receipt_number: 'REC-3', factura_enviada: alreadySent };
    const receipts = { findOne: jest.fn().mockResolvedValue(receipt), update: jest.fn() };
    const companies = { findOne: jest.fn().mockResolvedValue({ nombre_comercial: 'Marca', user: { email: 'test@example.com' } }) };
    const documents = { findOne: jest.fn().mockResolvedValue({ pdf_url: '/api/uploads/dte/test.pdf', ambiente: '00', numero_control: 'DTE-DEV-3', subtotal: '88.50', monto_iva: '11.50' }) };
    const notifications = { sendCreditsTopUpReceipt: jest.fn().mockResolvedValue(sent) };
    const dte = { isDevelopmentMode: () => true, createDevelopmentPayoutDte: jest.fn().mockResolvedValue({}) };
    const service = new ReceiptsService(receipts as any, companies as any, {} as any, {} as any, documents as any, notifications as any, dte as any);
    return { service, receipts, notifications };
  }

  it('marca envío solo cuando SMTP acepta el correo con el PDF', async () => {
    const { service, receipts, notifications } = setup(true);
    expect(await service.sendCreditsTopUpInvoice(3)).toBe(true);
    expect(notifications.sendCreditsTopUpReceipt).toHaveBeenCalledWith(expect.objectContaining({
      amountUsd: 100, subtotal: 88.5, iva: 11.5, pdfPath: expect.stringContaining('uploads/dte/test.pdf'),
    }));
    expect(receipts.update).toHaveBeenCalledWith(3, { factura_enviada: true });
  });

  it('conserva pendiente si falla SMTP, sin propagar el error a la recarga', async () => {
    const { service, receipts, notifications } = setup(false);
    notifications.sendCreditsTopUpReceipt.mockRejectedValueOnce(new Error('SMTP timeout'));
    expect(await service.sendCreditsTopUpInvoice(3)).toBe(false);
    expect(receipts.update).not.toHaveBeenCalled();
  });

  it('evita reenviar automáticamente una factura ya enviada', async () => {
    const { service, notifications } = setup(true, true);
    expect(await service.sendCreditsTopUpInvoice(3)).toBe(true);
    expect(notifications.sendCreditsTopUpReceipt).not.toHaveBeenCalled();
  });
});
