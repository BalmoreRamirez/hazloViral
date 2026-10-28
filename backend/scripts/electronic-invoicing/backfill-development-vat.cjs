// Run inside backend: node scripts/electronic-invoicing/backfill-development-vat.cjs [--apply]
// Only updates the legacy, single-item simulated payout format. Never fiscal DTEs.
require('dotenv').config({ quiet: true });
require('ts-node/register');
require('../../src/config/timezone');
const { Client } = require('pg');
const { mkdirSync, writeFileSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { randomUUID } = require('crypto');
const { ElectronicInvoicingService, amountToSpanishWords } = require('../../src/modules/electronic-invoicing/electronic-invoicing.service');
const { splitIncludedVat } = require('../../src/modules/electronic-invoicing/vat.util');
const { getLocalDateTime, formatLocalTimeForDocument } = require('../../src/common/utils/date.util');

async function main() {
  const apply = process.argv.includes('--apply');
  const reconcile = process.argv.includes('--reconcile-receipts');
  if ((process.env.DTE_MODE || 'development').toLowerCase() !== 'development') {
    throw new Error('Este script solo permite DTE_MODE=development.');
  }
  const client = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_DATABASE, user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM dte_documents ORDER BY id FOR UPDATE');
    const updated = [];
    const skipped = [];
    const backupDir = join(process.cwd(), 'uploads', 'maintenance', `iva-${randomUUID()}`);
    const pdfBuilder = new ElectronicInvoicingService({}, {}, {});
    for (const document of rows) {
      const source = document.json_original;
      const { rows: details } = await client.query('SELECT * FROM dte_details WHERE dte_id=$1 FOR UPDATE', [document.id]);
      const { rows: receipts } = await client.query('SELECT * FROM payment_receipts WHERE id=$1', [document.payment_receipt_id]);
      const receipt = receipts[0];
      const oldTotal = Number(document.total_pagar);
      const oldBase = Number(document.subtotal);
      const total = reconcile ? Number(receipt?.amount_usd) : oldTotal;
      const { rows: contracts } = await client.query('SELECT monto_total, comision_plataforma FROM contratos_escrow WHERE id=$1 FOR SHARE', [receipt?.contrato_id ?? null]);
      const contract = contracts[0];
      const contractMatches = contract && Math.round((Number(contract.monto_total) - Number(contract.comision_plataforma)) * 100) === Math.round(total * 100);
      const item = source?.cuerpoDocumento?.[0];
      const eligible = document.ambiente === '00' && document.estado === 'BORRADOR'
        && document.tipo_dte === '03' && document.numero_control.startsWith('DTE-DEV-')
        && source?.emisor?.modo === 'desarrollo'
        && !document.sello_recibido && !document.json_firmado && !document.respuesta_mh
        && (reconcile ? contractMatches : (document.monto_iva === null || Number(document.monto_iva) === 0))
        && Number(document.total_exenta) === 0 && Number(document.total_no_sujeta) === 0
        && Number(document.total_gravada) === oldBase
        && Math.round((oldBase + Number(document.monto_iva ?? 0)) * 100) === Math.round(oldTotal * 100)
        && Number.isFinite(total) && total > 0
        && receipt?.operation_type === 'influencer_payout' && !receipt.is_fiscal_dte
        && receipt.currency === 'USD' && Number(receipt.amount_usd) === total
        && details.length === 1 && Number(details[0].cantidad) === 1
        && Number(details[0].venta_gravada) === oldBase && Number(details[0].precio_unitario) === oldBase
        && Number(details[0].monto_descuento) === 0 && Number(details[0].venta_exenta) === 0
        && Number(details[0].venta_no_sujeta) === 0
        && (!details[0].tributos?.length || details[0].tributos.every(code => code === '20'))
        && source.cuerpoDocumento.length === 1 && Number(item.cantidad) === 1
        && Number(item.ventaGravada) === oldBase && Number(item.precioUni) === oldBase
        && Number(source.totalPagar) === oldTotal;
      if (!eligible) { skipped.push(document.id); continue; }
      const amounts = splitIncludedVat(total);
      updated.push({ id: document.id, subtotal: amounts.subtotal, iva: amounts.iva, total: amounts.total });
      if (!apply) continue;
      mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      writeFileSync(join(backupDir, `${document.id}.json`), JSON.stringify({ document, details, receipt, contract }, null, 2), { mode: 0o600 });
      if (document.pdf_url?.startsWith('/api/uploads/dte/')) {
        const oldFile = join(process.cwd(), 'uploads', 'dte', document.pdf_url.split('/').pop());
        if (existsSync(oldFile)) writeFileSync(join(backupDir, `${document.id}.pdf`), readFileSync(oldFile), { mode: 0o600 });
      }
      const revised = {
        ...source,
        totalPagar: total,
        cuerpoDocumento: [{ ...item, precioUni: amounts.subtotal, ventaGravada: amounts.subtotal, tributos: ['20'] }],
        resumen: {
          ...source.resumen, totalGravada: amounts.subtotal, subTotal: amounts.subtotal,
          tributos: [{ codigo: '20', descripcion: 'IVA 13%', valor: amounts.iva }],
          montoTotalOperacion: total, totalPagar: total,
        },
        calculoIva: { tasa: 13, incluidoEnMonto: true, simulado: true, regularizado: new Date().toISOString(), conciliadoConComprobante: reconcile },
      };
      const contractId = source.contratoId ?? source.contrato_id ?? source.contrato ?? receipt.contrato_id;
      const pdf = pdfBuilder.buildInvoicePdf({
        numeroControl: document.numero_control, codigoGeneracion: document.codigo_generacion,
        date: document.fecha_emision instanceof Date ? getLocalDateTime(document.fecha_emision).date : document.fecha_emision,
        time: formatLocalTimeForDocument(document.created_at),
        amountUsd: total, subtotal: amounts.subtotal, iva: amounts.iva,
        influencerName: source.receptor?.nombre ?? 'Receptor', influencerEmail: source.receptor?.correo ?? '',
        document: source.receptor?.documento ?? null, contractId, transactionId: source.referenciaPago ?? '',
      });
      const filename = `${randomUUID()}.pdf`;
      mkdirSync(join(process.cwd(), 'uploads', 'dte'), { recursive: true });
      writeFileSync(join(process.cwd(), 'uploads', 'dte', filename), pdf);
      await client.query('UPDATE dte_documents SET subtotal=$1,total_gravada=$1,monto_iva=$2,json_original=$3,pdf_url=$4,total_pagar=$6,total_letras=$7,updated_at=NOW() WHERE id=$5',
        [amounts.subtotal, amounts.iva, revised, `/api/uploads/dte/${filename}`, document.id, total, amountToSpanishWords(total)]);
      await client.query('UPDATE dte_details SET precio_unitario=$1,venta_gravada=$1,tributos=$2::jsonb WHERE dte_id=$3',
        [amounts.subtotal, JSON.stringify(['20']), document.id]);
      const { rows: [check] } = await client.query('SELECT subtotal + monto_iva = total_pagar AS balanced, total_pagar FROM dte_documents WHERE id=$1', [document.id]);
      if (!check.balanced || Number(check.total_pagar) !== total) throw new Error(`Totales inconsistentes: ${document.id}`);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify({ mode: apply ? 'aplicado' : 'evaluación', evaluated: rows.length, updated, skipped,
      ...(apply && updated.length ? { backupDir } : {}) }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
