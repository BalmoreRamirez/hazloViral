<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useContractsStore } from '@/stores/contracts'
import { useAuthStore } from '@/stores/auth'
import { connectSocket } from '@/socket'

const route          = useRoute()
const router         = useRouter()
const contractsStore = useContractsStore()
const authStore      = useAuthStore()

const contratoId = Number(route.params.id)
const contrato   = computed(() => contractsStore.current)
const isEmpresa  = computed(() => authStore.isEmpresa)

// Formulario entregables
const evUrl  = ref(''); const evTipo = ref('TikTok'); const evDesc = ref('')
const submitting   = ref(false)
const approving    = ref(false)
const disputing    = ref(false)
const motivoDisputa = ref('')
const showDispute  = ref(false)

onMounted(async () => {
  await contractsStore.fetchContract(contratoId)
  // Escuchar eventos de contrato via WebSocket
  const s = connectSocket()
  s.on('contract_funded',       () => contractsStore.fetchContract(contratoId))
  s.on('contract_under_review', () => contractsStore.fetchContract(contratoId))
  s.on('contract_completed',    () => contractsStore.fetchContract(contratoId))
  s.on('contract_disputed',     () => contractsStore.fetchContract(contratoId))
})

async function fund() {
  if (!contrato.value) return
  await contractsStore.fundViaStripe(contrato.value.id)
}

async function submitDeliverables() {
  if (!contrato.value || !evUrl.value) return
  submitting.value = true
  try {
    await contractsStore.submitDeliverables(contrato.value.id, [
      { tipo: evTipo.value, descripcion: evDesc.value, url: evUrl.value },
    ])
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Error')
  } finally { submitting.value = false }
}

async function approve() {
  if (!contrato.value) return
  approving.value = true
  try { await contractsStore.approve(contrato.value.id) }
  catch (e: any) { alert(e.response?.data?.message ?? 'Error') }
  finally { approving.value = false }
}

async function dispute() {
  if (!contrato.value || !motivoDisputa.value) return
  disputing.value = true
  try {
    await contractsStore.dispute(contrato.value.id, motivoDisputa.value)
    showDispute.value = false
  } catch (e: any) { alert(e.response?.data?.message ?? 'Error') }
  finally { disputing.value = false }
}

const STATUS_STEPS = [
  { key: 'pending_payment',  label: 'Pago pendiente',  icon: '⏳' },
  { key: 'funded_in_escrow', label: 'En custodia',     icon: '🔒' },
  { key: 'under_review',     label: 'En revisión',     icon: '🔍' },
  { key: 'completed',        label: 'Completado',      icon: '✅' },
]
const ORDER = ['pending_payment','funded_in_escrow','under_review','completed','in_dispute']

function stepState(step: string, current: string) {
  if (current === 'in_dispute') return step === 'in_dispute' ? 'active' : 'past'
  const ci = ORDER.indexOf(current)
  const si = ORDER.indexOf(step)
  if (si < ci) return 'past'
  if (si === ci) return 'active'
  return 'future'
}
</script>

