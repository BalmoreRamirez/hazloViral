import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
const require = createRequire(import.meta.url)
function setup() {
  const user = { avatar_url: '/old.jpg' }
  const sent = []
  const events = []
  const imports = {
    vue: require('vue'),
    '@/stores/auth': { useAuthStore: () => ({ user }) },
    '@/api/index': { api: { post: async (...args) => { sent.push(args); return { data: { url: '/new.webp' } } } } },
  }
  const { descriptor } = parse(fs.readFileSync(new URL('../src/components/AvatarUpload.vue', import.meta.url), 'utf8'))
  const code = ts.transpile(descriptor.scriptSetup.content, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
  const saved = {}
  const component = new Function('exports', 'require', 'defineProps', 'defineEmits', 'localStorage', code + '\nreturn { onFileChange, error, uploading };')({}, name => imports[name], () => ({ name: 'Creador', editable: true }), () => (...args) => events.push(args), { setItem: (key, value) => { saved[key] = value } })
  return { ...component, user, sent, events, saved }
}
function change(file) { return { target: { files: [file], value: 'selected' } } }
test('rechaza archivos ajenos a JPG y PNG sin cambiar el avatar', async () => {
  const state = setup()
  await state.onFileChange(change(new File(['bad'], 'photo.webp', { type: 'image/webp' })))
  assert.equal(state.sent.length, 0)
  assert.equal(state.user.avatar_url, '/old.jpg')
  assert.match(state.error.value, /JPG o PNG/)
})
test('actualiza sesión y emite confirmación después de subir PNG', async () => {
  const state = setup()
  await state.onFileChange(change(new File(['image'], 'photo.png', { type: 'image/png' })))
  assert.equal(state.sent[0][0], '/uploads/avatar')
  assert.equal(state.user.avatar_url, '/new.webp')
  assert.equal(JSON.parse(state.saved.hv_user).avatar_url, '/new.webp')
  assert.deepEqual(state.events, [['updated', '/new.webp']])
  assert.equal(state.uploading.value, false)
})
test('evita otra subida mientras hay una en curso', async () => {
  const state = setup()
  state.uploading.value = true
  await state.onFileChange(change(new File(['image'], 'photo.png', { type: 'image/png' })))
  assert.equal(state.sent.length, 0)
})
