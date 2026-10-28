import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

function loadModule(path, imports = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
  const exports = {}
  new Function('exports', 'require', code)(exports, name => {
    if (Object.hasOwn(imports, name)) return imports[name]
    throw new Error(`Unexpected import: ${name}`)
  })
  return exports
}

let response
const api = {
  get: async () => ({ data: response }),
}
const money = loadModule('../src/utils/money.ts')
const receipts = loadModule('../src/api/receipts.ts', {
  './index': { api },
  '@/utils/money': money,
}).receiptsApi

function receipt(overrides = {}) {
  return {
    id: 1,
    receipt_number: 'REC-1',
    operation_type: 'credits_top_up',
    operation_reference: 'ref-1',
    wompi_transaction_id: null,
    contrato_id: null,
    amount_usd: '125.40',
    currency: 'USD',
    issuer_snapshot: {},
    customer_snapshot: {},
    metadata: null,
    is_fiscal_dte: false,
    factura_enviada: false,
    dte: {
      numero_control: 'DTE-1',
      codigo_generacion: 'GEN-1',
      estado: 'emitido',
      ambiente: '00',
      fecha_emision: '2026-01-01',
      subtotal: '100.00',
      monto_iva: '13.00',
      total_pagar: '113.00',
      pdf_url: null,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

test('normaliza los decimales de recibo y DTE de texto a número', async () => {
  response = receipt()
  const normalized = await receipts.get(1)

  assert.equal(normalized.amount_usd, 125.4)
  assert.equal(normalized.dte.subtotal, 100)
  assert.equal(normalized.dte.monto_iva, 13)
  assert.equal(normalized.dte.total_pagar, 113)
})

test('representa montos inválidos como null sin mostrar un cero falso', async () => {
  response = receipt({ amount_usd: 'not-a-number' })
  const normalized = await receipts.get(1)

  assert.equal(normalized.amount_usd, null)
})
