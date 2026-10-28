<script setup lang="ts">
import RequiredMark from '@/components/RequiredMark.vue'
import { influencerNeedsProfileGuide, influencerProfileGuideSteps } from '@/utils/profile-completion'
import { useProfileTour } from '@/composables/useProfileTour'
import { calculateAge as calcAge } from '@/utils/date'
import { ref, computed, onMounted } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import { PAISES, DEPARTAMENTOS_SV, parseUbicacion, formatUbicacion } from '@/constants/ubicaciones'
import { RUBROS_INFLUENCER as RUBROS_LIST } from '@/constants/rubros'
import AppLayout from '@/components/AppLayout.vue'
import ProfileOverview from '@/components/ProfileOverview.vue'
import ProfileProgress from '@/components/ProfileProgress.vue'
import { viewPath } from '@/router/paths'
import { formatUsd } from '@/utils/money'
import StarRating from '@/components/StarRating.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
import { formatDate } from '@/utils/date'
import { useProfileStore } from '@/stores/profile'
import { ratingsApi, type RatingSummary } from '@/api/ratings'

const store = useProfileStore()
const editing        = ref(false)
const showMetricForm = ref(false)
const deletingId     = ref<number | null>(null)
const verifyingId    = ref<number | null>(null)
const bankEditing    = ref(false)
const bankSaving     = ref(false)
const savingMetric   = ref(false)
const metricError    = ref('')
const loadError = ref('')
let automaticGuideShown = false
const statusMessage = ref('')
const bankError = ref('')
const showBankNumber = ref(false)

const REDES      = ['TikTok', 'Instagram', 'YouTube', 'Facebook']
const TIPOS_ID   = ['DUI', 'PASAPORTE']
const TIPOS_CUENTA = ['AHORROS', 'CORRIENTE']

const PLATFORM_COLOR: Record<string, string> = {
  TikTok: '#010101', Instagram: '#E1306C', YouTube: '#FF0000', Facebook: '#1877F2',
}

const REDES_ICON: Record<string, string> = {
  TikTok: 'pi-tiktok', Instagram: 'pi-instagram', YouTube: 'pi-youtube', Facebook: 'pi-facebook',
}

const form = ref({
  username: '', nombre_artistico: '', bio: '', pais: '', departamento: '',
  tarifa_base: 0, disponibilidad: true,
  tipo_identificacion: 'DUI', numero_identificacion: '', rubros: [] as string[],
})
const saveError  = ref('')

const formRules = {
  username: {
    required: helpers.withMessage('El username es obligatorio', required),
    formato:  helpers.withMessage('Solo letras, números y guiones bajos (3–30 caracteres)', helpers.regex(/^[a-zA-Z0-9_]{3,30}$/)),
  },
  nombre_artistico:      { required: helpers.withMessage('El nombre artístico es obligatorio', required) },
  numero_identificacion: { required: helpers.withMessage('El número de documento es obligatorio', required) },
  pais:                  { required: helpers.withMessage('El país es obligatorio', required) },
  rubros:                { required: helpers.withMessage('Elige al menos un rubro', required) },
}
const v$ = useVuelidate(formRules, form)

// El rubro principal es siempre el primero de la lista (define la portada)
const rubroPrincipal = computed({
  get: () => form.value.rubros[0] ?? '',
  set: (value: string) => {
    form.value.rubros = [value, ...form.value.rubros.filter(r => r !== value)]
  },
})

const metricForm = ref({ red_social: 'TikTok', username: '' })
const bankForm   = ref({ banco_nombre: '', banco_cuenta_numero: '', banco_cuenta_tipo: 'AHORROS' })

const esData         = computed(() => store.influencerProfile)
const needsGuide = computed(() => influencerNeedsProfileGuide(esData.value ? { ...esData.value, metrics: store.metrics } : null))
const totalFollowers = computed(() => store.metrics.reduce((sum, m) => sum + m.seguidores, 0))
const ownSummary     = ref<RatingSummary | null>(null)


