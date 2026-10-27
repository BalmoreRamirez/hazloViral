<script setup lang="ts">
import { viewPath } from '@/router/paths'
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import ProfileOverview from '@/components/ProfileOverview.vue'
import ProfileProgress from '@/components/ProfileProgress.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
import { useProfileStore, type EmpresaProfile } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { RUBROS, rubroLabel } from '@/constants/rubros'
import { PAISES, DEPARTAMENTOS_SV, parseUbicacion, formatUbicacion } from '@/constants/ubicaciones'
import { useVuelidate } from '@vuelidate/core'
import { required, email, url, helpers } from '@vuelidate/validators'
import { useToast } from 'primevue/usetoast'
// Button, InputText, Textarea, Tag, Divider, Toast, ConfirmDialog
// están registrados globalmente en main.ts — no requieren import local

const store     = useProfileStore()
const authStore = useAuthStore()
const toast     = useToast()

const editing       = ref(false)
const profileError  = ref('')

const TIPOS_ID = ['DUI', 'PASAPORTE']

const CHECKLIST_LABELS: Record<string, string> = {
  email_verificado: 'Correo electrónico verificado',
  logo:             'Logo de la marca (foto de perfil)',
  nit:              'NIT de la empresa',
  representante:    'Nombre y documento del representante legal',
  telefono:         'Teléfono de contacto',
  presencia_online: 'Sitio web, Instagram o TikTok de la marca',
}

const p = computed(() => store.empresaProfile)

const checklist = computed(() => Object.entries(CHECKLIST_LABELS).map(([key, label]) => ({ label, ok: !!p.value?.verification_checklist?.[key as keyof typeof p.value.verification_checklist] })))
const loadError = ref('')
async function loadProfile() {
  loadError.value = ''
  try { await store.loadEmpresaProfile() }
  catch { loadError.value = 'No se pudo cargar el perfil de empresa. Intenta nuevamente.' }
}

const ubicacionTexto = computed(() => {
  if (!p.value) return ''
  return [p.value.direccion, p.value.pais].filter(Boolean).join(' · ')
})

// ─── Formulario de perfil ─────────────────────────────────────────────────────
function emptyForm() {
  return {
    nombre_comercial: '', razon_social: '', nit: '', nrc: '', telefono: '', email_facturacion: '',
    descripcion: '', sitio_web: '', instagram_url: '', tiktok_url: '',
    pais: '', departamento: '', direccion: '', rubro: '',
    representante_nombre: '', representante_tipo_identificacion: 'DUI', representante_numero_identificacion: '',
  }
}
const form = ref(emptyForm())

function fillForm(e: EmpresaProfile) {
  const ub = parseUbicacion(e.pais)
  form.value = {
    nombre_comercial:  e.nombre_comercial,
    razon_social:      e.razon_social ?? '',
    nit:               e.nit ?? '',
    nrc:               e.nrc ?? '',
    telefono:          e.telefono ?? '',
    email_facturacion: e.email_facturacion ?? '',
    descripcion:       e.descripcion ?? '',
    sitio_web:         e.sitio_web ?? '',
    instagram_url:     e.instagram_url ?? '',
    tiktok_url:        e.tiktok_url ?? '',
    pais:              ub.pais,
    departamento:      ub.departamento,
    direccion:         e.direccion ?? '',
    rubro:             e.rubro ?? '',
    representante_nombre:                e.representante_nombre ?? '',
    representante_tipo_identificacion:   e.representante_tipo_identificacion ?? 'DUI',
    representante_numero_identificacion: e.representante_numero_identificacion ?? '',
  }
}

// ─── Validación (mismo patrón que el perfil de influencer) ────────────────────
const urlValida = helpers.withMessage('URL inválida — debe empezar con https://', url)

