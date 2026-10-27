import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/utils/date.ts', import.meta.url), 'utf8')
const code = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
const date = {}
new Function('exports', code)(date)

test('fechas sin hora conservan su día y representan medianoche UTC-6', () => {
  assert.equal(date.parseAppDate('2026-10-27').toISOString(), '2026-10-27T06:00:00.000Z')
  assert.match(date.formatDate('2026-10-27'), /27/)
})
test('timestamps con y sin zona representan el mismo instante', () => {
  for (const value of ['2026-10-27T12:00:00', '2026-10-27 12:00:00', '2026-10-27T12:00:00-06:00', '2026-10-27T18:00:00Z']) {
    assert.equal(date.parseAppDate(value).toISOString(), '2026-10-27T18:00:00.000Z')
    assert.match(date.formatLocalDateTimeForDocument(value), /2026-10-27 12:00:00/)
  }
})
test('medianoche y mayoría de edad usan el día local de El Salvador', () => {
  const before = new Date('2026-10-27T05:59:59Z')
  const after = new Date('2026-10-27T06:00:00Z')
  assert.equal(date.todayInAppTimeZone(before), '2026-10-26')
  assert.equal(date.todayInAppTimeZone(after), '2026-10-27')
  assert.equal(date.calculateAge('2008-10-27', before), 17)
  assert.equal(date.calculateAge('2008-10-27', after), 18)
})
