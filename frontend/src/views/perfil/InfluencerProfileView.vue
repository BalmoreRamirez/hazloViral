<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import { PAISES, DEPARTAMENTOS_SV, parseUbicacion, formatUbicacion } from '@/constants/ubicaciones'
import { RUBROS_INFLUENCER as RUBROS_LIST } from '@/constants/rubros'
import AppLayout from '@/components/AppLayout.vue'
import AvatarUpload from '@/components/AvatarUpload.vue'
import CoverBanner from '@/components/CoverBanner.vue'
import StarRating from '@/components/StarRating.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
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

const REDES      = ['TikTok', 'Instagram', 'YouTube', 'Facebook']
const TIPOS_ID   = ['DUI', 'PASAPORTE']
const TIPOS_CUENTA = ['AHORROS', 'CORRIENTE']

const PLATFORM_COLOR: Record<string, string> = {
  TikTok: '#010101', Instagram: '#E1306C', YouTube: '#FF0000', Facebook: '#1877F2',
}

const REDES_ICON: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Facebook: '👤',
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
const totalFollowers = computed(() => store.metrics.reduce((sum, m) => sum + m.seguidores, 0))
const ownSummary     = ref<RatingSummary | null>(null)

function calcAge(dob: string) {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

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

onMounted(async () => {
  await store.loadInfluencerProfile()
  if (esData.value) {
    ownSummary.value = await ratingsApi.getSummary(esData.value.id).catch(() => null)
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
  }
})

async function saveProfile() {
  if (!(await v$.value.$validate())) return
  saveError.value = ''
  try {
    const { pais, departamento, ...rest } = form.value
    await store.updateInfluencerProfile({ ...rest, ubicacion: formatUbicacion(pais, departamento) })
    editing.value = false
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
  verifyingId.value = id
  try { await store.verifyMetric(id) } finally { verifyingId.value = null }
}

async function deleteMetric(id: number) {
  deletingId.value = id
  try { await store.removeMetric(id) } finally { deletingId.value = null }
}

async function saveBank() {
  bankSaving.value = true
  try { await store.updateInfluencerProfile(bankForm.value); bankEditing.value = false }
  finally { bankSaving.value = false }
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
</script>

<template>
  <AppLayout>
    <div class="space-y-5 pb-8">

      <!-- ── Profile Hero: banner + avatar overlap ──────────────────────────── -->
      <div class="relative">
        <CoverBanner :rubro="esData?.rubros?.[0]" :extra="(esData?.rubros?.length ?? 1) - 1" :nombre="esData?.nombre_artistico" height="200px" />

        <!-- Avatar overlapping the banner bottom -->
        <div class="absolute bottom-0 translate-y-1/2 left-5 z-10">
          <div class="rounded-full ring-[3px] ring-white shadow-lg">
            <AvatarUpload :name="esData?.nombre_artistico ?? ''" size="xl" editable />
          </div>
        </div>

        <!-- Glass button top-right -->
        <div class="absolute top-4 right-4">
          <button v-if="!editing" @click="editing = true; saveError = ''; v$.$reset()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/25 hover:bg-black/40 backdrop-blur-sm text-white text-xs font-semibold border border-white/20 transition-all">
            ✏️ Editar perfil
          </button>
          <button v-else @click="editing = false"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/25 hover:bg-black/40 backdrop-blur-sm text-white text-xs font-semibold border border-white/20 transition-all">
            ✕ Cancelar
          </button>
        </div>
      </div>

      <!-- ── Loading ────────────────────────────────────────────────────────── -->
      <div v-if="store.loading" class="card pt-14 py-8 text-center text-navy/40 text-sm">
        <span class="animate-pulse">Cargando perfil…</span>
      </div>

      <!-- ── Profile Info — vista ───────────────────────────────────────────── -->
      <div v-else-if="!editing && esData" class="card pt-14">

        <!-- Name row -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-display font-bold text-navy leading-tight truncate">
                {{ esData.nombre_artistico }}
              </h2>
              <VerifiedBadge v-if="esData.is_verified" size="md" />
            </div>
            <p v-if="esData.username" class="text-violet font-medium text-sm mt-0.5">@{{ esData.username }}</p>
            <p v-if="esData.ubicacion" class="text-navy/50 text-sm mt-0.5 flex items-center gap-1">
              <span class="text-xs">📍</span> {{ esData.ubicacion }}
            </p>
          </div>
          <!-- Tarifa pill -->
          <div class="shrink-0 bg-violet/8 rounded-xl px-3 py-2 text-right border border-violet/12">
            <p class="font-bold text-violet text-lg leading-none">${{ Number(esData.tarifa_base).toFixed(0) }}</p>
            <p class="text-[10px] text-violet/50 mt-0.5 uppercase tracking-wide font-medium">USD / campaña</p>
          </div>
        </div>

        <!-- Bio -->
        <p v-if="esData.bio" class="text-sm text-navy/70 leading-relaxed mb-4">{{ esData.bio }}</p>

        <!-- Status + tags -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          <span :class="esData.disponibilidad ? 'badge-active' : 'badge-muted'">
            {{ esData.disponibilidad ? '✅ Disponible' : '🔒 No disponible' }}
          </span>
          <span v-for="(r, i) in (esData.rubros ?? [])" :key="r" class="badge-info capitalize"
            :title="i === 0 ? 'Rubro principal' : undefined">{{ i === 0 ? '⭐' : '🏷️' }} {{ RUBROS_LIST.find(x => x.value === r)?.label ?? r }}</span>
          <span v-if="esData.fecha_nacimiento" class="badge-muted">📅 {{ esData.fecha_nacimiento }}</span>
          <span v-if="store.metrics.length > 0" class="badge-muted">
            👥 {{ formatFollowers(totalFollowers) }} seguidores
          </span>
        </div>

        <!-- Rating summary (readonly) -->
        <div v-if="ownSummary" class="flex items-center gap-2 mb-4">
          <StarRating :model-value="Math.round(ownSummary.promedio ?? 0)" readonly size="sm" />
          <template v-if="ownSummary.total > 0">
            <span class="font-bold text-navy text-sm">{{ ownSummary.promedio }}</span>
            <span class="text-navy/50 text-xs">({{ ownSummary.total }} reseña{{ ownSummary.total !== 1 ? 's' : '' }})</span>
          </template>
        </div>

        <!-- Verificación de perfil -->
        <div v-if="verificationChecklist"
          :class="esData.is_verified ? 'bg-violet/5 border-violet/20' : 'bg-amber-50 border-amber-200'"
          class="rounded-xl border p-3 mb-4">
          <div class="flex items-center gap-2 mb-2">
            <VerifiedBadge v-if="esData.is_verified" size="sm" />
            <span v-else class="text-amber-500 text-sm leading-none">⚠️</span>
            <p class="text-xs font-semibold" :class="esData.is_verified ? 'text-violet' : 'text-amber-700'">
              {{ esData.is_verified ? 'Perfil verificado — apareces en búsquedas' : 'Perfil incompleto — no apareces en búsquedas ni puedes ser contratado' }}
            </p>
          </div>
          <ul class="space-y-1">
            <li v-for="req in verificationChecklist" :key="req.label" class="flex items-center gap-2 text-xs">
              <span :class="req.ok ? 'text-emerald-500' : 'text-coral'">{{ req.ok ? '✓' : '✗' }}</span>
              <span :class="req.ok ? 'text-navy/60' : 'text-navy/80 font-medium'">{{ req.label }}</span>
            </li>
          </ul>
        </div>

        <!-- Identification + tutor -->
        <div class="border-t border-navy/8 pt-3 space-y-3">
          <div v-if="esData.numero_identificacion">
            <span class="badge-muted text-xs">🪪 {{ esData.tipo_identificacion }}: {{ esData.numero_identificacion }}</span>
          </div>
          <p v-else class="text-xs text-coral/70 font-medium">⚠️ Número de identificación no registrado</p>

          <div v-if="esData.tutor_nombre"
            class="bg-coral/5 border border-coral/20 rounded-xl p-3 text-sm flex items-start gap-3">
            <span class="text-lg mt-0.5">👨‍👦</span>
            <div>
              <p class="font-semibold text-coral text-xs uppercase tracking-wide mb-0.5">Representante legal</p>
              <p class="text-navy/70 text-sm">{{ esData.tutor_nombre }}</p>
              <p class="text-navy/40 text-xs">{{ esData.tutor_email }}</p>
              <span :class="esData.tutor_autorizacion ? 'badge-active' : 'badge-warning'" class="mt-1.5 inline-flex text-xs">
                {{ esData.tutor_autorizacion ? 'Autorizado' : 'Pendiente de autorización' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Edit Form ──────────────────────────────────────────────────────── -->
      <div v-else-if="editing" class="card pt-14">
        <h3 class="font-display font-semibold text-navy mb-5 text-base">Editar datos del perfil</h3>
        <form @submit.prevent="saveProfile" novalidate class="space-y-4">

          <div class="field">
            <label class="label">Username</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40 font-medium select-none">@</span>
              <input v-model="form.username" placeholder="mario_blue"
                :class="['input pl-7 w-full', { '!border-coral': v$.username.$error }]" />
            </div>
            <p v-if="v$.username.$error" class="text-coral text-xs mt-1">
              {{ v$.username.$errors[0]?.$message }}
            </p>
          </div>

          <div class="field">
            <label class="label">Nombre artístico</label>
            <input v-model="form.nombre_artistico"
              :class="['input', { '!border-coral': v$.nombre_artistico.$error }]" />
            <p v-if="v$.nombre_artistico.$error" class="text-coral text-xs mt-1">
              {{ v$.nombre_artistico.$errors[0]?.$message }}
            </p>
          </div>

          <div class="field">
            <label class="label">Bio</label>
            <textarea v-model="form.bio" class="input" rows="3"
              placeholder="Cuéntale a las marcas quién eres…" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">País</label>
              <select v-model="form.pais" @change="form.departamento = ''"
                :class="['input', { '!border-coral': v$.pais.$error }]">
                <option value="">— Selecciona —</option>
                <option v-for="p in PAISES" :key="p">{{ p }}</option>
              </select>
              <p v-if="v$.pais.$error" class="text-coral text-xs mt-1">
                {{ v$.pais.$errors[0]?.$message }}
              </p>
            </div>
            <div v-if="form.pais === 'El Salvador'" class="field">
              <label class="label">Departamento</label>
              <select v-model="form.departamento" class="input">
                <option value="">— Selecciona —</option>
                <option v-for="d in DEPARTAMENTOS_SV" :key="d">{{ d }}</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label class="label">Tarifa base (USD)</label>
            <input v-model.number="form.tarifa_base" type="number" min="0" class="input" />
          </div>

          <div class="field">
            <label class="label">Rubro / nicho <span class="text-navy/40 font-normal">(puedes elegir varios)</span></label>
            <div class="flex flex-wrap gap-2 mt-1">
              <button
                v-for="r in RUBROS_LIST" :key="r.value"
                type="button"
                @click="form.rubros.includes(r.value)
                  ? form.rubros.splice(form.rubros.indexOf(r.value), 1)
                  : form.rubros.push(r.value)"
                :class="form.rubros.includes(r.value)
                  ? 'bg-violet text-white border-violet'
                  : 'bg-white text-navy/60 border-navy/15 hover:border-violet/40'"
                class="px-3 py-1.5 rounded-full border text-xs font-medium transition-all select-none cursor-pointer">
                <span v-if="form.rubros[0] === r.value" title="Rubro principal">⭐</span> {{ r.label }}
              </button>
            </div>
            <div v-if="form.rubros.length > 1" class="flex items-center gap-2 mt-3">
              <label class="text-sm text-navy/60 shrink-0">⭐ Rubro principal</label>
              <select v-model="rubroPrincipal" class="input py-1.5 text-sm">
                <option v-for="r in form.rubros" :key="r" :value="r">
                  {{ RUBROS_LIST.find(x => x.value === r)?.label ?? r }}
                </option>
              </select>
            </div>
            <p v-if="v$.rubros.$error" class="text-coral text-xs mt-1">
              {{ v$.rubros.$errors[0]?.$message }}
            </p>
          </div>

          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input v-model="form.disponibilidad" type="checkbox" class="rounded accent-violet" />
            <span class="text-sm font-medium text-navy/70">Disponible para nuevas campañas</span>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Tipo de identificación</label>
              <select v-model="form.tipo_identificacion" class="input">
                <option v-for="t in TIPOS_ID" :key="t">{{ t }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Número de identificación</label>
              <input v-model="form.numero_identificacion" placeholder="00000000-0"
                :class="['input', { '!border-coral': v$.numero_identificacion.$error }]" />
              <p v-if="v$.numero_identificacion.$error" class="text-coral text-xs mt-1">
                {{ v$.numero_identificacion.$errors[0]?.$message }}
              </p>
            </div>
          </div>

          <p v-if="saveError" class="text-coral text-sm">{{ saveError }}</p>

          <div class="flex gap-2 pt-1">
            <button type="submit" :disabled="store.saving" class="btn-primary text-sm">
              {{ store.saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
            <button type="button" @click="editing = false" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </form>
      </div>

      <!-- ── Redes sociales ─────────────────────────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-display font-semibold text-navy">Redes sociales</h2>
            <p class="text-xs text-navy/40 mt-0.5">
              <template v-if="store.metrics.length > 0">
                {{ formatFollowers(totalFollowers) }} seguidores en
                {{ store.metrics.length }} plataforma{{ store.metrics.length > 1 ? 's' : '' }}
              </template>
              <template v-else>Agrega tus redes para aparecer en búsquedas</template>
            </p>
          </div>
          <button @click="showMetricForm = !showMetricForm" class="btn-primary text-sm">
            {{ showMetricForm ? '✕ Cerrar' : '+ Agregar red' }}
          </button>
        </div>

        <!-- Formulario nueva métrica -->
        <div v-if="showMetricForm"
          class="border border-violet/20 rounded-xl p-4 mb-4 bg-violet/5 space-y-3">
          <p class="text-xs text-navy/50">
            Los seguidores se obtienen automáticamente para Instagram, TikTok y Facebook.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Red social</label>
              <select v-model="metricForm.red_social" class="input">
                <option v-for="r in REDES" :key="r">{{ r }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Username (sin @)</label>
              <input v-model="metricForm.username" class="input" placeholder="tuusuario"
                @keyup.enter="addMetric" />
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="addMetric" :disabled="savingMetric || !metricForm.username" class="btn-primary text-sm">
              {{ savingMetric ? 'Verificando…' : 'Agregar y verificar' }}
            </button>
            <button @click="showMetricForm = false; metricError = ''" class="btn-ghost text-sm">Cancelar</button>
          </div>
          <p v-if="metricError" class="text-coral text-sm">{{ metricError }}</p>
        </div>

        <!-- Empty state -->
        <div v-if="store.metrics.length === 0 && !showMetricForm"
          class="text-center py-10 text-navy/40 text-sm">
          <p class="text-3xl mb-2">📱</p>
          <p class="font-medium text-navy/50">Sin redes sociales vinculadas</p>
          <p class="text-xs mt-1">Agrega tus cuentas para que las marcas te encuentren</p>
        </div>

        <!-- Metric cards -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="m in store.metrics" :key="m.id"
            class="relative flex items-center gap-3 p-3.5 bg-white rounded-xl border border-navy/8 hover:shadow-sm transition-shadow overflow-hidden"
            :style="{ borderLeftWidth: '3px', borderLeftColor: PLATFORM_COLOR[m.red_social] ?? '#7C3AED' }">

            <!-- Platform icon -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              :style="{ background: (PLATFORM_COLOR[m.red_social] ?? '#7C3AED') + '18' }">
              {{ REDES_ICON[m.red_social] ?? '📱' }}
            </div>

            <div class="flex-1 min-w-0">
              <!-- Platform name + verified badge -->
              <div class="flex items-center gap-1.5 mb-0.5">
                <p class="font-bold text-navy text-sm">{{ m.red_social }}</p>
                <span v-if="m.is_verified"
                  class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet text-white text-[9px] font-bold"
                  title="Verificado">✓</span>
                <span v-else class="text-[10px] text-navy/30 bg-navy/5 px-1.5 py-0.5 rounded">sin verificar</span>
              </div>

              <p class="text-xs text-navy/50 mb-1.5">@{{ m.username }}</p>

              <!-- Stats row -->
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-navy">{{ formatFollowers(m.seguidores) }}</span>
                <span class="text-xs text-navy/40">seguidores</span>
                <span v-if="m.engagement_rate > 0"
                  class="ml-auto text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                  ⚡ {{ m.engagement_rate }}%
                </span>
              </div>

              <p v-if="m.verified_at" class="text-[10px] text-navy/30 mt-1">
                Verificado {{ new Date(m.verified_at).toLocaleDateString('es-SV') }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex flex-col items-center gap-2 shrink-0 ml-1">
              <button @click="verifyMetric(m.id)" :disabled="verifyingId === m.id"
                class="text-violet/50 hover:text-violet disabled:opacity-30 transition-colors text-sm"
                title="Re-verificar">
                {{ verifyingId === m.id ? '…' : '🔄' }}
              </button>
              <button @click="deleteMetric(m.id)" :disabled="deletingId === m.id"
                class="text-navy/20 hover:text-coral disabled:opacity-30 transition-colors text-sm">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Cuenta bancaria ─────────────────────────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-display font-semibold text-navy">Cuenta bancaria</h2>
            <p class="text-xs text-navy/40 mt-0.5">Para recibir pagos de contratos vía Wompi</p>
          </div>
          <button v-if="!bankEditing" @click="bankEditing = true" class="btn-secondary text-sm">✏️ Editar</button>
        </div>

        <template v-if="!bankEditing">
          <div v-if="esData?.banco_nombre"
            class="flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl shrink-0">🏦</div>
            <div>
              <p class="font-bold text-green-700 text-sm">{{ esData.banco_nombre }}</p>
              <p class="text-xs text-green-600 mt-0.5">
                Cuenta {{ esData.banco_cuenta_tipo }} ·
                <span class="font-mono">{{ esData.banco_cuenta_numero }}</span>
              </p>
            </div>
            <span class="ml-auto badge-active text-xs">✓ Configurada</span>
          </div>
          <div v-else
            class="flex items-center gap-3 bg-coral/5 border border-coral/20 rounded-xl p-4 text-sm text-coral/80">
            <span class="text-2xl">⚠️</span>
            <div>
              <p class="font-semibold">Sin cuenta bancaria</p>
              <p class="text-xs text-coral/60 mt-0.5">Agrégala para poder recibir pagos de campañas.</p>
            </div>
          </div>
        </template>

        <form v-else @submit.prevent="saveBank" class="space-y-3">
          <div class="field">
            <label class="label">Nombre del banco</label>
            <input v-model="bankForm.banco_nombre" class="input" placeholder="Ej. Banco Agrícola" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Número de cuenta</label>
              <input v-model="bankForm.banco_cuenta_numero" class="input" placeholder="000000000" required />
            </div>
            <div class="field">
              <label class="label">Tipo de cuenta</label>
              <select v-model="bankForm.banco_cuenta_tipo" class="input">
                <option v-for="t in TIPOS_CUENTA" :key="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="submit" :disabled="bankSaving" class="btn-primary text-sm">
              {{ bankSaving ? 'Guardando…' : 'Guardar cuenta' }}
            </button>
            <button type="button" @click="bankEditing = false" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </form>
      </div>

    </div>
  </AppLayout>
</template>