const verificationChecklist = computed(() => {
  const p = esData.value
  if (!p) return null
  return [
    { label: 'Documento de identidad (DUI o Pasaporte)', ok: !!(p.tipo_identificacion && p.numero_identificacion) },
    { label: 'Mínimo una red social verificada', ok: p.metrics?.some(m => m.is_verified) ?? false },
    { label: 'Foto de perfil', ok: !!(p as any).user?.avatar_url },
    { label: 'Correo electrónico verificado', ok: !!(p as any).user?.is_email_verified },
    { label: 'Edad mínima de 16 años', ok: !!p.fecha_nacimiento && calcAge(p.fecha_nacimiento) >= 16 },
  ]
})

async function onAvatarUpdated() {
  statusMessage.value = 'Imagen actualizada correctamente.'
  // Refresh verification without replacing unsaved profile/bank forms.
  try { await store.loadInfluencerProfile() }
  catch { statusMessage.value += ' No se pudo actualizar el resumen del perfil; vuelve a cargarlo cuando termines de editar.' }
}

async function loadProfile() {
  loadError.value = ''
  try {
  await store.loadInfluencerProfile()
  if (esData.value) {
    form.value = {
      username:              esData.value.username ?? '',
      nombre_artistico:      esData.value.nombre_artistico,
      bio:                   esData.value.bio ?? '',
      ...parseUbicacion(esData.value.ubicacion),
      tarifa_base:           Number(esData.value.tarifa_base),
      disponibilidad:        esData.value.disponibilidad,
      tipo_identificacion:   esData.value.tipo_identificacion ?? 'DUI',
      numero_identificacion: esData.value.numero_identificacion ?? '',
      rubros:                esData.value.rubros ?? [],
    }
    bankForm.value = {
      banco_nombre:        esData.value.banco_nombre ?? '',
      banco_cuenta_numero: esData.value.banco_cuenta_numero ?? '',
      banco_cuenta_tipo:   esData.value.banco_cuenta_tipo ?? 'AHORROS',
    }
    if (!automaticGuideShown && needsGuide.value && !guideActive.value) {
      automaticGuideShown = true
      await startProfileGuide()
    }
    ownSummary.value = await ratingsApi.getSummary(esData.value.id).catch(() => null)
  }
  } catch { loadError.value = 'No se pudo cargar el perfil. Intenta nuevamente.' }
}
onMounted(loadProfile)

function startEdit() {
  if (!esData.value) return
  const p = esData.value
  form.value = { username: p.username ?? '', nombre_artistico: p.nombre_artistico, bio: p.bio ?? '',
    ...parseUbicacion(p.ubicacion), tarifa_base: Number(p.tarifa_base), disponibilidad: p.disponibilidad,
    tipo_identificacion: p.tipo_identificacion ?? 'DUI', numero_identificacion: p.numero_identificacion ?? '', rubros: [...(p.rubros ?? [])] }
  saveError.value = ''
  v$.value.$reset()
  editing.value = true
}
function startBankEdit() {
  const p = esData.value
  bankForm.value = { banco_nombre: p?.banco_nombre ?? '', banco_cuenta_numero: p?.banco_cuenta_numero ?? '', banco_cuenta_tipo: p?.banco_cuenta_tipo ?? 'AHORROS' }
  bankError.value = ''
  bankEditing.value = true
}

async function saveProfile() {
  if (store.saving) return
  if (!(await v$.value.$validate())) return
  saveError.value = ''
  try {
    const { pais, departamento, ...rest } = form.value
    await store.updateInfluencerProfile({ ...rest, ubicacion: formatUbicacion(pais, departamento) })
    editing.value = false
    statusMessage.value = 'Tu perfil se actualizó correctamente.'
  } catch (e: any) {
    const msg = e.response?.data?.message
    saveError.value = Array.isArray(msg) ? msg.join(' ') : (msg ?? 'No se pudieron guardar los cambios.')
  }
}

async function addMetric() {
  if (!metricForm.value.username) return
  savingMetric.value = true; metricError.value = ''
  try {
    await store.addMetric({ ...metricForm.value })
    metricForm.value = { red_social: 'TikTok', username: '' }
    showMetricForm.value = false
  } catch (e: any) {
    metricError.value = e.response?.data?.message ?? 'No se pudo verificar la cuenta.'
  } finally { savingMetric.value = false }
}

async function verifyMetric(id: number) {
  metricError.value = ''
  verifyingId.value = id
  try { await store.verifyMetric(id) } catch { metricError.value = 'No se pudo verificar la red social. Intenta nuevamente.' } finally { verifyingId.value = null }
}

