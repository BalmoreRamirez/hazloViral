import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
const require = createRequire(import.meta.url)

function setup({ validFields = false } = {}) {
  const { descriptor } = parse(fs.readFileSync(new URL('../src/views/auth/RegisterView.vue', import.meta.url), 'utf8'))
  const code = ts.transpile(descriptor.scriptSetup.content, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
  let submitted = 0
  let payload
  const imports = {
    'vue-router': { useRouter: () => ({ push() {} }) },
    '@/stores/auth': { useAuthStore: () => ({ registerEmpresa: async data => { submitted++; payload = data }, registerInfluencer: async data => { submitted++; payload = data } }) },
    '@/utils/date': { calculateAge: () => 17 },
    '@/constants/ubicaciones': { DEPARTAMENTOS_SV: [] },
    '@/constants/rubros': { RUBROS: [] },
  }
  if (validFields) imports['@vuelidate/core'] = { useVuelidate: () => require('vue').ref({ $validate: async () => true, $reset() {} }) }
  const state = new Function('exports', 'require', code + '\nreturn { submit, legalDocuments, acceptedTerms, acceptedPrivacy, nextStep, handleSubmit, step, role, email_, password, nombre_comercial, telefono, registered, loading, username, nombre_artistico, fecha_nacimiento, numero_identificacion };')({}, name => imports[name] ?? (name.startsWith('@/') ? {} : require(name)))
  return { ...state, submitted: () => submitted, payload: () => payload }
}
test('no avanza sin credenciales válidas ni envía la cuenta antes de terminar', async () => {
  const form = setup()
  await form.nextStep()
  assert.equal(form.step.value, 1)
  form.email_.value = 'test@example.com'
  form.password.value = 'Example123!'
  await form.nextStep()
  assert.equal(form.step.value, 2)
  assert.equal(form.submitted(), 0)
  await form.nextStep()
  assert.equal(form.step.value, 2)
})
test('doble clic no salta etapas y la verificación sigue siendo obligatoria', async () => {
  const form = setup()
  form.email_.value = 'test@example.com'
  form.password.value = 'Example123!'
  await Promise.all([form.nextStep(), form.nextStep()])
  assert.equal(form.step.value, 2)
  form.nombre_comercial.value = 'Marca'
  form.telefono.value = '+503 7000-0000'
  await form.nextStep()
  assert.equal(form.step.value, 3)
  await form.handleSubmit()
  assert.equal(form.submitted(), 0)
  assert.equal(form.registered.value, false)
  assert.equal(form.loading.value, false)
})

test('el perfil menor conserva la exigencia de datos y autorización del tutor', async () => {
  const form = setup()
  form.role.value = 'influencer'
  await require('vue').nextTick()
  form.email_.value = 'creator@example.com'
  form.password.value = 'Example123!'
  await form.nextStep()
  form.username.value = 'creador_test'
  form.nombre_artistico.value = 'Creador'
  await form.nextStep()
  form.fecha_nacimiento.value = '2009-01-01'
  form.numero_identificacion.value = '12345678-9'
  await form.handleSubmit()
  assert.equal(form.step.value, 3)
  assert.equal(form.submitted(), 0)
  assert.equal(form.loading.value, false)
})

test('registro exige dos aceptaciones explícitas incluso con formulario válido', async () => {
  const form = setup({ validFields: true })
  form.legalDocuments.value = { terms: { version: 'terms-v1' }, privacy: { version: 'privacy-v1' } }
  assert.equal(form.acceptedTerms.value, false)
  assert.equal(form.acceptedPrivacy.value, false)
  await form.submit()
  assert.equal(form.submitted(), 0)
  form.acceptedTerms.value = true
  await form.submit()
  assert.equal(form.submitted(), 0)
  form.acceptedPrivacy.value = true
  await form.submit()
  assert.equal(form.submitted(), 1)
  assert.equal(form.payload().terms_version, 'terms-v1')
  assert.equal(form.payload().privacy_version, 'privacy-v1')
  assert.equal(form.payload().accepted_terms, true)
  assert.equal(form.payload().accepted_privacy, true)
})
test('no registra sin documentos disponibles y reinicia aceptación al cambiar rol', async () => {
  const form = setup({ validFields: true })
  form.acceptedTerms.value = true
  form.acceptedPrivacy.value = true
  await form.submit()
  assert.equal(form.submitted(), 0)
  form.role.value = 'influencer'
  await require('vue').nextTick()
  assert.equal(form.acceptedTerms.value, false)
  assert.equal(form.acceptedPrivacy.value, false)
})
