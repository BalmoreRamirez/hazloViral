import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function loadTs(file, imports = {}) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 })
  const exports = {}
  new Function('exports', 'require', code)(exports, (name) => imports[name] ?? require(name))
  return exports
}
const { createAccessGuard } = loadTs('../src/router/access.ts')
const { VIEW_PATHS, viewPath, opaqueViewRoutes } = loadTs('../src/router/paths.ts')

test('rutas opacas estables y únicas, con soporte para detalles', () => {
  assert.equal(new Set(Object.values(VIEW_PATHS)).size, Object.keys(VIEW_PATHS).length)
  for (const opaque of Object.values(VIEW_PATHS)) assert.match(opaque, /^\/v\/[a-f0-9]{16}(\/:id)?$/)
  assert.equal(viewPath('/contratos/2'), VIEW_PATHS['/contratos/:id'].replace(':id', '2'))
  assert.equal(viewPath('/pagos/comprobantes'), VIEW_PATHS['/pagos/comprobantes'])
  assert.equal(viewPath('/login'), '/login')
})
test('redirecciones antiguas conservan parámetros sin perder permisos', () => {
  const [current, legacy] = opaqueViewRoutes([{
    path: '/contratos/:id', name: 'contrato', component: {},
    meta: { auth: true, roles: ['empresa', 'influencer'] },
  }])
  assert.equal(current.path, VIEW_PATHS['/contratos/:id'])
  assert.deepEqual(current.meta.roles, ['empresa', 'influencer'])
  assert.deepEqual(legacy.redirect({ params: { id: '2' }, query: { status: 'ok' }, hash: '#detalle' }), {
    name: 'contrato', params: { id: '2' }, query: { status: 'ok' }, hash: '#detalle', replace: true,
  })
})
const route = (meta = {}, params = {}, name = 'dashboard') => ({ meta, params, name })
function setup(role = 'empresa', verified = true, allowed = true) {
  let reads = 0
  const auth = { user: { role }, validateSession: async () => verified }
  const guard = createAccessGuard(auth, async () => { reads++; if (!allowed) throw new Error('403') })
  return { guard, reads: () => reads }
}

test('exige sesión incluso en rutas sin metadatos', async () => {
  assert.deepEqual(await setup('empresa', false).guard(route()), { name: 'login' })
})
test('permite únicamente rutas expresamente públicas sin sesión', async () => {
  assert.equal(await setup('empresa', false).guard(route({ public: true })), true)
})
test('valida rol único y listas de roles', async () => {
  assert.deepEqual(await setup('influencer').guard(route({ role: 'empresa' })), { name: 'access-denied' })
  assert.deepEqual(await setup('influencer').guard(route({ roles: ['empresa', 'admin'] })), { name: 'access-denied' })
  assert.equal(await setup('empresa').guard(route({ roles: ['empresa', 'admin'] })), true)
})
test('impide que admin abra pagos reservados a participantes', async () => {
  assert.deepEqual(await setup('admin').guard(route({ roles: ['empresa', 'influencer'] })), { name: 'access-denied' })
})
test('redirige usuarios autenticados desde login y permite login sin sesión', async () => {
  assert.deepEqual(await setup().guard(route({ guest: true })), { name: 'dashboard' })
  assert.equal(await setup('empresa', false).guard(route({ guest: true })), true)
})
test('rechaza identificadores manipulados sin consultar recursos', async () => {
  for (const id of ['0', '-1', '1e2', 'abc', '1.5', '2147483648', ['1', '2']]) {
    const state = setup()
    assert.deepEqual(await state.guard(route({}, { id }, 'contrato')), { name: 'access-denied' })
    assert.equal(state.reads(), 0)
  }
})
test('comprueba propiedad de chats y contratos en servidor', async () => {
  for (const name of ['chat', 'contrato']) {
    const state = setup('empresa', true, false)
    assert.deepEqual(await state.guard(route({}, { id: '2' }, name)), { name: 'access-denied' })
    assert.equal(state.reads(), 1)
    assert.equal(await setup().guard(route({}, { id: '2' }, name)), true)
  }
})
test('no consulta recursos cuando el rol está prohibido', async () => {
  const state = setup('admin')
  await state.guard(route({ roles: ['empresa'] }, { id: '1' }, 'contrato'))
  assert.equal(state.reads(), 0)
})
test('ignora usuario local manipulado, restaura rol del servidor y cierra sesión expirada', async () => {
  const storage = new Map([['hv_token', 'test-token'], ['hv_user', '{invalid admin JSON']])
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
  const pinia = require('pinia')
  pinia.setActivePinia(pinia.createPinia())
  let expired = false
  const { useAuthStore } = loadTs('../src/stores/auth.ts', {
    '@/api/auth': { authApi: { me: async () => {
      if (expired) throw { response: { status: 401 } }
      return { id: 1, role: 'empresa', is_active: true }
    } } },
    '@/socket': { disconnectSocket() {} },
  })
  const auth = useAuthStore()
  assert.equal(auth.user, null)
  assert.equal(auth.isAuthenticated, false)
  assert.equal(await auth.validateSession(), true)
  assert.equal(auth.user.role, 'empresa')
  expired = true
  assert.equal(await auth.validateSession(), false)
  assert.equal(auth.user, null)
  assert.equal(auth.token, null)
  assert.equal(storage.has('hv_token'), false)
})
