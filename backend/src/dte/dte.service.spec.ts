import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { DteService } from './dte.service';
import { DteDocument } from './entities/dte-document.entity';
import { DteDetail } from './entities/dte-detail.entity';
import { splitIncludedIva } from './iva.util';

describe('IVA de borradores de desarrollo', () => {
  it.each([113, 100, 0.01, 12.34, 999.99])('conserva el total de %s USD en centavos', (amount) => {
    const result = splitIncludedIva(amount);
    expect(Math.round(result.subtotal * 100) + Math.round(result.iva * 100)).toBe(Math.round(amount * 100));
    // Inclusive prices may differ by one cent from tax on the rounded base.
    expect(Math.abs(Math.round(result.subtotal * 100 * 0.13) - Math.round(result.iva * 100))).toBeLessThanOrEqual(1);
  });

  it('desglosa un total incluido sin incrementar el pago', () => {
    expect(splitIncludedIva(100)).toEqual({ subtotal: 88.50, iva: 11.50, total: 100 });
  });

  it.each([0, -1, NaN, Infinity])('rechaza montos inválidos: %s', (amount) => {
    expect(() => splitIncludedIva(amount)).toThrow();
  });

  it('persiste el desglose, tributo 20 y resumen y los representa en el PDF', async () => {
    const documents = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ ...data, id: '1' })),
    };
    const details = { create: jest.fn((data) => data), save: jest.fn(async (data) => data) };
    const service = new DteService(
      { get: () => 'development' } as unknown as ConfigService,
      documents as unknown as Repository<DteDocument>,
      details as unknown as Repository<DteDetail>,
    );
    // Capture PDF contents without writing files.
    let pdf = '';
    jest.spyOn(service as any, 'createDevelopmentPdf').mockImplementation((input: any) => {
      pdf = (service as any).buildInvoicePdf(input).toString();
      return '/api/uploads/dte/test.pdf';
    });
    await service.createDevelopmentPayoutDte({
      receiptId: 1, receiptNumber: 'REC-1', transactionId: 'TX-1', contractId: 1,
      amountUsd: 113, influencerName: 'Prueba', influencerEmail: 'test@example.com', document: null,
    });
    expect(documents.save).toHaveBeenCalledWith(expect.objectContaining({
      subtotal: 100, total_gravada: 100, monto_iva: 13, total_pagar: 113,
      json_original: expect.objectContaining({ resumen: expect.objectContaining({
        tributos: [{ codigo: '20', descripcion: 'IVA 13%', valor: 13 }], totalPagar: 113,
      }) }),
    }));
    expect(details.save).toHaveBeenCalledWith(expect.objectContaining({
      precio_unitario: 100, venta_gravada: 100, tributos: ['20'],
    }));
    expect(pdf).toContain('IVA 13%');
    expect(pdf).toContain('USD 100.00');
    expect(pdf).toContain('USD 13.00');
    expect(pdf).toContain('USD 113.00');
  });
});
