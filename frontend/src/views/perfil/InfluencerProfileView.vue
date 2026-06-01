<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { influencerApi } from '@/api/profiles'

const store     = useProfileStore()
const authStore = useAuthStore()
const editing   = ref(false)
const showMetricForm = ref(false)
const connectLoading = ref(false)
const connectError   = ref('')
const deletingId     = ref<number | null>(null)

const REDES = ['TikTok', 'Instagram', 'YouTube', 'Twitter', 'Facebook', 'Twitch', 'LinkedIn']

const form = ref({ nombre_artistico: '', bio: '', ubicacion: '', tarifa_base: 0, disponibilidad: true })
const metricForm = ref({ red_social: 'TikTok', username: '', seguidores: 0, engagement_rate: 0 })
const savingMetric = ref(false)

const hasConnect = computed(() => !!authStore.user?.stripe_connect_id)
const esData = computed(() => store.influencerProfile)

onMounted(async () => {
  await store.loadInfluencerProfile()
  if (esData.value) {
    form.value = {
      nombre_artistico: esData.value.nombre_artistico,
      bio:              esData.value.bio ?? '',
      ubicacion:        esData.value.ubicacion ?? '',
      tarifa_base:      Number(esData.value.tarifa_base),
      disponibilidad:   esData.value.disponibilidad,
    }
  }
})

async function saveProfile() {
  await store.updateInfluencerProfile(form.value)
  editing.value = false
}

async function addMetric() {
  if (!metricForm.value.username) return
  savingMetric.value = true
  try {
    await store.addMetric({ ...metricForm.value })
    metricForm.value = { red_social: 'TikTok', username: '', seguidores: 0, engagement_rate: 0 }
    showMetricForm.value = false
  } finally { savingMetric.value = false }
}

async function deleteMetric(id: number) {
  deletingId.value = id
  try { await store.removeMetric(id) }
  finally { deletingId.value = null }
}

