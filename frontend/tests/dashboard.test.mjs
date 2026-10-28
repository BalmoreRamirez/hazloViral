import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/utils/dashboard.ts', import.meta.url), 'utf8')
const code = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
const dashboard = {}
new Function('exports', code)(dashboard)
const contract = (status, extra = {}) => ({ status, monto_total: 100, comision_plataforma: 10, payout_status: 'pending', stripe_transfer_id: null, ...extra })

test('pendientes específicos por rol sin pedir acciones al participante equivocado', () => {
  assert.equal(dashboard.contractTask(contract('under_review'), true).action, 'Revisar')
  assert.equal(dashboard.contractTask(contract('under_review'), false), null)
  assert.equal(dashboard.contractTask(contract('changes_requested'), false).action, 'Ver cambios')
  assert.equal(dashboard.contractTask(contract('changes_requested'), true), null)
  assert.equal(dashboard.contractTask(contract('pending_payment'), false), null)
})
test('contratos completados sin pago confirmado no se cuentan como ingresos recibidos', () => {
  const rows = [
    contract('completed', { monto_total: '200.00', comision_plataforma: '20.00', payout_status: 'paid' }),
    contract('completed', { payout_status: 'failed' }),
    contract('completed', { payout_status: 'processing' }),
    contract('completed'),
    contract('pending_payment'),
    contract('funded_in_escrow', { monto_total: '350.00', comision_plataforma: '35.00' }),
  ]
  const creator = dashboard.dashboardSummary(rows, false)
  assert.equal(creator.confirmedAmount, 180)
  assert.equal(creator.inProgressAmount, 315)
  assert.equal(creator.active, 1)
  assert.equal(creator.tasks, 1)
  const company = dashboard.dashboardSummary(rows, true)
  assert.equal(company.inProgressAmount, 350)
  assert.equal(company.funding, 1)
})
test('sin contratos devuelve un resumen vacío y los montos se suman en centavos', () => {
  assert.equal(dashboard.dashboardSummary([], false).confirmedAmount, 0)
  const rows = [contract('funded_in_escrow', { monto_total: 0.1, comision_plataforma: 0 }), contract('funded_in_escrow', { monto_total: 0.2, comision_plataforma: 0 })]
  assert.equal(dashboard.dashboardSummary(rows, false).inProgressAmount, 0.3)
})