async function deleteMetric(id: number) {
  metricError.value = ''
  deletingId.value = id
  try { await store.removeMetric(id) } catch { metricError.value = 'No se pudo eliminar la red social.' } finally { deletingId.value = null }
}

async function saveBank() {
  if (bankSaving.value) return
  bankSaving.value = true
  bankError.value = ''
  try {
    await store.updateInfluencerProfile(bankForm.value)
    bankEditing.value = false
    statusMessage.value = 'Cuenta bancaria actualizada correctamente.'
  } catch { bankError.value = 'No se pudo guardar la cuenta bancaria. Tus cambios siguen en el formulario.' }
  finally { bankSaving.value = false }
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const { start: startProfileGuide, active: guideActive, error: guideError } = useProfileTour(() => {
  if (!editing.value) startEdit()
  if (influencerProfileGuideSteps(esData.value).some(step => step.selector.startsWith('#creator-banco-')) && !bankEditing.value) startBankEdit()
}, () => influencerProfileGuideSteps(esData.value ? { ...esData.value, metrics: store.metrics } : null), () => needsGuide.value)
</script>

<template>
  <AppLayout>
    <div class="space-y-5 pb-8">

      <header class="flex flex-wrap items-center justify-between gap-4">
        <div><h1 class="page-title font-display font-bold text-navy">Mi perfil</h1><p class="text-sm text-ink-muted mt-2">Presenta tu talento, verifica tus redes y prepara tu cuenta para recibir pagos.</p></div>
        <div class="flex flex-wrap gap-2">
          <RouterLink v-if="esData && !loadError" :to="viewPath(`/influencers/${esData.id}`)" class="btn-secondary inline-flex items-center gap-2"><i class="pi pi-eye" aria-hidden="true" />Ver perfil público</RouterLink>
          <button v-if="!editing" type="button" @click="startEdit" :disabled="store.loading || !!loadError" class="btn-primary inline-flex items-center gap-2"><i class="pi pi-pencil" aria-hidden="true" />Editar perfil</button>
        </div>
      </header>
      <p v-if="statusMessage" role="status" class="rounded-xl border border-green-200 bg-success-tint px-5 py-3 text-sm text-success">{{ statusMessage }}</p>
      <div v-if="loadError" role="alert" class="card flex flex-wrap items-center justify-between gap-3"><p class="text-coral-text">{{ loadError }}</p><button type="button" class="btn-secondary" @click="loadProfile">Reintentar</button></div>
      <ProfileOverview avatar-id="creator-avatar" :name="loadError || store.loading ? '' : esData?.nombre_artistico ?? ''" label="Creador / influencer"
        :subtitle="esData?.username ? `@${esData.username}` : 'Tu identidad profesional'" :verified="esData?.is_verified" :disabled="store.loading || !!loadError" @updated="onAvatarUpdated">
        <div v-if="esData && !loadError"><p class="text-xs text-ink-muted">Tarifa por campaña</p><p class="font-semibold text-lg text-navy mt-1">{{ formatUsd(esData.tarifa_base) }} <span class="text-xs font-normal text-ink-muted">USD</span></p></div>
        <div v-if="!loadError"><p class="text-xs text-ink-muted">Comunidad total</p><p class="font-semibold text-lg text-navy mt-1">{{ formatFollowers(totalFollowers) }} <span class="text-xs font-normal text-ink-muted">seguidores</span></p></div>
      </ProfileOverview>
      <p class="text-xs text-ink-muted"><span class="text-coral-text font-semibold">*</span> Campo obligatorio al guardar el formulario.</p>
      <div v-if="!loadError" class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] items-start">
        <aside class="space-y-4 xl:sticky xl:top-6">
          <ProfileProgress id="creator-progress" :items="verificationChecklist ?? []" :loading="store.loading" />
          <section v-if="!store.loading && needsGuide" class="rounded-xl border border-violet/20 bg-violet-tint p-4 space-y-3">
            <h2 class="text-sm font-semibold text-navy inline-flex items-center gap-2"><i class="pi pi-compass text-violet" aria-hidden="true" />¿Necesitas orientación?</h2>
            <p class="text-xs text-ink-muted leading-relaxed">Recorre los campos importantes con una guía paso a paso. Puedes salir con Escape y repetirla cuando quieras.</p>
            <button type="button" @click="startProfileGuide" :disabled="store.loading || store.saving || bankSaving || bankEditing || showMetricForm || !!loadError || guideActive" class="btn-secondary w-full text-sm">{{ guideActive ? 'Guía en curso…' : 'Completar perfil con guía' }}</button>
            <p v-if="guideError" role="alert" class="text-xs text-coral-text">{{ guideError }}</p>
          </section>
          <nav class="card space-y-1" aria-label="Secciones de mi perfil">
            <p class="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-3">En esta página</p>
            <a href="#creator-information" class="block rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-navy transition-colors duration-150 ui-hover focus-visible:border-violet focus-visible:bg-violet-tint focus-visible:text-violet-dark focus-visible:outline-2 focus-visible:outline-violet focus-visible:outline-offset-2 motion-reduce:transition-none">Información personal</a>
            <a href="#creator-social" class="block rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-navy transition-colors duration-150 ui-hover focus-visible:border-violet focus-visible:bg-violet-tint focus-visible:text-violet-dark focus-visible:outline-2 focus-visible:outline-violet focus-visible:outline-offset-2 motion-reduce:transition-none">Redes sociales</a>
            <a href="#creator-bank" class="block rounded-lg border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-navy transition-colors duration-150 ui-hover focus-visible:border-violet focus-visible:bg-violet-tint focus-visible:text-violet-dark focus-visible:outline-2 focus-visible:outline-violet focus-visible:outline-offset-2 motion-reduce:transition-none">Cuenta bancaria</a>
          </nav>
          <p class="text-xs text-ink-muted px-2 leading-relaxed"><i class="pi pi-lock mr-1" aria-hidden="true" />Tu documento, datos del tutor y cuenta bancaria son privados. Revisa cómo se ve tu perfil público antes de compartirlo.</p>
        </aside>
        <div class="space-y-6 min-w-0">
        <div id="creator-information" class="scroll-mt-6">
      <!-- ── Loading ────────────────────────────────────────────────────────── -->
      <div v-if="store.loading" class="card py-8 text-center text-ink-muted text-sm">
        <span class="animate-pulse">Cargando perfil…</span>
      </div>

      <!-- ── Profile Info — vista ───────────────────────────────────────────── -->
      <div v-else-if="!editing && esData" class="card">

        <h2 class="font-display font-semibold text-lg text-navy mb-3">Información pública</h2>
        <p class="text-xs text-ink-muted mb-4">Las marcas ven esta presentación, tus rubros y tu disponibilidad.</p>
        <!-- Bio -->
        <p v-if="esData.bio" class="text-sm text-ink-muted leading-relaxed mb-4">{{ esData.bio }}</p>

        <!-- Status + tags -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          <span :class="esData.disponibilidad ? 'badge-active' : 'badge-muted'" class="inline-flex items-center gap-1.5">
            <i :class="['pi', esData.disponibilidad ? 'pi-check-circle' : 'pi-lock']" aria-hidden="true" />
            {{ esData.disponibilidad ? 'Disponible' : 'No disponible' }}
          </span>
          <span v-for="(r, i) in (esData.rubros ?? [])" :key="r" class="badge-info capitalize inline-flex items-center gap-1.5"
            :title="i === 0 ? 'Rubro principal' : undefined"><i :class="['pi', i === 0 ? 'pi-star' : 'pi-tag']" aria-hidden="true" /> {{ RUBROS_LIST.find(x => x.value === r)?.label ?? r }}</span>
          <span v-if="esData.fecha_nacimiento" class="badge-muted inline-flex items-center gap-1.5"><i class="pi pi-calendar" aria-hidden="true" /> {{ esData.fecha_nacimiento }}</span>
          <span v-if="store.metrics.length > 0" class="badge-muted inline-flex items-center gap-1.5">
            <i class="pi pi-users" aria-hidden="true" /> {{ formatFollowers(totalFollowers) }} seguidores
          </span>
        </div>

        <!-- Rating summary (readonly) -->
        <div v-if="ownSummary" class="flex items-center gap-2 mb-4">
          <StarRating :model-value="Math.round(ownSummary.promedio ?? 0)" readonly size="sm" />
          <template v-if="ownSummary.total > 0">
            <span class="font-bold text-navy text-sm">{{ ownSummary.promedio }}</span>
            <span class="text-ink-muted text-xs">({{ ownSummary.total }} reseña{{ ownSummary.total !== 1 ? 's' : '' }})</span>
          </template>
        </div>

        <!-- Identification + tutor -->
        <div class="border-t border-border pt-3 space-y-3">
          <div v-if="esData.numero_identificacion">
            <span class="badge-muted text-xs inline-flex items-center gap-1.5"><i class="pi pi-id-card" aria-hidden="true" /> {{ esData.tipo_identificacion }}: {{ esData.numero_identificacion }}</span>
          </div>
          <p v-else class="text-xs text-coral-text font-medium inline-flex items-center gap-1.5"><i class="pi pi-exclamation-triangle" aria-hidden="true" /> Número de identificación no registrado</p>

          <div v-if="esData.tutor_nombre"
            class="bg-coral/5 border border-coral/20 rounded-xl p-3 text-sm flex items-start gap-3">
            <i class="pi pi-users text-lg mt-0.5 text-coral-text" aria-hidden="true" />
            <div>
              <p class="font-semibold text-coral-text text-xs uppercase tracking-wide mb-0.5">Representante legal</p>
              <p class="text-ink-muted text-sm">{{ esData.tutor_nombre }}</p>
              <p class="text-ink-muted text-xs">{{ esData.tutor_email }}</p>
              <span :class="esData.tutor_autorizacion ? 'badge-active' : 'badge-warning'" class="mt-1.5 inline-flex text-xs">
                {{ esData.tutor_autorizacion ? 'Autorizado' : 'Pendiente de autorización' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Edit Form ──────────────────────────────────────────────────────── -->
      <div v-else-if="editing" class="card">
        <h3 class="font-display font-semibold text-navy mb-5 text-base">Editar datos del perfil</h3>
        <form @submit.prevent="saveProfile" novalidate class="space-y-4">
          <section class="rounded-xl border border-border bg-slate/40 p-4 sm:p-5 space-y-4">
            <h4 class="font-semibold text-navy">1. Presentación y ubicación</h4>

          <div class="field">
            <label class="label" for="creator-username">Username<RequiredMark /></label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-medium select-none">@</span>
              <input id="creator-username" v-model="form.username" placeholder="mario_blue"
                :class="['input pl-7 w-full', { '!border-coral': v$.username.$error }]" aria-required="true" required />
            </div>
            <p v-if="v$.username.$error" class="text-coral-text text-xs mt-1">
              {{ v$.username.$errors[0]?.$message }}
            </p>
          </div>

          <div class="field">
            <label class="label" for="creator-nombre-artistico">Nombre artístico<RequiredMark /></label>
            <input id="creator-nombre-artistico" v-model="form.nombre_artistico"
              :class="['input', { '!border-coral': v$.nombre_artistico.$error }]" aria-required="true" required />
            <p v-if="v$.nombre_artistico.$error" class="text-coral-text text-xs mt-1">
              {{ v$.nombre_artistico.$errors[0]?.$message }}
            </p>
          </div>

          <div class="field">
            <label class="label" for="creator-bio">Bio</label>
            <textarea id="creator-bio" v-model="form.bio" class="input" rows="3"
              placeholder="Cuéntale a las marcas quién eres…" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="field">
              <label class="label" for="creator-pais">País<RequiredMark /></label>
              <select id="creator-pais" v-model="form.pais" @change="form.departamento = ''"
                :class="['input', { '!border-coral': v$.pais.$error }]" aria-required="true" required>
                <option value="">— Selecciona —</option>
                <option v-for="p in PAISES" :key="p">{{ p }}</option>
              </select>
              <p v-if="v$.pais.$error" class="text-coral-text text-xs mt-1">
                {{ v$.pais.$errors[0]?.$message }}
              </p>
            </div>
            <div v-if="form.pais === 'El Salvador'" class="field">
              <label class="label" for="creator-departamento">Departamento</label>
              <select id="creator-departamento" v-model="form.departamento" class="input">
                <option value="">— Selecciona —</option>
                <option v-for="d in DEPARTAMENTOS_SV" :key="d">{{ d }}</option>
              </select>
            </div>
          </div>

          </section>
          <section class="rounded-xl border border-border bg-slate/40 p-4 sm:p-5 space-y-4">
            <h4 class="font-semibold text-navy">2. Oferta y disponibilidad</h4>
          <div class="field">
            <label class="label" for="creator-tarifa-base">Tarifa base (USD)</label>
            <input id="creator-tarifa-base" v-model.number="form.tarifa_base" type="number" min="0" class="input" />
          </div>

          <div id="creator-rubros" class="field">
            <label class="label">Rubro / nicho <RequiredMark /><span class="text-ink-muted font-normal">(puedes elegir varios)</span></label>
            <div class="flex flex-wrap gap-2 mt-1">
              <button
                v-for="r in RUBROS_LIST" :key="r.value" :aria-pressed="form.rubros.includes(r.value)"
                type="button"
                @click="form.rubros.includes(r.value)
                  ? form.rubros.splice(form.rubros.indexOf(r.value), 1)
                  : form.rubros.push(r.value)"
                :class="form.rubros.includes(r.value)
                  ? 'bg-violet text-white border-violet'
                  : 'bg-white text-ink-muted border-navy/15 ui-hover'"
                class="px-3 py-1.5 rounded-full border text-xs font-medium transition-all select-none cursor-pointer">
                <i v-if="form.rubros[0] === r.value" class="pi pi-star text-[10px]" title="Rubro principal" aria-hidden="true" /> {{ r.label }}
              </button>
            </div>
            <div v-if="form.rubros.length > 1" class="flex items-center gap-2 mt-3">
              <label class="text-sm text-ink-muted shrink-0 inline-flex items-center gap-1.5"><i class="pi pi-star" aria-hidden="true" /> Rubro principal</label>
              <select v-model="rubroPrincipal" class="input py-1.5 text-sm">
                <option v-for="r in form.rubros" :key="r" :value="r">
                  {{ RUBROS_LIST.find(x => x.value === r)?.label ?? r }}
                </option>
              </select>
            </div>
            <p v-if="v$.rubros.$error" class="text-coral-text text-xs mt-1">
              {{ v$.rubros.$errors[0]?.$message }}
            </p>
          </div>

          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input v-model="form.disponibilidad" type="checkbox" class="rounded accent-violet" />
            <span class="text-sm font-medium text-ink-muted">Disponible para nuevas campañas</span>
          </label>

          </section>
          <section class="rounded-xl border border-border bg-slate/40 p-4 sm:p-5 space-y-4">
            <h4 class="font-semibold text-navy inline-flex items-center gap-2"><i class="pi pi-lock text-ink-muted" aria-hidden="true" />3. Identificación privada</h4>
            <p class="text-xs text-ink-muted">Estos datos se usan para verificar tu identidad y no forman parte de tu presentación pública.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="field">
              <label class="label" for="creator-tipo-identificacion">Tipo de identificación<RequiredMark /></label>
              <select id="creator-tipo-identificacion" v-model="form.tipo_identificacion" class="input" aria-required="true" required>
                <option v-for="t in TIPOS_ID" :key="t">{{ t }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="creator-numero-identificacion">Número de identificación<RequiredMark /></label>
              <input id="creator-numero-identificacion" v-model="form.numero_identificacion" placeholder="00000000-0"
                :class="['input', { '!border-coral': v$.numero_identificacion.$error }]" aria-required="true" required />
              <p v-if="v$.numero_identificacion.$error" class="text-coral-text text-xs mt-1">
                {{ v$.numero_identificacion.$errors[0]?.$message }}
              </p>
            </div>
          </div>

          </section>
          <p v-if="saveError" role="alert" class="text-coral-text text-sm">{{ saveError }}</p>

          <div class="sticky bottom-0 z-10 bg-white border-t border-border py-4 flex flex-wrap justify-end gap-2">
            <button id="creator-save" type="submit" :disabled="store.saving" class="btn-primary text-sm">
              {{ store.saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
            <button type="button" :disabled="store.saving" @click="editing = false" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </form>
      </div>

        </div>
      <!-- ── Redes sociales ─────────────────────────────────────────────────── -->
      <div id="creator-social" class="card scroll-mt-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="font-display font-semibold text-navy">Redes sociales</h2>
            <p class="text-xs text-ink-muted mt-0.5">
              <template v-if="store.metrics.length > 0">
                {{ formatFollowers(totalFollowers) }} seguidores en
                {{ store.metrics.length }} plataforma{{ store.metrics.length > 1 ? 's' : '' }}
              </template>
              <template v-else>Agrega tus redes para aparecer en búsquedas</template>
            </p>
          </div>
          <button id="creator-add-social" :disabled="store.loading || !esData" @click="showMetricForm = !showMetricForm" class="btn-primary text-sm inline-flex items-center gap-2">
            <i :class="showMetricForm ? 'pi pi-times' : 'pi pi-plus'" aria-hidden="true" /> {{ showMetricForm ? 'Cerrar' : 'Agregar red' }}
          </button>
        </div>

        <p v-if="metricError" role="alert" class="text-sm text-coral-text mb-3">{{ metricError }}</p>
        <!-- Formulario nueva métrica -->
        <div v-if="showMetricForm"
          class="border border-violet/20 rounded-xl p-4 mb-4 bg-violet/5 space-y-3">
          <p class="text-xs text-ink-muted">
            Los seguidores se obtienen automáticamente para Instagram, TikTok y Facebook.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="field">
              <label class="label" for="creator-red-social">Red social<RequiredMark /></label>
              <select id="creator-red-social" v-model="metricForm.red_social" class="input" aria-required="true" required>
                <option v-for="r in REDES" :key="r">{{ r }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="creator-social-username">Username (sin @)<RequiredMark /></label>
              <input id="creator-social-username" v-model="metricForm.username" class="input" placeholder="tuusuario"
                @keyup.enter="addMetric" aria-required="true" required />
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="addMetric" :disabled="savingMetric || !metricForm.username" class="btn-primary text-sm">
              {{ savingMetric ? 'Verificando…' : 'Agregar y verificar' }}
            </button>
            <button @click="showMetricForm = false; metricError = ''" class="btn-ghost text-sm">Cancelar</button>
          </div>
          <p v-if="metricError" class="text-coral-text text-sm">{{ metricError }}</p>
        </div>

        <!-- Empty state -->
        <div v-if="store.metrics.length === 0 && !showMetricForm"
          class="text-center py-10 text-ink-muted text-sm">
          <i class="pi pi-mobile text-3xl mb-2 block" aria-hidden="true" />
          <p class="font-medium text-ink-muted">Sin redes sociales vinculadas</p>
          <p class="text-xs mt-1">Agrega tus cuentas para que las marcas te encuentren</p>
        </div>

        <!-- Metric cards -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="m in store.metrics" :key="m.id"
            class="relative flex items-center gap-3 p-3.5 bg-white rounded-xl border border-border ui-hover-card transition-shadow overflow-hidden"
            :style="{ borderLeftWidth: '3px', borderLeftColor: PLATFORM_COLOR[m.red_social] ?? '#7C3AED' }">

            <!-- Platform icon -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              :style="{ background: (PLATFORM_COLOR[m.red_social] ?? '#7C3AED') + '18' }">
              <i :class="['pi', REDES_ICON[m.red_social] ?? 'pi-mobile']" aria-hidden="true" />
            </div>

            <div class="flex-1 min-w-0">
              <!-- Platform name + verified badge -->
              <div class="flex items-center gap-1.5 mb-0.5">
                <p class="font-bold text-navy text-sm">{{ m.red_social }}</p>
                <span v-if="m.is_verified"
                  class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet text-white text-xs font-bold"
                  title="Verificado">✓</span>
                <span v-else class="text-xs text-ink-muted bg-navy/5 px-1.5 py-0.5 rounded">sin verificar</span>
              </div>

              <p class="text-xs text-ink-muted mb-1.5">@{{ m.username }}</p>

              <!-- Stats row -->
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-navy">{{ formatFollowers(m.seguidores) }}</span>
                <span class="text-xs text-ink-muted">seguidores</span>
                <span v-if="m.engagement_rate > 0"
                  class="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-tint px-1.5 py-0.5 rounded-full">
                  <i class="pi pi-bolt text-[10px]" aria-hidden="true" /> {{ m.engagement_rate }}%
                </span>
              </div>

              <p v-if="m.verified_at" class="text-xs text-ink-muted mt-1">
                Verificado {{ formatDate(m.verified_at) }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex flex-col items-center gap-2 shrink-0 ml-1">
              <button @click="verifyMetric(m.id)" :disabled="verifyingId === m.id"
                class="text-ink-muted ui-hover disabled:opacity-30 transition-colors text-sm"
                title="Re-verificar">
                <i :class="['pi pi-refresh', { 'pi-spin': verifyingId === m.id }]" aria-hidden="true" />
              </button>
              <button @click="deleteMetric(m.id)" :disabled="deletingId === m.id"
                class="text-navy/20 ui-hover-danger disabled:opacity-30 transition-colors text-sm">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Cuenta bancaria ─────────────────────────────────────────────────── -->
      <div id="creator-bank" class="card scroll-mt-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="font-display font-semibold text-navy">Cuenta bancaria</h2>
            <p class="text-xs text-ink-muted mt-0.5">Para recibir pagos de contratos vía Wompi</p>
          </div>
          <button v-if="!bankEditing" :disabled="store.loading || !esData" @click="startBankEdit" class="btn-secondary text-sm inline-flex items-center gap-1.5"><i class="pi pi-pencil" aria-hidden="true" /> Editar</button>
        </div>

        <template v-if="!bankEditing">
          <div v-if="esData?.banco_nombre"
            class="flex flex-wrap items-center gap-3 bg-success-tint border border-green-200 rounded-xl p-4">
            <div class="w-10 h-10 bg-success-tint rounded-xl flex items-center justify-center text-xl shrink-0 text-success"><i class="pi pi-building-columns" aria-hidden="true" /></div>
            <div>
              <p class="font-bold text-success text-sm">{{ esData.banco_nombre }}</p>
              <p class="text-xs text-success mt-0.5">
                Cuenta {{ esData.banco_cuenta_tipo }} ·
                <span class="font-mono">{{ showBankNumber ? esData.banco_cuenta_numero : `•••• ${esData.banco_cuenta_numero?.slice(-4) ?? ''}` }}</span>
              </p>
            </div>
            <button type="button" class="btn-ghost inline-flex items-center justify-center h-9 w-9 shrink-0" :aria-label="showBankNumber ? 'Ocultar número de cuenta' : 'Mostrar número de cuenta'" :aria-pressed="showBankNumber" @click="showBankNumber = !showBankNumber"><i :class="showBankNumber ? 'pi pi-eye-slash' : 'pi pi-eye'" aria-hidden="true" /></button>
            <span class="ml-auto badge-active text-xs">Configurada</span>
          </div>
          <div v-else
            class="flex items-center gap-3 bg-coral/5 border border-coral/20 rounded-xl p-4 text-sm text-coral-text">
            <i class="pi pi-exclamation-triangle text-2xl" aria-hidden="true" />
            <div>
              <p class="font-semibold">Sin cuenta bancaria</p>
              <p class="text-xs text-coral-text mt-0.5">Agrégala para poder recibir pagos de campañas.</p>
            </div>
          </div>
        </template>

        <p v-if="bankError" role="alert" class="text-sm text-coral-text mb-3">{{ bankError }}</p>
        <form v-if="bankEditing" @submit.prevent="saveBank" class="space-y-3">
          <div class="field">
            <label class="label" for="creator-banco-nombre">Nombre del banco<RequiredMark /></label>
            <input id="creator-banco-nombre" v-model="bankForm.banco_nombre" class="input" placeholder="Ej. Banco Agrícola" required />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="field">
              <label class="label" for="creator-banco-cuenta-numero">Número de cuenta<RequiredMark /></label>
              <input id="creator-banco-cuenta-numero" v-model="bankForm.banco_cuenta_numero" class="input" placeholder="000000000" required />
            </div>
            <div class="field">
              <label class="label" for="creator-banco-cuenta-tipo">Tipo de cuenta<RequiredMark /></label>
              <select id="creator-banco-cuenta-tipo" v-model="bankForm.banco_cuenta_tipo" class="input" aria-required="true" required>
                <option v-for="t in TIPOS_CUENTA" :key="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="submit" :disabled="bankSaving" class="btn-primary text-sm">
              {{ bankSaving ? 'Guardando…' : 'Guardar cuenta' }}
            </button>
            <button type="button" :disabled="bankSaving" @click="bankEditing = false" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </form>
      </div>

        </div>
      </div>
    </div>
  </AppLayout>
</template>
