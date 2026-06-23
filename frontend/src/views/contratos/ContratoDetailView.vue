<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useContractsStore } from '@/stores/contracts'
import { useAuthStore } from '@/stores/auth'
import { connectSocket } from '@/socket'
import { contractsApi } from '@/api/contracts'
import type { EntregableConArchivos, ArchivoEntregable } from '@/api/contracts'

const route          = useRoute()
const router         = useRouter()
const contractsStore = useContractsStore()
const authStore      = useAuthStore()

const contratoId = Number(route.params.id)
const contrato   = computed(() => contractsStore.current)
const isEmpresa  = computed(() => authStore.isEmpresa)

// Tabs
const activeTab = ref<'detalle' | 'auditoría'>('detalle')

// Entregables — uploader
const uploadingFiles = ref(false)
const uploadError    = ref('')
const pendingFiles   = ref<{ file: File; uploaded: ArchivoEntregable | null }[]>([])
const delivTipo      = ref('TikTok')
const delivDesc      = ref('')
const submitting     = ref(false)

// Cambios
const showChanges  = ref(false)
const changesFeedback = ref('')
const requestingChanges = ref(false)

// Publicaciones
const pubLinks  = ref<{ red_social: string; url: string }[]>([{ red_social: 'TikTok', url: '' }])
const registeringPubs = ref(false)

// Aprobación final / incumplimiento
const approving  = ref(false)
const showNonCompliance = ref(false)
const nonComplianceMotivo = ref('')
const reportingNC = ref(false)


const MAX_ROUNDS = 3
const isDevMode = import.meta.env.VITE_FORMA_PAGO !== 'produccion'

const fundLoading = ref(false)
async function fundContract() {
  if (!contrato.value) return
  fundLoading.value = true
  try {
    if (isDevMode) {
      await contractsStore.simulateFund(contrato.value.id)
    } else {
      await contractsStore.fundContract(contrato.value.id)
    }
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Error al procesar el pago.')
  } finally {
    fundLoading.value = false
  }
}

const CONTRACT_EVENTS = [
  'contract_funded', 'contract_under_review', 'changes_requested',
  'deliverables_approved', 'publications_registered', 'contract_completed',
  'noncompliance_reported',
]

onMounted(async () => {
  await Promise.all([
    contractsStore.fetchContract(contratoId),
    contractsStore.fetchRevisionRounds(contratoId),
    contractsStore.fetchAuditLog(contratoId),
  ])

  const s = connectSocket()

  // Unirse al cuarto del chat del contrato para recibir eventos en tiempo real
  if (contrato.value?.chat_id) {
    s.emit('join_chat', { chat_id: contrato.value.chat_id })
  }

  // Evitar listeners duplicados si se vuelve a montar
  CONTRACT_EVENTS.forEach(e => s.off(e))

  s.on('contract_funded',         () => contractsStore.fetchContract(contratoId))
  s.on('contract_under_review',   () => contractsStore.fetchContract(contratoId))
  s.on('changes_requested',       () => {
    contractsStore.fetchContract(contratoId)
    contractsStore.fetchRevisionRounds(contratoId)
  })
  s.on('deliverables_approved',   () => contractsStore.fetchContract(contratoId))
  s.on('publications_registered', () => contractsStore.fetchContract(contratoId))
  s.on('contract_completed',      () => contractsStore.fetchContract(contratoId))
  s.on('noncompliance_reported',  () => contractsStore.fetchContract(contratoId))
})

onUnmounted(() => {
  const s = connectSocket()
  CONTRACT_EVENTS.forEach(e => s.off(e))
})

// ── File upload helpers ────────────────────────────────────────────────────
function onFilesSelected(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  files.forEach(f => pendingFiles.value.push({ file: f, uploaded: null }))
  ;(e.target as HTMLInputElement).value = ''
}

