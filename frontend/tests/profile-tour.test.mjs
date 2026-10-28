import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const vue = require('vue')

function setup(needed = vue.ref(true)) {
  let unmount, options, onExit, prepared = 0, started = 0, exits = 0, focused = 0
  class Element { getClientRects() { return [1] } focus() { focused++ } }
  globalThis.HTMLElement = Element
  globalThis.document = { activeElement: new Element(), querySelector: selector => selector === '#visible' ? new Element() : null }
  const tour = {
    setOptions(value) { options = value; return this },
    onComplete() { return this }, onExit(fn) { onExit = fn; return this },
    async start() { started++ }, async exit(force) { assert.equal(force, true); exits++; onExit?.() },
  }
  const imports = {
    vue: { ...vue, onBeforeUnmount(fn) { unmount = fn } },
    'intro.js': { __esModule: true, default: { tour: () => tour } },
  }
  const code = ts.transpile(fs.readFileSync(new URL('../src/composables/useProfileTour.ts', import.meta.url), 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS })
  const exports = {}
  new Function('exports', 'require', code)(exports, name => imports[name] ?? {})
  const guide = exports.useProfileTour(() => { prepared++ }, [
    { selector: '#visible', title: 'Tu marca', intro: 'Completa este campo.' },
    { selector: '#missing', title: 'Oculto', intro: 'No debe aparecer.' },
  ], () => needed.value)
  return { guide, unmount: () => unmount(), exit: () => onExit(), stats: () => ({ options, prepared, started, exits, focused }) }
}
test('guía voluntaria en español, sin objetivos ausentes ni inicio duplicado', async () => {
  const state = setup()
  assert.equal(state.stats().started, 0)
  await Promise.all([state.guide.start(), state.guide.start()])
  const stats = state.stats()
  assert.equal(stats.prepared, 1)
  assert.equal(stats.started, 1)
  assert.equal(stats.options.steps.length, 1)
  assert.equal(stats.options.nextLabel, 'Siguiente')
  assert.equal(stats.options.tooltipRenderAsHtml, false)
  state.exit()
  await vue.nextTick()
  assert.equal(state.guide.active.value, false)
  assert.equal(state.stats().focused, 1)
})
test('salir de la vista elimina el recorrido y evita iniciarlo después', async () => {
  const state = setup()
  await state.guide.start()
  state.unmount()
  await state.guide.start()
  assert.equal(state.stats().exits, 1)
  assert.equal(state.stats().started, 1)
  assert.equal(state.stats().focused, 0)
})

test('perfil completo impide abrir la guía y no prepara edición', async () => {
  const state = setup(vue.ref(false))
  await state.guide.start()
  assert.equal(state.stats().started, 0)
  assert.equal(state.stats().prepared, 0)
})
test('completar perfil cierra una guía que ya estaba abierta', async () => {
  const needed = vue.ref(true)
  const state = setup(needed)
  await state.guide.start()
  needed.value = false
  await vue.nextTick()
  assert.equal(state.guide.active.value, false)
  assert.equal(state.stats().exits, 1)
  await state.guide.start()
  assert.equal(state.stats().started, 1)
})