const profileRules = computed(() => ({
  nombre_comercial: { required: helpers.withMessage('El nombre comercial es obligatorio', required) },
  rubro:            { required: helpers.withMessage('Elige el rubro de tu marca', required) },
  pais:             { required: helpers.withMessage('El país es obligatorio', required) },
  telefono: {
    required: helpers.withMessage('El teléfono de contacto es obligatorio', required),
    formato:  helpers.withMessage('Teléfono inválido — ej. +503 7000-0000', helpers.regex(/^\+?[\d\s-]{8,20}$/)),
  },
  email_facturacion: { email: helpers.withMessage('Correo de facturación inválido', email) },
  nit: { formato: helpers.withMessage('NIT inválido — formato: 0000-000000-000-0', helpers.regex(/^(\d{4}-?\d{6}-?\d{3}-?\d|\d{8}-?\d)$/)) },
  nrc: { formato: helpers.withMessage('NRC inválido — formato: 000000-0', helpers.regex(/^\d{1,7}-?\d$/)) },
  sitio_web:     { urlValida },
  instagram_url: { urlValida },
  tiktok_url:    { urlValida },
  representante_nombre: { required: helpers.withMessage('El nombre del representante legal es obligatorio', required) },
  representante_numero_identificacion: {
    required: helpers.withMessage('El número de documento es obligatorio', required),
    ...(form.value.representante_tipo_identificacion === 'DUI'
      ? { dui: helpers.withMessage('DUI inválido — formato: 00000000-0', helpers.regex(/^\d{8}-\d$/)) }
      : {}),
  },
}))

const pv$ = useVuelidate(profileRules, form)

function startEdit() {
  if (p.value) fillForm(p.value)
  profileError.value = ''
  pv$.value.$reset()
  editing.value = true
}

function apiError(err: any): string {
  const msg = err?.response?.data?.message
  return Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Ocurrió un error. Intenta de nuevo.')
}

async function saveProfile() {
  if (store.saving) return
  if (!(await pv$.value.$validate())) return
  profileError.value = ''
  const { departamento, pais, ...rest } = form.value
  try {
    await store.updateEmpresaProfile({ ...rest, pais: pais ? formatUbicacion(pais, departamento) : '' })
    editing.value = false
    toast.add({ severity: 'success', summary: 'Perfil actualizado', life: 3000 })
  } catch (err) {
    profileError.value = apiError(err)
  }
}

onMounted(loadProfile)

</script>