async function uploadPendingFiles() {
  uploadError.value = ''
  uploadingFiles.value = true
  try {
    await Promise.all(
      pendingFiles.value
        .filter(p => !p.uploaded)
        .map(async (p) => {
          const result = await contractsApi.uploadFile(p.file)
          p.uploaded = { url: result.url, tipo_archivo: result.tipo_archivo, nombre: result.nombre, size_bytes: result.size_bytes }
        })
    )
  } catch {
    uploadError.value = 'Error al subir uno o más archivos. Intenta de nuevo.'
  } finally {
    uploadingFiles.value = false
  }
}

function removePendingFile(i: number) {
  pendingFiles.value.splice(i, 1)
}

async function submitDeliverables() {
  if (pendingFiles.value.some(p => !p.uploaded)) {
    await uploadPendingFiles()
    if (uploadError.value) return
  }
  if (!contrato.value) return
  submitting.value = true
  try {
    const entregables: EntregableConArchivos[] = [{
      tipo: delivTipo.value,
      descripcion: delivDesc.value,
      archivos: pendingFiles.value.map(p => p.uploaded!),
    }]
    await contractsStore.submitDeliverables(contrato.value.id, entregables)
    pendingFiles.value = []
    delivDesc.value = ''
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Error al enviar entregables.')
  } finally {
    submitting.value = false }
}

// ── Acciones de empresa ────────────────────────────────────────────────────
async function requestChanges() {
  if (!contrato.value || !changesFeedback.value) return
  requestingChanges.value = true
  try {
    await contractsStore.requestChanges(contrato.value.id, changesFeedback.value)
    showChanges.value = false
    changesFeedback.value = ''
    await contractsStore.fetchRevisionRounds(contratoId)
  } catch (e: any) { alert(e.response?.data?.message ?? 'Error.') }
  finally { requestingChanges.value = false }
}

async function approveDeliverables() {
  if (!contrato.value) return
  approving.value = true
  try { await contractsStore.approveDeliverables(contrato.value.id) }
  catch (e: any) { alert(e.response?.data?.message ?? 'Error.') }
  finally { approving.value = false }
}

// ── Acciones de influencer ─────────────────────────────────────────────────
function addPubLink() { pubLinks.value.push({ red_social: 'TikTok', url: '' }) }
function removePubLink(i: number) { pubLinks.value.splice(i, 1) }

async function registerPublications() {
  if (!contrato.value) return
  const valid = pubLinks.value.filter(p => p.url.trim())
  if (!valid.length) return
  registeringPubs.value = true
  try {
    await contractsStore.registerPublications(contrato.value.id, valid)
    pubLinks.value = [{ red_social: 'TikTok', url: '' }]
  } catch (e: any) { alert(e.response?.data?.message ?? 'Error.') }
  finally { registeringPubs.value = false }
}

// ── Aprobación final (empresa) ─────────────────────────────────────────────
async function approve() {
  if (!contrato.value) return
  approving.value = true
  try { await contractsStore.approve(contrato.value.id) }
  catch (e: any) { alert(e.response?.data?.message ?? 'Error.') }
  finally { approving.value = false }
}

async function reportNonCompliance() {
  if (!contrato.value || !nonComplianceMotivo.value) return
  reportingNC.value = true
  try {
    await contractsStore.reportNonCompliance(contrato.value.id, nonComplianceMotivo.value)
    showNonCompliance.value = false
  } catch (e: any) { alert(e.response?.data?.message ?? 'Error.') }
  finally { reportingNC.value = false }
}


// ── Timeline ───────────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending_payment',     label: 'Pago pendiente',        icon: '⏳' },
  { key: 'funded_in_escrow',    label: 'En custodia',           icon: '🔒' },
  { key: 'under_review',        label: 'Revisión entregables',  icon: '🔍' },
  { key: 'pending_publication', label: 'Publicación',           icon: '📢' },
  { key: 'publication_review',  label: 'Revisión publicación',  icon: '👁' },
  { key: 'completed',           label: 'Finalizado',            icon: '✅' },
]

const ORDER = [
  'pending_payment','funded_in_escrow','under_review',
  'changes_requested','pending_publication','publication_review','completed',
  'in_dispute','incumplimiento',
]

