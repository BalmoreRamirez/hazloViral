import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const code = ts.transpile(fs.readFileSync(new URL('../src/utils/profile-completion.ts', import.meta.url), 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
const completion = {}
new Function('exports', code)(completion)
const company = {
  nombre_comercial: 'Marca', rubro: 'moda', telefono: '+503 70000000', nit: '123',
  representante_nombre: 'Representante', representante_numero_identificacion: '12345678-9',
  sitio_web: 'https://example.com', verification_checklist: { logo: true, email_verificado: false },
}
const influencer = {
  nombre_artistico: 'Creador', username: 'creador', bio: 'Mi presentación', ubicacion: 'El Salvador',
  tipo_identificacion: 'DUI', numero_identificacion: '12345678-9', rubros: ['moda'],
  banco_nombre: 'Banco', banco_cuenta_numero: '123', banco_cuenta_tipo: 'AHORROS',
  metrics: [{ is_verified: true }], user: { avatar_url: '/avatar.png', is_email_verified: false },
}
test('no abre la guía sin perfil cargado ni por datos ya completos', () => {
  assert.equal(completion.companyNeedsProfileGuide(null), false)
  assert.equal(completion.influencerNeedsProfileGuide(null), false)
  assert.equal(completion.companyNeedsProfileGuide(company), false)
  assert.equal(completion.influencerNeedsProfileGuide(influencer), false)
})
test('detecta información de empresa pendiente, incluido logo y presencia online', () => {
  for (const change of [{ nit: '' }, { telefono: '  ' }, { representante_nombre: '' }, { sitio_web: null }, { verification_checklist: { logo: false } }]) {
    assert.equal(completion.companyNeedsProfileGuide({ ...company, ...change }), true)
  }
})
test('detecta presentación, identidad, redes y cuenta bancaria del creador', () => {
  for (const change of [{ bio: '' }, { numero_identificacion: '' }, { banco_cuenta_numero: null }, { metrics: [] }, { rubros: [] }, { user: { avatar_url: null } }]) {
    assert.equal(completion.influencerNeedsProfileGuide({ ...influencer, ...change }), true)
  }
})

test('perfil verificado no muestra guía aunque falten datos adicionales o bancarios', () => {
  assert.equal(completion.influencerNeedsProfileGuide({ ...influencer, is_verified: true, bio: '', banco_cuenta_numero: null }), false)
  assert.equal(completion.companyNeedsProfileGuide({ ...company, is_verified: true, rubro: '' }), false)
})

test('influencer: dos campos pendientes producen exactamente dos pasos específicos', () => {
  const steps = completion.influencerProfileGuideSteps({ ...influencer, bio: '', banco_cuenta_numero: null })
  assert.deepEqual(steps.map(step => step.selector), ['#creator-bio', '#creator-banco-cuenta-numero'])
})
test('empresa: dos campos pendientes producen exactamente dos pasos específicos', () => {
  const steps = completion.companyProfileGuideSteps({ ...company, telefono: '', representante_nombre: '' })
  assert.deepEqual(steps.map(step => step.selector), ['#company-telefono', '#company-representante-nombre'])
})
test('no agrega pasos generales, de guardado ni de campos ya completos', () => {
  assert.deepEqual(completion.companyProfileGuideSteps(company), [])
  const steps = completion.influencerProfileGuideSteps({ ...influencer, user: { avatar_url: null } })
  assert.deepEqual(steps.map(step => step.selector), ['#creator-avatar'])
})