<template>
  <AppLayout>
    <div v-if="contractsStore.loading" class="text-center py-16 text-navy/40">Cargando…</div>

    <template v-else-if="contrato">
      <div class="space-y-5">
        <!-- Header -->
        <div class="flex items-center gap-3">
          <button @click="router.push('/contratos')" class="text-navy/40 hover:text-navy text-lg">←</button>
          <div>
            <h1 class="text-2xl font-display font-bold text-navy">Contrato #{{ contrato.id }}</h1>
            <p class="text-xs text-navy/40">Chat #{{ contrato.chat_id }}</p>
          </div>
        </div>

        <!-- Timeline de estados -->
        <div class="card">
          <h2 class="font-semibold text-navy mb-4">Estado del contrato</h2>
          <div v-if="contrato.status === 'in_dispute'" class="bg-coral/10 border border-coral/20 rounded-lg p-4 text-coral">
            ⚠️ Contrato en disputa — un administrador revisará el caso.
          </div>
          <div v-else class="flex items-center gap-0">
            <template v-for="(step, i) in STATUS_STEPS" :key="step.key">
              <div class="flex flex-col items-center flex-1">
                <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-base font-semibold border-2 transition-all', {
                  'bg-violet border-violet text-white shadow-md': stepState(step.key, contrato.status) === 'active',
                  'bg-green-500 border-green-500 text-white': stepState(step.key, contrato.status) === 'past',
                  'bg-white border-navy/20 text-navy/30': stepState(step.key, contrato.status) === 'future',
                }]">{{ step.icon }}</div>
                <p class="text-xs mt-1.5 text-center font-medium" :class="{
                  'text-violet': stepState(step.key, contrato.status) === 'active',
                  'text-green-600': stepState(step.key, contrato.status) === 'past',
                  'text-navy/30': stepState(step.key, contrato.status) === 'future',
                }">{{ step.label }}</p>
              </div>
              <div v-if="i < STATUS_STEPS.length - 1" class="flex-1 h-0.5 mb-5 -mx-1" :class="{
                'bg-green-400': ORDER.indexOf(step.key) < ORDER.indexOf(contrato.status),
                'bg-navy/15': true,
              }" />
            </template>
          </div>
        </div>

        <!-- Detalles -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="card space-y-2">
            <h2 class="font-semibold text-navy">Detalles económicos</h2>
            <div class="text-sm space-y-1">
              <div class="flex justify-between"><span class="text-navy/50">Monto total</span><strong>${{ contrato.monto_total }} USD</strong></div>
              <div class="flex justify-between"><span class="text-navy/50">Comisión plataforma</span><span>${{ contrato.comision_plataforma }} USD</span></div>
              <div class="flex justify-between border-t border-navy/10 pt-1 mt-1">
                <span class="text-navy/50">Neto al influencer</span>
                <strong class="text-green-600">${{ (Number(contrato.monto_total) - Number(contrato.comision_plataforma)).toFixed(2) }} USD</strong>
              </div>
            </div>
          </div>
          <div class="card space-y-2">
            <h2 class="font-semibold text-navy">Entregables</h2>
            <div v-for="(e, i) in contrato.entregables" :key="i" class="text-sm">
              <p class="font-medium">{{ e.tipo }}</p>
              <p class="text-navy/50">{{ e.descripcion }}</p>
              <a v-if="e.url" :href="e.url" target="_blank" class="text-violet text-xs underline">Ver evidencia →</a>
            </div>
            <p class="text-xs text-navy/40">📅 Límite: {{ contrato.fecha_limite_entrega }}</p>
          </div>
        </div>

        <!-- Acciones por estado y rol -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-navy">Acciones disponibles</h2>

          <!-- Empresa: fondear -->
          <template v-if="isEmpresa && contrato.status === 'pending_payment'">
            <p class="text-sm text-navy/60">El influencer aceptó tu propuesta. Fonda el contrato para que pueda empezar a trabajar.</p>
            <button @click="fund" class="btn-primary">🔒 Fondear contrato en custodia (Stripe)</button>
          </template>

          <!-- Influencer: subir entregables -->
          <template v-if="!isEmpresa && contrato.status === 'funded_in_escrow'">
            <p class="text-sm text-navy/60">El pago está asegurado en custodia. Sube tus entregables cuando estén listos.</p>
            <div class="space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="label">Tipo</label>
                  <select v-model="evTipo" class="input">
                    <option>TikTok</option><option>Instagram</option>
                    <option>YouTube</option><option>Twitter</option>
                  </select>
                </div>
                <div>
                  <label class="label">URL de la publicación</label>
                  <input v-model="evUrl" class="input" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label class="label">Descripción</label>
                <input v-model="evDesc" class="input" placeholder="Video publicado el…" />
              </div>
              <button @click="submitDeliverables" :disabled="submitting" class="btn-primary text-sm">
                {{ submitting ? 'Enviando…' : '📤 Enviar entregables' }}
              </button>
            </div>
          </template>

          <!-- Empresa: aprobar -->
          <template v-if="isEmpresa && contrato.status === 'under_review'">
            <p class="text-sm text-navy/60">El influencer entregó el trabajo. Revisa y aprueba para liberar el pago.</p>
            <div class="flex gap-2">
              <button @click="approve" :disabled="approving" class="btn-primary">
                {{ approving ? 'Aprobando…' : '✅ Aprobar y liberar pago' }}
              </button>
              <button @click="showDispute = true" class="btn-danger text-sm">⚠️ Disputar</button>
            </div>
          </template>

          <!-- Disputa disponible para ambos -->
          <template v-if="['funded_in_escrow','under_review'].includes(contrato.status)">
            <button v-if="!showDispute && (isEmpresa ? contrato.status !== 'under_review' : true)"
              @click="showDispute = true" class="btn-ghost text-sm text-coral border-coral/30">
              ⚠️ Iniciar disputa
            </button>
          </template>

          <div v-if="showDispute" class="border border-coral/30 rounded-lg p-4 space-y-3">
            <p class="text-sm font-semibold text-coral">Iniciar disputa</p>
            <textarea v-model="motivoDisputa" class="input" rows="3" placeholder="Describe el motivo de la disputa…" />
            <div class="flex gap-2">
              <button @click="dispute" :disabled="disputing || !motivoDisputa" class="btn-danger text-sm">
                {{ disputing ? 'Enviando…' : 'Confirmar disputa' }}
              </button>
              <button @click="showDispute = false" class="btn-ghost text-sm">Cancelar</button>
            </div>
          </div>

          <!-- Contrato completado -->
          <div v-if="contrato.status === 'completed'" class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-green-700 font-semibold">✅ Contrato completado exitosamente.</p>
            <p class="text-green-600 text-sm mt-1">El pago fue liberado al influencer.</p>
            <p v-if="contrato.stripe_transfer_id" class="text-xs text-green-500 mt-1">
              Transfer ID: {{ contrato.stripe_transfer_id }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="card text-center py-8 text-navy/40">Contrato no encontrado.</div>
  </AppLayout>
</template>