function stepState(step: string, current: string) {
  if (['in_dispute','incumplimiento'].includes(current)) return 'past'
  if (current === 'changes_requested' && step === 'under_review') return 'active'
  const ci = ORDER.indexOf(current)
  const si = ORDER.indexOf(step)
  if (si < ci) return 'past'
  if (si === ci) return 'active'
  return 'future'
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment:     '⏳ Pago pendiente',
  funded_in_escrow:    '🔒 En custodia',
  under_review:        '🔍 En revisión',
  changes_requested:   '🔄 Cambios solicitados',
  pending_publication: '📢 Pendiente de publicación',
  publication_review:  '👁 Revisando publicaciones',
  completed:           '✅ Completado',
  in_dispute:          '⚠️ En disputa',
  incumplimiento:      '🚫 Incumplimiento',
}


const AUDIT_ACTIONS: Record<string, string> = {
  proposal_accepted:       'Propuesta aceptada',
  counter_accepted:        'Contraoferta aceptada',
  funded:                  'Fondos depositados en custodia',
  deliverables_submitted:  'Entregables enviados',
  changes_requested:       'Cambios solicitados',
  deliverables_approved:   'Entregables aprobados',
  publications_registered: 'Publicaciones registradas',
  approved:                'Fondos liberados — contrato finalizado',
  disputed:                'Disputa iniciada',
  noncompliance_reported:  'Incumplimiento reportado',
}

function auditLabel(action: string) { return AUDIT_ACTIONS[action] ?? action }