<template>
  <AppLayout>
    <Toast position="top-right" />

    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-display font-bold text-navy">Mi perfil</h1>
          <p class="text-sm mt-1 text-navy-lighter">Presenta tu marca y mantén actualizados tus datos de contacto y facturación.</p>
        </div>
        <RouterLink v-if="p" :to="viewPath(`/empresas/${p.id}`)"
          class="btn-secondary inline-flex items-center gap-2">
          <i class="pi pi-eye mr-1" />Ver mi perfil público
        </RouterLink>
      </div>

      <div v-if="loadError" class="card text-coral-text flex flex-wrap items-center justify-between gap-3" role="alert"><p>{{ loadError }}</p><button type="button" class="btn-secondary" @click="loadProfile">Reintentar</button></div>
      <ProfileOverview :name="loadError || store.loading ? '' : p?.nombre_comercial ?? ''" label="Empresa / marca"
        :subtitle="p?.rubro ? rubroLabel(p.rubro) : 'Completa tu identidad de marca'" :verified="p?.is_verified" :disabled="editing || store.loading || !!loadError" @updated="toast.add({ severity: 'success', summary: 'Logo actualizado', life: 3000 }); loadProfile()">
        <div><p class="text-xs text-ink-muted">Estado de marca</p><p class="text-sm font-semibold mt-1" :class="p?.is_verified ? 'text-success' : 'text-ink-muted'">{{ p?.is_verified ? 'Verificada' : 'Por completar' }}</p></div>
      </ProfileOverview>
      <div v-if="!loadError" class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] items-start">
        <aside class="space-y-4 xl:sticky xl:top-6">
          <ProfileProgress :items="checklist" :loading="store.loading" />
          <nav class="card space-y-1" aria-label="Secciones de mi perfil">
            <p class="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-3">En esta página</p>
            <a v-for="section in [{ id: 'marca', label: 'Identidad de marca' }, { id: 'presencia', label: 'Presencia online' }, { id: 'facturacion', label: 'Contacto y facturación' }, { id: 'representante', label: 'Representante legal' }]" :key="section.id" :href="`#company-${section.id}`" class="block rounded-lg px-3 py-2 text-sm text-navy hover:bg-slate focus-visible:outline-2 focus-visible:outline-violet">{{ section.label }}</a>
          </nav>
          <p class="text-xs text-ink-muted px-2 leading-relaxed"><i class="pi pi-lock mr-1" aria-hidden="true" />Los datos de facturación y del representante son privados. Tu marca y presencia online forman tu perfil público.</p>
        </aside>
        <div class="space-y-6 min-w-0">
      <!-- ── Información de la empresa ───────────────────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-4">
            <div>
              <h2 class="font-display font-semibold text-navy text-lg flex items-center gap-2">
                <i class="pi pi-building" aria-hidden="true" />
                Información de la empresa
                <VerifiedBadge v-if="p?.is_verified" size="sm" />
              </h2>
              <p class="text-xs text-ink-muted">Separa tu información pública de los datos privados de tu cuenta.</p>
            </div>
          </div>
          <Button v-if="!editing" :disabled="store.loading || !!loadError" @click="startEdit"
            label="Editar información" icon="pi pi-pencil" severity="secondary" size="small" outlined />
        </div>

        <div v-if="store.loading" class="py-6 text-center text-ink-muted text-sm">
          <i class="pi pi-spin pi-spinner mr-2" />Cargando…
        </div>

        <!-- Vista de datos -->
        <div v-else-if="!editing && p" class="space-y-6 text-sm">
          <!-- Marca -->
          <section id="company-marca" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Marca</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="label">Nombre comercial</dt>
                <dd class="font-semibold text-navy">{{ p.nombre_comercial }}</dd>
              </div>
              <div>
                <dt class="label">Rubro</dt>
                <dd class="text-navy">{{ p.rubro ? rubroLabel(p.rubro) : '—' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="label">Descripción</dt>
                <dd v-if="p.descripcion" class="text-navy whitespace-pre-line">{{ p.descripcion }}</dd>
                <dd v-else class="text-ink-muted italic">Cuéntale a los influencers quién es tu marca</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="label">Ubicación</dt>
                <dd class="text-navy">{{ ubicacionTexto || '—' }}</dd>
              </div>
            </dl>
          </section>

          <!-- Presencia online -->
          <section id="company-presencia" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Presencia online</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div v-for="link in [
                { label: 'Sitio web', url: p.sitio_web },
                { label: 'Instagram', url: p.instagram_url },
                { label: 'TikTok', url: p.tiktok_url },
              ]" :key="link.label" class="min-w-0">
                <dt class="label">{{ link.label }}</dt>
                <dd>
                  <a v-if="link.url" :href="link.url" target="_blank" rel="noopener"
                    class="text-violet underline hover:text-violet/80 break-all">{{ link.url }}</a>
                  <span v-else class="text-ink-muted italic">No configurado</span>
                </dd>
              </div>
            </dl>
          </section>

          <!-- Contacto y facturación -->
          <section id="company-facturacion" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Contacto y facturación <span class="font-normal text-ink-muted">— privado, no visible para influencers</span></h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="label">Teléfono / WhatsApp</dt>
                <dd class="text-navy">{{ p.telefono || '—' }}</dd>
              </div>
              <div>
                <dt class="label">Correo de facturación</dt>
                <dd class="text-navy break-all">{{ p.email_facturacion || authStore.user?.email }}</dd>
              </div>
              <div>
                <dt class="label">Razón social</dt>
                <dd class="text-navy">{{ p.razon_social || '—' }}</dd>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="label">NIT</dt>
                  <dd class="text-navy">{{ p.nit || '—' }}</dd>
                </div>
                <div>
                  <dt class="label">NRC</dt>
                  <dd class="text-navy">{{ p.nrc || '—' }}</dd>
                </div>
              </div>
            </dl>
          </section>

          <!-- Representante legal -->
          <section id="company-representante" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Representante legal</h3>
            <template v-if="p.representante_nombre">
              <p class="font-semibold text-navy">{{ p.representante_nombre }}</p>
              <p class="text-ink-muted mt-0.5">
                {{ p.representante_tipo_identificacion }}: {{ p.representante_numero_identificacion }}
              </p>
            </template>
            <p v-else class="text-warning text-xs font-medium">Agrega el nombre del representante legal para firmar contratos.</p>
          </section>

          <!-- Créditos -->
          <section class="border-t border-border pt-4">
            <h3 class="section-title">Saldo</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="label">Saldo disponible</dt>
                <dd class="font-bold text-2xl"
                  :class="Number(p.balance_creditos) > Number(p.umbral_creditos) ? 'text-violet' : 'text-coral-text'">
                  ${{ Number(p.balance_creditos).toFixed(2) }}
                  <span class="text-sm font-normal text-ink-muted"> USD</span>
                </dd>
              </div>
              <div>
                <dt class="label">Saldo mínimo para chatear</dt>
                <dd class="font-semibold text-navy">${{ Number(p.umbral_creditos).toFixed(2) }} USD</dd>
                <dd class="text-xs text-ink-muted mt-0.5">Definido por la plataforma. Por debajo de este monto tus chats pasan a solo lectura.</dd>
              </div>
            </dl>
          </section>
        </div>

        <!-- Formulario de edición -->
        <form v-else-if="editing" @submit.prevent="saveProfile" novalidate class="space-y-6">
          <section id="company-marca" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Marca</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label" for="company-nombre-comercial">Nombre comercial</label>
                <input id="company-nombre-comercial" v-model="form.nombre_comercial" required maxlength="255"
                  :class="['input', { '!border-coral': pv$.nombre_comercial.$error }]" />
                <p v-if="pv$.nombre_comercial.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.nombre_comercial.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field">
                <label class="label" for="company-rubro">Rubro / industria</label>
                <select id="company-rubro" v-model="form.rubro" required
                  :class="['input', { '!border-coral': pv$.rubro.$error }]">
                  <option value="">— Selecciona —</option>
                  <option v-for="r in RUBROS" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
                <p v-if="pv$.rubro.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.rubro.$errors[0]?.$message }}
                </p>
              </div>
            </div>
            <div class="field">
              <label class="label" for="company-descripcion">Descripción de la marca <span class="text-ink-muted font-normal text-xs">— visible en tu perfil público</span></label>
              <textarea id="company-descripcion" v-model="form.descripcion" class="input" rows="3" maxlength="1000"
                placeholder="Qué vende tu marca, a quién le habla y qué tipo de colaboraciones buscas…" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="field">
                <label class="label" for="company-pais">País</label>
                <select id="company-pais" v-model="form.pais" required @change="form.departamento = ''"
                  :class="['input', { '!border-coral': pv$.pais.$error }]">
                  <option value="">— Selecciona —</option>
                  <option v-for="pa in PAISES" :key="pa" :value="pa">{{ pa }}</option>
                </select>
                <p v-if="pv$.pais.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.pais.$errors[0]?.$message }}
                </p>
              </div>
              <div v-if="form.pais === 'El Salvador'" class="field">
                <label class="label" for="company-departamento">Departamento</label>
                <select id="company-departamento" v-model="form.departamento" class="input">
                  <option value="">— Selecciona —</option>
                  <option v-for="d in DEPARTAMENTOS_SV" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="field" :class="form.pais === 'El Salvador' ? '' : 'sm:col-span-2'">
                <label class="label" for="company-direccion">Dirección</label>
                <input id="company-direccion" v-model="form.direccion" class="input" maxlength="255" placeholder="Colonia, calle, municipio…" />
              </div>
            </div>
          </section>

          <section id="company-presencia" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Presencia online</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div v-for="f in ([
                { key: 'sitio_web',     label: 'Sitio web', placeholder: 'https://…' },
                { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/tumarca' },
                { key: 'tiktok_url',    label: 'TikTok',    placeholder: 'https://tiktok.com/@tumarca' },
              ] as const)" :key="f.key" class="field">
                <label class="label">{{ f.label }}</label>
                <input v-model="form[f.key]" type="url" :placeholder="f.placeholder"
                  :class="['input', { '!border-coral': pv$[f.key].$error }]" />
                <p v-if="pv$[f.key].$error" class="text-coral-text text-xs mt-1">
                  {{ pv$[f.key].$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <section id="company-facturacion" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Contacto y facturación</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label" for="company-telefono">Teléfono / WhatsApp</label>
                <input id="company-telefono" v-model="form.telefono" type="tel" required placeholder="+503 7000-0000"
                  :class="['input', { '!border-coral': pv$.telefono.$error }]" />
                <p v-if="pv$.telefono.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.telefono.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field">
                <label class="label" for="company-email-facturacion">Correo de facturación <span class="text-ink-muted font-normal text-xs">— si es distinto a tu correo de acceso</span></label>
                <input id="company-email-facturacion" v-model="form.email_facturacion" type="email" placeholder="facturacion@tumarca.com"
                  :class="['input', { '!border-coral': pv$.email_facturacion.$error }]" />
                <p v-if="pv$.email_facturacion.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.email_facturacion.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field sm:col-span-2">
                <label class="label" for="company-razon-social">Razón social</label>
                <input id="company-razon-social" v-model="form.razon_social" class="input" maxlength="255" placeholder="Nombre legal, ej. Mi Marca S.A. de C.V." />
              </div>
              <div class="field">
                <label class="label" for="company-nit">NIT</label>
                <input id="company-nit" v-model="form.nit" placeholder="0614-010190-101-1"
                  :class="['input', { '!border-coral': pv$.nit.$error }]" />
                <p v-if="pv$.nit.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.nit.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field">
                <label class="label" for="company-nrc">NRC <span class="text-ink-muted font-normal text-xs">— para crédito fiscal</span></label>
                <input id="company-nrc" v-model="form.nrc" placeholder="123456-7"
                  :class="['input', { '!border-coral': pv$.nrc.$error }]" />
                <p v-if="pv$.nrc.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.nrc.$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <section id="company-representante" class="scroll-mt-6 rounded-xl border border-border p-4 sm:p-5">
            <h3 class="section-title">Representante legal</h3>
            <div class="field">
              <label class="label" for="company-representante-nombre">Nombre completo del representante</label>
              <input id="company-representante-nombre" v-model="form.representante_nombre" required placeholder="Nombre Apellido"
                :class="['input', { '!border-coral': pv$.representante_nombre.$error }]" />
              <p v-if="pv$.representante_nombre.$error" class="text-coral-text text-xs mt-1">
                {{ pv$.representante_nombre.$errors[0]?.$message }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="field">
                <label class="label" for="company-representante-tipo-identificacion">Tipo de identificación</label>
                <select id="company-representante-tipo-identificacion" v-model="form.representante_tipo_identificacion" class="input"
                  @change="pv$.representante_numero_identificacion.$reset()">
                  <option v-for="t in TIPOS_ID" :key="t">{{ t }}</option>
                </select>
              </div>
              <div class="field">
                <label class="label" for="company-representante-numero-identificacion">Número de identificación</label>
                <input id="company-representante-numero-identificacion" v-model="form.representante_numero_identificacion" required
                  :placeholder="form.representante_tipo_identificacion === 'DUI' ? '00000000-0' : 'A00000000'"
                  :class="['input', { '!border-coral': pv$.representante_numero_identificacion.$error }]" />
                <p v-if="pv$.representante_numero_identificacion.$error" class="text-coral-text text-xs mt-1">
                  {{ pv$.representante_numero_identificacion.$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <p v-if="pv$.$error" class="text-coral-text text-sm">Revisa los campos marcados en rojo.</p>
          <p v-else-if="profileError" class="text-coral-text text-sm">{{ profileError }}</p>
          <div class="sticky bottom-0 z-10 bg-white border-t border-border py-4 flex flex-wrap justify-end gap-2">
            <Button type="submit" :loading="store.saving" label="Guardar cambios" icon="pi pi-check" size="small" />
            <Button type="button" :disabled="store.saving" @click="editing = false" label="Cancelar" icon="pi pi-times" severity="secondary" outlined size="small" />
          </div>
        </form>
      </div>

      <RouterLink :to="viewPath('/briefs')" class="card flex items-center justify-between gap-3 hover:border-violet">
        <span><span class="font-semibold text-navy">Briefs de campaña</span><span class="block text-sm text-ink-muted mt-1">Crea y gestiona los briefs de tu marca.</span></span>
        <i class="pi pi-arrow-right text-violet" aria-hidden="true" />
      </RouterLink>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

