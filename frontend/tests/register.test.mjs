import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
const require = createRequire(import.meta.url)

function setup() {
  const { descriptor } = parse(fs.readFileSync(new URL('../src/views/auth/RegisterView.vue', import.meta.url), 'utf8'))
  const code = ts.transpile(descriptor.scriptSetup.content, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
  let submitted = 0
  const imports = {
    'vue-router': { useRouter: () => ({ push() {} }) },
    '@/stores/auth': { useAuthStore: () => ({ registerEmpresa: async () => { submitted++ }, registerInfluencer: async () => { submitted++ } }) },
    '@/utils/date': { calculateAge: () => 17 },
    '@/constants/ubicaciones': { DEPARTAMENTOS_SV: [] },
    '@/constants/rubros': { RUBROS: [] },
  }
  const state = new Function('exports', 'require', code + '\nreturn { nextStep, handleSubmit, step, role, email_, password, nombre_comercial, telefono, registered, loading, username, nombre_artistico, fecha_nacimiento, numero_identificacion };')({}, name => name.startsWith('@/') ? imports[name] ?? {} : require(name))
  return { ...state, submitted: () => submitted }
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