async function connectStripe() {
  connectLoading.value = true
  connectError.value   = ''
  try {
    const { url } = await influencerApi.connectOnboard()
    window.location.href = url
  } catch (e: any) {
    connectError.value = e.response?.data?.message ?? 'Error al iniciar onboarding financiero.'
  } finally { connectLoading.value = false }
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const REDES_ICON: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Twitter: '𝕏',
  Facebook: '👤', Twitch: '🎮', LinkedIn: '💼',
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Mi Perfil — Influencer</h1>
        <p class="text-navy/50 text-sm mt-1">Tu perfil público visible para las marcas</p>
      </div>

      <!-- Datos del perfil -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-navy">Datos personales</h2>
          <button v-if="!editing" @click="editing = true" class="btn-secondary text-sm">✏️ Editar</button>
        </div>

        <div v-if="store.loading" class="text-navy/40 text-sm py-4">Cargando…</div>

        <template v-else-if="!editing && esData">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-full bg-violet/20 flex items-center justify-center text-2xl font-bold text-violet shrink-0">
              {{ esData.nombre_artistico?.[0]?.toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-display font-bold text-lg text-navy">{{ esData.nombre_artistico }}</p>
              <p class="text-navy/50 text-sm">{{ esData.ubicacion || 'Sin ubicación' }}</p>
              <p v-if="esData.bio" class="text-sm text-navy/70 mt-1">{{ esData.bio }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <span class="badge-info">💰 ${{ Number(esData.tarifa_base).toFixed(0) }} USD / campaña</span>
                <span :class="esData.disponibilidad ? 'badge-active' : 'badge-muted'">
                  {{ esData.disponibilidad ? '✅ Disponible' : '🔒 No disponible' }}
                </span>
                <span v-if="esData.fecha_nacimiento" class="badge-muted">
                  📅 {{ esData.fecha_nacimiento }}
                </span>
              </div>
            </div>
          </div>

          <!-- Tutor legal si es menor -->
          <div v-if="esData.tutor_nombre" class="mt-4 bg-coral/5 border border-coral/20 rounded-lg p-3 text-sm">
            <p class="font-semibold text-coral mb-1">👨‍👦 Representante legal vinculado</p>
            <p class="text-navy/60">{{ esData.tutor_nombre }} · {{ esData.tutor_email }}</p>
            <span :class="esData.tutor_autorizacion ? 'badge-active' : 'badge-warning'" class="mt-1">
              {{ esData.tutor_autorizacion ? 'Autorizado' : 'Pendiente de autorización' }}
            </span>
          </div>
        </template>

        <!-- Formulario -->
        <form v-else-if="editing" @submit.prevent="saveProfile" class="space-y-4">
          <div class="field">
            <label class="label">Nombre artístico</label>
            <input v-model="form.nombre_artistico" class="input" required />
          </div>
          <div class="field">
            <label class="label">Bio</label>
            <textarea v-model="form.bio" class="input" rows="3" placeholder="Cuéntale a las marcas quién eres…" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Ubicación</label>
              <input v-model="form.ubicacion" class="input" placeholder="Bogotá, Colombia" />
            </div>
            <div class="field">
              <label class="label">Tarifa base (USD)</label>
              <input v-model.number="form.tarifa_base" type="number" min="0" class="input" />
            </div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.disponibilidad" type="checkbox" class="rounded accent-violet" />
            <span class="text-sm font-medium text-navy/70">Disponible para nuevas campañas</span>
          </label>
          <div class="flex gap-2">
            <button type="submit" :disabled="store.saving" class="btn-primary text-sm">
              {{ store.saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
            <button type="button" @click="editing = false" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </form>
      </div>

      <!-- Redes sociales / Métricas §4 -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-display font-semibold text-navy">Redes sociales</h2>
            <p class="text-xs text-navy/40 mt-0.5">Carga manual · Visible en el buscador de marcas</p>
          </div>
          <button @click="showMetricForm = !showMetricForm" class="btn-primary text-sm">+ Agregar red</button>
        </div>

        <!-- Formulario nueva métrica -->
        <div v-if="showMetricForm" class="border border-violet/20 rounded-xl p-4 mb-4 bg-violet/5 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Red social</label>
              <select v-model="metricForm.red_social" class="input">
                <option v-for="r in REDES" :key="r">{{ r }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Username</label>
              <input v-model="metricForm.username" class="input" placeholder="@tuusuario" />
            </div>
            <div class="field">
              <label class="label">Seguidores</label>
              <input v-model.number="metricForm.seguidores" type="number" min="0" class="input" />
            </div>
            <div class="field">
              <label class="label">Engagement rate (%)</label>
              <input v-model.number="metricForm.engagement_rate" type="number" min="0" step="0.01" class="input" />
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="addMetric" :disabled="savingMetric || !metricForm.username" class="btn-primary text-sm">
              {{ savingMetric ? 'Guardando…' : 'Agregar' }}
            </button>
            <button @click="showMetricForm = false" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>

        <!-- Lista de métricas -->
        <div v-if="store.metrics.length === 0 && !showMetricForm" class="text-center py-6 text-navy/40 text-sm">
          Agrega tus redes sociales para aparecer en el buscador de marcas.
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="m in store.metrics" :key="m.id"
            class="flex items-center gap-3 p-3 bg-slate rounded-xl border border-navy/8">
            <span class="text-2xl">{{ REDES_ICON[m.red_social] ?? '📱' }}</span>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-navy text-sm">{{ m.red_social }}</p>
              <p class="text-xs text-navy/50">{{ m.username }}</p>
              <div class="flex gap-2 mt-1">
                <span class="badge-info text-xs">👥 {{ formatFollowers(m.seguidores) }}</span>
                <span class="badge-active text-xs">⚡ {{ m.engagement_rate }}%</span>
              </div>
            </div>
            <button @click="deleteMetric(m.id)" :disabled="deletingId === m.id"
              class="text-coral/60 hover:text-coral text-lg disabled:opacity-30">✕</button>
          </div>
        </div>
      </div>

      <!-- Onboarding financiero §4.2 -->
      <div class="card">
        <h2 class="font-display font-semibold text-navy mb-2">Onboarding financiero</h2>
        <p class="text-sm text-navy/60 mb-4">
          Para recibir pagos de contratos necesitas vincular tu cuenta bancaria mediante Stripe Connect.
        </p>
        <div v-if="hasConnect" class="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
          <span class="text-green-600 text-xl">✅</span>
          <div>
            <p class="font-semibold text-green-700 text-sm">Cuenta bancaria vinculada</p>
            <p class="text-xs text-green-600">ID: {{ authStore.user?.stripe_connect_id }}</p>
          </div>
        </div>
        <div v-else>
          <button @click="connectStripe" :disabled="connectLoading" class="btn-primary">
            {{ connectLoading ? 'Redirigiendo a Stripe…' : '🏦 Vincular cuenta bancaria' }}
          </button>
          <p v-if="connectError" class="text-coral text-sm mt-2">{{ connectError }}</p>
          <p class="text-xs text-navy/40 mt-2">Proceso seguro mediante Stripe Connect Express</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
