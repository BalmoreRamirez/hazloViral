import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function setup({ missing = false, ratingsFail = false, saveFail = false } = {}) {
  const profile = { id: 1, nombre_comercial: 'Marca', sitio_web: 'https://example.com', stats: {} }
  const imports = {
    vue: { ...require('vue'), onMounted() {} },
    'vue-router': { useRoute: () => ({ params: { id: '1' } }) },
    '@/stores/auth': { useAuthStore: () => ({ isEmpresa: false, isInfluencer: true }) },
    '@/api/profiles': { empresaApi: { getPublic: async () => {
      if (missing) throw { response: { status: 404 } }
      return profile
    } } },
    '@/api/ratings': { empresaRatingsApi: {
      getSummary: async () => { if (ratingsFail) throw new Error('Ratings unavailable'); return { promedio: null, total: 0 } },
      getAll: async () => ({ items: [], total: 0, page: 1, pageSize: 6 }), getMine: async () => ({ puede_calificar: true, rating: null }),
      upsert: async () => { if (saveFail) throw new Error('Network'); return {} },
    } },
  }
  const { descriptor } = parse(fs.readFileSync(new URL('../src/views/empresas/EmpresaPublicView.vue', import.meta.url), 'utf8'))
  const code = ts.transpile(descriptor.scriptSetup.content, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
  return new Function('exports', 'require', code + '\nreturn { loadProfile, profile, notFound, ratingsError, ratingForm, ratingDone, ratingError, submitRating, safeUrl };')({}, name => imports[name] ?? {})
}
test('fallo de reseñas no convierte una empresa existente en no encontrada', async () => {
  const page = setup({ ratingsFail: true })
  await page.loadProfile()
  assert.equal(page.notFound.value, false)
  assert.equal(page.profile.value.nombre_comercial, 'Marca')
  assert(page.ratingsError.value)
})
test('404 del perfil muestra estado de marca no encontrada', async () => {
  const page = setup({ missing: true })
  await page.loadProfile()
  assert.equal(page.notFound.value, true)
  assert.equal(page.profile.value, null)
})
test('fallo al guardar reseña conserva el texto y no comunica éxito', async () => {
  const page = setup({ saveFail: true })
  await page.loadProfile()
  page.ratingForm.value = { estrellas: 4, comentario: 'Mi experiencia' }
  await page.submitRating()
  assert.equal(page.ratingDone.value, false)
  assert.equal(page.ratingForm.value.comentario, 'Mi experiencia')
  assert(page.ratingError.value)
})
test('enlaces públicos solo admiten protocolos web', () => {
  const page = setup()
  assert.equal(page.safeUrl('javascript:alert(1)'), null)
  assert.equal(page.safeUrl('data:text/html,test'), null)
  assert.equal(page.safeUrl('https://example.com'), 'https://example.com/')
})
