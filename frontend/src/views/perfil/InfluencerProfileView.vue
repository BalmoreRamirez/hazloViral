<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import AvatarUpload from '@/components/AvatarUpload.vue'
import { useProfileStore } from '@/stores/profile'
const store = useProfileStore()
const editing   = ref(false)
const showMetricForm = ref(false)
const deletingId     = ref<number | null>(null)
const verifyingId    = ref<number | null>(null)

const REDES = ['TikTok', 'Instagram', 'YouTube', 'Facebook']

const TIPOS_ID = ['DUI', 'PASAPORTE']

const bankEditing = ref(false)
const bankSaving  = ref(false)
const bankForm    = ref({ banco_nombre: '', banco_cuenta_numero: '', banco_cuenta_tipo: 'AHORROS' })
const TIPOS_CUENTA = ['AHORROS', 'CORRIENTE']

const form = ref({ nombre_artistico: '', bio: '', ubicacion: '', tarifa_base: 0, disponibilidad: true, tipo_identificacion: 'DUI', numero_identificacion: '' })
const metricForm = ref({ red_social: 'TikTok', username: '' })
const savingMetric  = ref(false)
const metricError   = ref('')

const esData = computed(() => store.influencerProfile)

onMounted(async () => {
  await store.loadInfluencerProfile()
  if (esData.value) {
    form.value = {
      nombre_artistico:    esData.value.nombre_artistico,
      bio:                 esData.value.bio ?? '',
      ubicacion:           esData.value.ubicacion ?? '',
      tarifa_base:         Number(esData.value.tarifa_base),
      disponibilidad:      esData.value.disponibilidad,
      tipo_identificacion: esData.value.tipo_identificacion ?? 'DUI',
      numero_identificacion: esData.value.numero_identificacion ?? '',
    }
    bankForm.value = {
      banco_nombre:        esData.value.banco_nombre ?? '',
      banco_cuenta_numero: esData.value.banco_cuenta_numero ?? '',
      banco_cuenta_tipo:   esData.value.banco_cuenta_tipo ?? 'AHORROS',
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
  metricError.value  = ''
  try {
    await store.addMetric({ ...metricForm.value })
    metricForm.value     = { red_social: 'TikTok', username: '' }
    showMetricForm.value = false
  } catch (e: any) {
    metricError.value = e.response?.data?.message ?? 'No se pudo verificar la cuenta.'
  } finally { savingMetric.value = false }
}

async function verifyMetric(id: number) {
  verifyingId.value = id
  try { await store.verifyMetric(id) }
  finally { verifyingId.value = null }
}

async function deleteMetric(id: number) {
  deletingId.value = id
  try { await store.removeMetric(id) }
  finally { deletingId.value = null }
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

const REDES_ICON: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', YouTube: '▶️',
  Facebook: '👤',
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
            <AvatarUpload
              :name="esData.nombre_artistico ?? ''"
              size="lg"
              editable
            />
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

          <!-- Número de identificación -->
          <div v-if="esData.numero_identificacion" class="mt-3 flex items-center gap-2 text-sm">
            <span class="badge-muted">🪪 {{ esData.tipo_identificacion }}: {{ esData.numero_identificacion }}</span>
          </div>
          <div v-else class="mt-3 text-xs text-coral/70 font-medium">⚠️ Número de identificación no registrado</div>

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
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Tipo de identificación</label>
              <select v-model="form.tipo_identificacion" class="input">
                <option v-for="t in TIPOS_ID" :key="t">{{ t }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Número de identificación</label>
              <input v-model="form.numero_identificacion" class="input" placeholder="00000000-0" />
            </div>
          </div>
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
          <p class="text-xs text-navy/50">El número de seguidores se obtiene automáticamente para Instagram, TikTok y Facebook.</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Red social</label>
              <select v-model="metricForm.red_social" class="input">
                <option v-for="r in REDES" :key="r">{{ r }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Username (sin @)</label>
              <input v-model="metricForm.username" class="input" placeholder="tuusuario" />
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

        <!-- Lista de métricas -->
        <div v-if="store.metrics.length === 0 && !showMetricForm" class="text-center py-6 text-navy/40 text-sm">
          Agrega tus redes sociales para aparecer en el buscador de marcas.
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="m in store.metrics" :key="m.id"
            class="flex items-center gap-3 p-3 bg-slate rounded-xl border border-navy/8">
            <span class="text-2xl">{{ REDES_ICON[m.red_social] ?? '📱' }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="font-semibold text-navy text-sm">{{ m.red_social }}</p>
                <!-- Badge verificado -->
                <span v-if="m.is_verified"
                  class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet text-white text-[9px] font-bold"
                  title="Cuenta verificada automáticamente">✓</span>
                <span v-else class="text-[10px] text-navy/30 font-medium">sin verificar</span>
              </div>
              <p class="text-xs text-navy/50">@{{ m.username }}</p>
              <div class="flex gap-2 mt-1">
                <span class="badge-info text-xs">👥 {{ formatFollowers(m.seguidores) }}</span>
                <span v-if="m.engagement_rate > 0" class="badge-active text-xs">⚡ {{ m.engagement_rate }}%</span>
              </div>
              <p v-if="m.verified_at" class="text-[10px] text-navy/30 mt-0.5">
                Verificado {{ new Date(m.verified_at).toLocaleDateString('es') }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <button @click="deleteMetric(m.id)" :disabled="deletingId === m.id"
                class="text-coral/60 hover:text-coral text-lg disabled:opacity-30">✕</button>
              <button @click="verifyMetric(m.id)" :disabled="verifyingId === m.id"
                class="text-xs text-violet/70 hover:text-violet disabled:opacity-40"
                title="Re-verificar con la API">
                {{ verifyingId === m.id ? '…' : '🔄' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cuenta bancaria para pagos vía Wompi -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="font-display font-semibold text-navy">Cuenta bancaria</h2>
            <p class="text-xs text-navy/40 mt-0.5">Para recibir pagos de contratos vía Wompi</p>
          </div>
          <button v-if="!bankEditing" @click="bankEditing = true" class="btn-secondary text-sm">✏️ Editar</button>
        </div>

        <template v-if="!bankEditing">
          <div v-if="esData?.banco_nombre" class="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <span class="text-green-600 text-xl">🏦</span>
            <div>
              <p class="font-semibold text-green-700 text-sm">{{ esData.banco_nombre }}</p>
              <p class="text-xs text-green-600">
                Cuenta {{ esData.banco_cuenta_tipo }} · {{ esData.banco_cuenta_numero }}
              </p>
            </div>
          </div>
          <div v-else class="text-sm text-coral/70 font-medium">
            ⚠️ Sin cuenta bancaria registrada. Agrégala para poder recibir pagos.
          </div>
        </template>

        <form v-else @submit.prevent="saveBank" class="space-y-3">
          <div class="field">
            <label class="label">Nombre del banco</label>
            <input v-model="bankForm.banco_nombre" class="input" placeholder="Ej. Bancolombia" required />
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