function formatDate(dt: string) {
  return new Date(dt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

const TIPO_ICON: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Twitter: '𝕏', Facebook: '👤', Twitch: '🎮',
}
</script>

<template>
  <AppLayout>
    <div v-if="contractsStore.loading" class="text-center py-16 text-navy/40">Cargando…</div>

    <template v-else-if="contrato">
      <div class="space-y-5">

        <!-- Header -->
        <div class="flex items-start gap-3">
          <button @click="router.push('/contratos')" class="text-navy/40 hover:text-navy text-lg mt-0.5">←</button>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-2xl font-display font-bold text-navy">Contrato</h1>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="{
                'bg-amber-100 text-amber-700':  ['pending_payment','in_dispute','incumplimiento'].includes(contrato.status),
                'bg-blue-100 text-blue-700':    ['funded_in_escrow','under_review','changes_requested','pending_publication','publication_review'].includes(contrato.status),
                'bg-green-100 text-green-700':  contrato.status === 'completed',
              }">{{ STATUS_LABELS[contrato.status] ?? contrato.status }}</span>
            </div>
            <div class="flex items-center gap-2 mt-2 text-sm flex-wrap">
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-6 rounded-full bg-violet/20 flex items-center justify-center text-xs font-bold text-violet">
                  {{ (contrato.empresa?.nombre_comercial?.[0] ?? 'E').toUpperCase() }}
                </div>
                <span class="font-medium text-navy">{{ contrato.empresa?.nombre_comercial ?? 'Empresa' }}</span>
              </div>
              <span class="text-navy/30">→</span>
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-6 rounded-full bg-violet/20 flex items-center justify-center text-xs font-bold text-violet">
                  {{ (contrato.influencer?.nombre_artistico?.[0] ?? 'I').toUpperCase() }}
                </div>
                <span class="font-medium text-navy">{{ contrato.influencer?.nombre_artistico ?? 'Influencer' }}</span>
              </div>
              <span class="text-navy/30">·</span>
              <span class="text-navy/40">{{ new Date(contrato.created_at).toLocaleDateString('es-CO') }}</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-navy/10">
          <button v-for="t in (['detalle','auditoría'] as const)" :key="t"
            @click="activeTab = t"
            :class="['px-4 py-2 text-sm font-medium transition-colors', activeTab === t
              ? 'text-violet border-b-2 border-violet -mb-px'
              : 'text-navy/40 hover:text-navy']">
            {{ t === 'detalle' ? '📋 Detalle' : '📜 Auditoría' }}
          </button>
        </div>

        <!-- ═══ TAB DETALLE ═══ -->
        <template v-if="activeTab === 'detalle'">

          <!-- Timeline -->
          <div class="card">
            <h2 class="font-semibold text-navy mb-4">Estado del contrato</h2>
            <div v-if="['in_dispute','incumplimiento'].includes(contrato.status)"
              class="bg-coral/10 border border-coral/20 rounded-lg p-4 text-coral text-sm">
              {{ contrato.status === 'in_dispute'
                ? '⚠️ Contrato en disputa — un administrador revisará el caso.'
                : `🚫 Incumplimiento reportado: ${contrato.motivo_incumplimiento}` }}
            </div>
            <div v-else class="flex items-center">
              <template v-for="(step, i) in STATUS_STEPS" :key="step.key">
                <div class="flex flex-col items-center flex-1 min-w-0">
                  <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all', {
                    'bg-violet border-violet text-white shadow-md': stepState(step.key, contrato.status) === 'active',
                    'bg-green-500 border-green-500 text-white':     stepState(step.key, contrato.status) === 'past',
                    'bg-white border-navy/20 text-navy/30':         stepState(step.key, contrato.status) === 'future',
                  }]">{{ step.icon }}</div>
                  <p class="text-xs mt-1 text-center font-medium leading-tight px-1" :class="{
                    'text-violet':     stepState(step.key, contrato.status) === 'active',
                    'text-green-600':  stepState(step.key, contrato.status) === 'past',
                    'text-navy/30':    stepState(step.key, contrato.status) === 'future',
                  }">{{ step.label }}</p>
                  <span v-if="step.key === 'under_review' && contrato.revision_round > 0"
                    class="text-xs text-amber-600 font-medium mt-0.5">
                    Ronda {{ contrato.revision_round }}/{{ MAX_ROUNDS }}
                  </span>
                </div>
                <div v-if="i < STATUS_STEPS.length - 1" class="flex-1 h-0.5 mb-7 -mx-1"
                  :class="ORDER.indexOf(step.key) < ORDER.indexOf(contrato.status) ? 'bg-green-400' : 'bg-navy/15'" />
              </template>
            </div>
          </div>

          <!-- Detalles económicos + entregables -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="card space-y-2">
              <h2 class="font-semibold text-navy">Detalles económicos</h2>
              <div class="text-sm space-y-1">
                <div class="flex justify-between">
                  <span class="text-navy/50">Monto total</span>
                  <strong>${{ contrato.monto_total }} USD</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-navy/50">Comisión plataforma</span>
                  <span>${{ contrato.comision_plataforma }} USD</span>
                </div>
                <div class="flex justify-between border-t border-navy/10 pt-1 mt-1">
                  <span class="text-navy/50">Neto al influencer</span>
                  <strong class="text-green-600">
                    ${{ (Number(contrato.monto_total) - Number(contrato.comision_plataforma)).toFixed(2) }} USD
                  </strong>
                </div>
              </div>
              <div v-if="contrato.contrato_pdf_url" class="pt-1">
                <a :href="contrato.contrato_pdf_url" target="_blank"
                  class="inline-flex items-center gap-1.5 text-xs text-violet font-medium hover:underline">
                  📄 Ver contrato PDF oficial
                </a>
              </div>
            </div>

            <div class="card space-y-3">
              <h2 class="font-semibold text-navy">Entregables requeridos</h2>
              <div v-for="(e, i) in contrato.entregables" :key="i"
                class="rounded-lg border border-navy/8 bg-slate p-3 text-sm space-y-1">
                <div class="flex items-center gap-2">
                  <span>{{ TIPO_ICON[e.tipo] ?? '📦' }}</span>
                  <span class="font-semibold text-navy">{{ e.tipo }}</span>
                </div>
                <p v-if="e.descripcion" class="text-navy/60 leading-snug">{{ e.descripcion }}</p>
                <div v-if="e.archivos?.length" class="pt-2 space-y-3">
                  <p class="text-xs text-navy/40 font-medium">Archivos entregados:</p>
                  <div v-for="(a, j) in e.archivos" :key="j" class="space-y-1">
                    <!-- Video inline -->
                    <video v-if="a.tipo_archivo === 'video'"
                      :src="a.url" controls preload="metadata"
                      class="w-full rounded-lg max-h-72 bg-black">
                      Tu navegador no soporta la reproducción de video.
                    </video>
                    <!-- Imagen inline -->
                    <img v-else-if="a.tipo_archivo === 'imagen' || a.tipo_archivo === 'banner'"
                      :src="a.url" :alt="a.nombre"
                      class="w-full rounded-lg max-h-72 object-contain bg-slate" />
                    <!-- Documento — solo link de descarga -->
                    <a v-else :href="a.url" target="_blank" download
                      class="flex items-center gap-1.5 text-xs text-violet hover:underline">
                      <span>📎</span>{{ a.nombre }}
                    </a>
                    <!-- Nombre y peso debajo de video/imagen -->
                    <p v-if="a.tipo_archivo !== 'documento'" class="text-xs text-navy/40">
                      {{ a.nombre }} · {{ (a.size_bytes / 1024 / 1024).toFixed(1) }} MB
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 text-xs text-navy/50 pt-1 border-t border-navy/8">
                <span>📅</span>
                <span>Fecha límite:</span>
                <span class="font-semibold text-navy">{{ contrato.fecha_limite_entrega }}</span>
              </div>
            </div>
          </div>

          <!-- Rondas de revisión -->
          <div v-if="contractsStore.revisionRounds.length" class="card space-y-3">
            <h2 class="font-semibold text-navy">Historial de revisiones</h2>
            <div v-for="r in contractsStore.revisionRounds" :key="r.id"
              class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Ronda {{ r.round_number }}/{{ MAX_ROUNDS }}
                </span>
                <span class="text-xs text-navy/40">{{ formatDate(r.created_at) }}</span>
              </div>
              <p class="text-navy/70">{{ r.feedback }}</p>
            </div>
          </div>

          <!-- Publicaciones registradas -->
          <div v-if="contrato.publication_links?.length" class="card space-y-3">
            <h2 class="font-semibold text-navy">Publicaciones en redes sociales</h2>
            <div v-for="(p, i) in contrato.publication_links" :key="i"
              class="flex items-center gap-3 rounded-lg border border-navy/8 bg-slate p-3 text-sm">
              <span class="font-semibold text-navy w-24 shrink-0">{{ p.red_social }}</span>
              <a :href="p.url" target="_blank" class="text-violet hover:underline truncate flex-1">{{ p.url }}</a>
              <span class="text-xs text-navy/40 shrink-0">{{ formatDate(p.publicado_at) }}</span>
            </div>
          </div>

          <!-- ═══ ACCIONES ═══ -->
          <div class="card space-y-4">
            <h2 class="font-semibold text-navy">Acciones disponibles</h2>

            <!-- Empresa: fondear -->
            <template v-if="isEmpresa && contrato.status === 'pending_payment'">
              <p class="text-sm text-navy/60">El influencer aceptó la propuesta. Deposita los fondos para que pueda comenzar a trabajar.</p>
              <button @click="fundContract" :disabled="fundLoading" class="btn-primary disabled:opacity-60">
                <template v-if="fundLoading">Procesando…</template>
                <template v-else-if="isDevMode">🧪 Simular pago (Desarrollo)</template>
                <template v-else>🔒 Fondear contrato en custodia (Wompi)</template>
              </button>
              <p v-if="isDevMode" class="text-xs text-amber-600 mt-1">
                Modo desarrollo — el pago se simula sin pasar por Wompi.
              </p>
            </template>

            <!-- Influencer: subir entregables -->
            <template v-if="!isEmpresa && ['funded_in_escrow','changes_requested'].includes(contrato.status)">
              <div class="space-y-3">
                <p class="text-sm text-navy/60">
                  {{ contrato.status === 'changes_requested'
                    ? `La empresa solicitó cambios (ronda ${contrato.revision_round}/${MAX_ROUNDS}). Sube los archivos corregidos.`
                    : 'El pago está asegurado. Sube tus archivos de entregables.' }}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="label">Tipo de entregable</label>
                    <select v-model="delivTipo" class="input">
                      <option>TikTok</option><option>Instagram</option>
                      <option>YouTube</option><option>Twitter</option>
                    </select>
                  </div>
                  <div>
                    <label class="label">Descripción</label>
                    <input v-model="delivDesc" class="input" placeholder="Descripción del entregable…" />
                  </div>
                </div>
                <div>
                  <label class="label">Archivos (video, imagen, banner, PDF, ZIP)</label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-navy/20 text-sm text-navy/50 hover:border-violet/40 transition-colors">
                      <span>📎</span> Seleccionar archivos…
                    </div>
                    <input type="file" multiple class="hidden"
                      accept="video/*,image/*,application/pdf,application/zip"
                      @change="onFilesSelected" />
                  </label>
                  <div v-if="pendingFiles.length" class="mt-2 space-y-1">
                    <div v-for="(p, i) in pendingFiles" :key="i"
                      class="flex items-center gap-2 text-xs text-navy/70 bg-slate rounded px-2 py-1">
                      <span>{{ p.uploaded ? '✅' : '⏳' }}</span>
                      <span class="flex-1 truncate">{{ p.file.name }}</span>
                      <button @click="removePendingFile(i)" class="text-coral hover:text-coral/70">✕</button>
                    </div>
                  </div>
                  <p v-if="uploadError" class="text-coral text-xs mt-1">{{ uploadError }}</p>
                </div>
                <button @click="submitDeliverables"
                  :disabled="submitting || uploadingFiles || !pendingFiles.length"
                  class="btn-primary text-sm disabled:opacity-50">
                  {{ submitting ? 'Enviando…' : uploadingFiles ? 'Subiendo archivos…' : '📤 Enviar entregables' }}
                </button>
              </div>
            </template>

            <!-- Empresa: revisar entregables -->
            <template v-if="isEmpresa && contrato.status === 'under_review'">
              <p class="text-sm text-navy/60">El influencer entregó el trabajo. Revisa los archivos y decide.</p>
              <div class="flex gap-2 flex-wrap">
                <button @click="approveDeliverables" :disabled="approving" class="btn-primary text-sm">
                  {{ approving ? 'Aprobando…' : '✅ Aprobar entregables' }}
                </button>
                <button v-if="contrato.revision_round < MAX_ROUNDS"
                  @click="showChanges = !showChanges"
                  class="btn-ghost text-sm border-amber-300 text-amber-700">
                  🔄 Solicitar cambios ({{ contrato.revision_round }}/{{ MAX_ROUNDS }})
                </button>
                <p v-else class="text-xs text-navy/50 self-center">Máximo de rondas alcanzado. Si hay problemas, inicia una disputa.</p>
              </div>
              <div v-if="showChanges" class="border border-amber-200 rounded-lg p-4 space-y-3 bg-amber-50">
                <p class="text-sm font-semibold text-amber-700">Solicitar cambios — ronda {{ contrato.revision_round + 1 }}/{{ MAX_ROUNDS }}</p>
                <textarea v-model="changesFeedback" class="input" rows="3"
                  placeholder="Describe qué debe corregir el influencer…" />
                <div class="flex gap-2">
                  <button @click="requestChanges" :disabled="requestingChanges || !changesFeedback" class="btn-primary text-sm bg-amber-600 hover:bg-amber-700">
                    {{ requestingChanges ? 'Enviando…' : 'Confirmar solicitud' }}
                  </button>
                  <button @click="showChanges = false" class="btn-ghost text-sm">Cancelar</button>
                </div>
              </div>
            </template>

            <!-- Influencer: registrar publicaciones -->
            <template v-if="!isEmpresa && contrato.status === 'pending_publication'">
              <p class="text-sm text-navy/60">Los entregables fueron aprobados. Publica el contenido en tus redes sociales y registra los enlaces.</p>
              <div class="space-y-2">
                <div v-for="(p, i) in pubLinks" :key="i" class="flex gap-2 items-center">
                  <select v-model="p.red_social" class="input w-32 text-sm shrink-0">
                    <option>TikTok</option><option>Instagram</option>
                    <option>YouTube</option><option>Twitter</option>
                    <option>Facebook</option>
                  </select>
                  <input v-model="p.url" class="input flex-1 text-sm" placeholder="https://..." />
                  <button @click="removePubLink(i)" v-if="pubLinks.length > 1" class="text-coral text-sm">✕</button>
                </div>
                <button @click="addPubLink" class="btn-ghost text-xs">+ Agregar otro enlace</button>
              </div>
              <button @click="registerPublications" :disabled="registeringPubs || !pubLinks.some(p => p.url.trim())"
                class="btn-primary text-sm">
                {{ registeringPubs ? 'Registrando…' : '📢 Registrar publicaciones' }}
              </button>
            </template>

            <!-- Empresa: revisar publicaciones -->
            <template v-if="isEmpresa && contrato.status === 'publication_review'">
              <p class="text-sm text-navy/60">El influencer publicó el contenido. Revisa los enlaces y confirma el cumplimiento.</p>
              <div class="flex gap-2 flex-wrap">
                <button @click="approve" :disabled="approving" class="btn-primary text-sm">
                  {{ approving ? 'Aprobando…' : '✅ Aprobar y liberar fondos' }}
                </button>
                <button @click="showNonCompliance = !showNonCompliance"
                  class="btn-ghost text-sm border-coral/30 text-coral">
                  🚫 Reportar incumplimiento
                </button>
              </div>
              <div v-if="showNonCompliance" class="border border-coral/30 rounded-lg p-4 space-y-3 bg-coral/5">
                <p class="text-sm font-semibold text-coral">Reportar incumplimiento</p>
                <textarea v-model="nonComplianceMotivo" class="input" rows="3"
                  placeholder="Describe el incumplimiento detectado…" />
                <div class="flex gap-2">
                  <button @click="reportNonCompliance" :disabled="reportingNC || !nonComplianceMotivo" class="btn-danger text-sm">
                    {{ reportingNC ? 'Reportando…' : 'Confirmar incumplimiento' }}
                  </button>
                  <button @click="showNonCompliance = false" class="btn-ghost text-sm">Cancelar</button>
                </div>
              </div>
            </template>

            <!-- Contrato completado -->
            <div v-if="contrato.status === 'completed'" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <p class="text-green-700 font-semibold">✅ Contrato completado exitosamente.</p>
              <p class="text-green-600 text-sm mt-1">El pago fue liberado al influencer.</p>
            </div>

          </div>
        </template>

        <!-- ═══ TAB AUDITORÍA ═══ -->
        <template v-if="activeTab === 'auditoría'">
          <div class="card space-y-1">
            <h2 class="font-semibold text-navy mb-3">Historial de auditoría</h2>
            <div v-if="!contractsStore.auditLog.length" class="text-navy/40 text-sm py-4 text-center">
              Sin registros aún.
            </div>
            <div v-for="entry in contractsStore.auditLog" :key="entry.id"
              class="flex gap-3 py-3 border-b border-navy/6 last:border-0">
              <div class="w-2 h-2 rounded-full bg-violet/40 mt-2 shrink-0"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-navy">{{ auditLabel(entry.action) }}</p>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span v-if="entry.previous_status && entry.new_status"
                    class="text-xs text-navy/40">
                    {{ STATUS_LABELS[entry.previous_status] ?? entry.previous_status }}
                    → {{ STATUS_LABELS[entry.new_status] ?? entry.new_status }}
                  </span>
                  <span class="text-xs text-navy/30">{{ formatDate(entry.created_at) }}</span>
                </div>
                <div v-if="entry.metadata && Object.keys(entry.metadata).length" class="mt-1">
                  <p v-if="entry.metadata.monto" class="text-xs text-navy/50">
                    Monto: ${{ entry.metadata.monto }} · Comisión: ${{ entry.metadata.comision }}
                  </p>
                  <p v-if="entry.metadata.feedback" class="text-xs text-navy/50 italic">
                    "{{ entry.metadata.feedback }}"
                  </p>
                  <p v-if="entry.metadata.count" class="text-xs text-navy/50">
                    {{ entry.metadata.count }} publicación(es) registrada(s)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>
    </template>

    <div v-else class="card text-center py-8 text-navy/40">Contrato no encontrado.</div>
  </AppLayout>
</template>
