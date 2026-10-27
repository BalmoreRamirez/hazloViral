// Recover a user-reported recharge without crediting the balance again.
// Usage: node .../recover-recharge.cjs COMPANY_ID AMOUNT APPROXIMATE_ISO_TIME [--apply]
require('dotenv').config({ quiet: true });
require('reflect-metadata');
require('ts-node/register');
require('../../common/timezone');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { DataSource } = require('typeorm');
const { Logger } = require('@nestjs/common');
const { PaymentReceipt } = require('../../receipts/entities/payment-receipt.entity');
const { EmpresaProfile } = require('../../empresas/entities/empresa-profile.entity');
const { InfluencerProfile } = require('../../influencers/entities/influencer-profile.entity');
const { ContratoEscrow } = require('../../contratos/entities/contrato-escrow.entity');
const { DteDocument } = require('../../dte/entities/dte-document.entity');
const { DteDetail } = require('../../dte/entities/dte-detail.entity');
const { DteService } = require('../../dte/dte.service');
const { NotificationsService } = require('../../notifications/notifications.service');
const { ReceiptsService } = require('../../receipts/receipts.service');
Logger.overrideLogger(['error']);
function entityClasses(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? entityClasses(file) : entry.name.endsWith('.entity.ts')
      ? Object.values(require(file)).filter(value => typeof value === 'function') : [];
  });
}
async function main() {
  const empresaId = Number(process.argv[2]), amount = Number(process.argv[3]);
  const reportedTime = new Date(process.argv[4]);
  if (!Number.isSafeInteger(empresaId) || empresaId <= 0 || !Number.isFinite(amount) || amount <= 0 || isNaN(reportedTime.getTime())) throw new Error('Parámetros inválidos');
  if ((process.env.FORMA_PAGO || 'desarrollo') === 'produccion' || (process.env.DTE_MODE || 'development') !== 'development') throw new Error('Solo permitido en desarrollo');
  const apply = process.argv.includes('--apply');
  const db = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_DATABASE, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    entities: entityClasses(path.resolve('src')), synchronize: false, logging: false });
  await db.initialize();
  try {
    const config = { get: (key, fallback) => process.env[key] ?? fallback };
    const dte = new DteService(config, db.getRepository(DteDocument), db.getRepository(DteDetail));
    const company = await db.getRepository(EmpresaProfile).findOne({ where: { id: empresaId }, relations: { user: true } });
    if (!company?.user?.email) throw new Error('Empresa o correo no disponible');
    const balanceBefore = Number(company.balance_creditos);
    const reference = `dev-recovery-${empresaId}-${amount}-${reportedTime.getTime()}`;
    let receipt = await db.getRepository(PaymentReceipt).findOne({ where: { operation_type: 'credits_top_up', operation_reference: reference } });
    if (!apply) {
      console.log(JSON.stringify({ mode: 'evaluación', empresaId, amount, approximateTime: reportedTime.toISOString(), existingReceipt: receipt?.id ?? null, balanceUnchanged: balanceBefore }));
      return;
    }
    if (!receipt) receipt = await db.transaction(async manager => {
      const repo = manager.getRepository(PaymentReceipt);
      const saved = await repo.save(repo.create({
        receipt_number: `REC-DEV-${randomUUID().replace(/-/g, '').slice(0, 20)}`,
        operation_type: 'credits_top_up', operation_reference: reference, wompi_transaction_id: reference,
        empresa_id: empresaId, influencer_id: null, contrato_id: null, amount_usd: amount, currency: 'USD',
        issuer_snapshot: { name: 'InfluSmart', note: 'Documento de desarrollo sin validez fiscal.' },
        customer_snapshot: { name: company.razon_social || company.nombre_comercial, email: company.user.email, nit: company.nit ?? null },
        metadata: { simulated: true, recovered: true, credit_amount: amount, timestamp_approximate: true,
          reported_time: reportedTime.toISOString(), recovery_reason: 'Recarga reportada por el usuario sin comprobante; no se acredita saldo nuevamente.' },
        is_fiscal_dte: false, factura_enviada: false, created_at: reportedTime,
      }));
      await dte.createDevelopmentPayoutDte({ receiptId: saved.id, receiptNumber: saved.receipt_number,
        transactionId: reference, contractId: null, operation: 'credits_top_up', amountUsd: amount,
        influencerName: company.razon_social || company.nombre_comercial, influencerEmail: company.user.email,
        document: company.nit ?? null }, manager);
      return saved;
    });
    const service = new ReceiptsService(db.getRepository(PaymentReceipt), db.getRepository(EmpresaProfile),
      db.getRepository(InfluencerProfile), db.getRepository(ContratoEscrow), db.getRepository(DteDocument),
      new NotificationsService(config), dte);
    const sent = await service.sendCreditsTopUpInvoice(receipt.id);
    const after = await db.getRepository(EmpresaProfile).findOneByOrFail({ id: empresaId });
    if (Number(after.balance_creditos) !== balanceBefore) throw new Error('El saldo cambió durante la recuperación; revisar concurrencia');
    console.log(JSON.stringify({ receiptId: receipt.id, amount, mailAccepted: sent, balanceUnchanged: balanceBefore }));
  } finally { await db.destroy(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
