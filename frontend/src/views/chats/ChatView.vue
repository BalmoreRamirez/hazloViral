<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { useContractsStore } from '@/stores/contracts'
import { useProfileStore } from '@/stores/profile'
import type { ChatMessage } from '@/stores/chat'
import { uploadContratoPdf } from '@/api/chats'

const route          = useRoute()
const router         = useRouter()
const chatStore      = useChatStore()
const authStore      = useAuthStore()
const creditsStore   = useCreditsStore()
const contractsStore = useContractsStore()
const profileStore   = useProfileStore()

const chatId      = Number(route.params.id)
const text        = ref('')
const msgEnd      = ref<HTMLDivElement | null>(null)

// Proposal form
const showProposal  = ref(false)
const propTarifa    = ref(500)
const propTipo      = ref('TikTok')
const propDesc      = ref('')
const propPlazo     = ref('')
const propPdfFile   = ref<File | null>(null)
const propPdfError  = ref('')
const propLoading   = ref(false)

// Accept / reject / counter state
const acceptLoading  = ref<number | null>(null)
const rejectLoading  = ref<number | null>(null)
const counterMsgId   = ref<number | null>(null)   // which msg has the counter panel open
const counterTarifa  = ref(0)
const counterJust    = ref('')
const counterLoading = ref(false)

// Resolve counter (empresa)
const resolveLoading = ref<number | null>(null)

// Brief picker
const showBriefPicker = ref(false)

const isEmpresa   = computed(() => authStore.isEmpresa)
const isBlocked   = computed(() => chatStore.isBlocked)
const blockMsg    = computed(() => chatStore.blockMessage)
const messages    = computed(() => chatStore.messages)
const myId        = computed(() => authStore.user?.id)

const counterpart = computed(() => {
  const chat = chatStore.activeChat
  if (!chat) return null
  if (isEmpresa.value) {
    const inf = chat.influencer
    return inf ? {
      name: inf.nombre_artistico ?? 'Influencer',
      sub:  inf.ubicacion ?? '',
      initials: (inf.nombre_artistico?.[0] ?? 'I').toUpperCase(),
    } : null
  } else {
    const emp = chat.empresa
    return emp ? {
      name: emp.nombre_comercial ?? 'Empresa',
      sub:  emp.sitio_web ?? '',
      initials: (emp.nombre_comercial?.[0] ?? 'E').toUpperCase(),
    } : null
  }
})

onMounted(async () => {
  await chatStore.loadChats()
  const chat = chatStore.chats.find(c => c.id === chatId)
  if (!chat) { router.push('/chats'); return }
  await chatStore.enterChat(chat)
  if (isEmpresa.value) await profileStore.loadBriefs()
  scrollToBottom()
})

onUnmounted(() => chatStore.leaveChat())

watch(messages, () => nextTick(scrollToBottom), { deep: true })

function scrollToBottom() {
  msgEnd.value?.scrollIntoView({ behavior: 'smooth' })
}

function send() {
  if (!text.value.trim() || isBlocked.value) return
  chatStore.sendMessage(text.value.trim())
  text.value = ''
}

function onPdfChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  propPdfError.value = ''
  if (file && file.type !== 'application/pdf') {
    propPdfError.value = 'Solo se aceptan archivos PDF'
    propPdfFile.value = null; return
  }
  if (file && file.size > 10 * 1024 * 1024) {
    propPdfError.value = 'El archivo no puede superar 10 MB'
    propPdfFile.value = null; return
  }
  propPdfFile.value = file
}

async function sendProposal() {
  if (!propTarifa.value || !propDesc.value || !propPlazo.value) return
  propLoading.value = true
  try {
    let pdfUrl: string | undefined
    if (propPdfFile.value) pdfUrl = await uploadContratoPdf(propPdfFile.value)
    chatStore.sendProposal({
      tarifa: propTarifa.value,
      entregables: [{ tipo: propTipo.value, descripcion: propDesc.value }],
      plazo: propPlazo.value,
      ...(pdfUrl ? { contrato_pdf_url: pdfUrl } : {}),
    })
    showProposal.value = false
    propDesc.value = ''
    propPdfFile.value = null
  } catch {
    propPdfError.value = 'Error al subir el PDF. Intenta de nuevo.'
  } finally {
    propLoading.value = false
  }
}

async function acceptProposal(msg: ChatMessage) {
  acceptLoading.value = msg.id
  try {
    await contractsStore.acceptProposal(msg.id)
    router.push('/contratos')
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Error al aceptar propuesta.')
  } finally {
    acceptLoading.value = null
  }
}

async function rejectProposal(msg: ChatMessage) {
  rejectLoading.value = msg.id
  try {
    await contractsStore.rejectProposal(msg.id)
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Error al rechazar propuesta.')
  } finally {
    rejectLoading.value = null
  }
}

function openCounter(msg: ChatMessage) {
  counterMsgId.value = msg.id
  counterTarifa.value = msg.proposal_data?.tarifa ?? 0
  counterJust.value = ''
}

async function sendCounter(msg: ChatMessage) {
  if (!counterTarifa.value || !counterJust.value) return
  counterLoading.value = true
  try {
    const counter = await contractsStore.counterProposal(msg.id, counterTarifa.value, counterJust.value)
    // Optimistic: añadir contraoferta y marcar original inmediatamente,
    // sin esperar al evento WS (el store de chat deduplica si el WS llega después)
    if (counter) {
      msg.proposal_status = 'countered'
      chatStore.addMessage(counter as any)
    }
    counterMsgId.value = null
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Error al enviar contraoferta.')
  } finally {
    counterLoading.value = false
  }
}

async function resolveCounter(msg: ChatMessage, action: 'accept' | 'reject') {
  resolveLoading.value = msg.id
  try {
    await contractsStore.resolveCounter(msg.id, action)
    if (action === 'accept') router.push('/contratos')
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Error al resolver contraoferta.')
  } finally {
    resolveLoading.value = null
  }
}

function isMine(msg: ChatMessage) { return msg.sender_id === myId.value }

function pickBrief(briefId: number) {
  chatStore.sendBrief(briefId)
  showBriefPicker.value = false
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  rejected: 'Rechazada',
  countered: 'Contraoferta enviada',
  counter_rejected: 'Contraoferta rechazada',
  accepted: 'Aceptada',
  funded: 'En custodia',
}

function statusLabel(s: string) { return STATUS_LABELS[s] ?? s }

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-[calc(100vh-10rem)]">
      <!-- Header del chat -->
      <div class="card mb-3 flex items-center justify-between py-3">
        <div class="flex items-center gap-3">
          <button @click="router.push('/chats')" class="text-navy/40 hover:text-navy text-lg leading-none">←</button>
          <template v-if="counterpart">
            <div class="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center text-base font-bold text-violet shrink-0">
              {{ counterpart.initials }}
            </div>
            <div class="min-w-0">
              <p class="font-display font-semibold text-navy leading-tight">{{ counterpart.name }}</p>
              <span v-if="counterpart.sub" class="text-xs text-navy/40">{{ counterpart.sub }}</span>
            </div>
          </template>
          <p v-else class="font-display font-semibold text-navy">Chat</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span v-if="isBlocked" class="badge-warning">Solo lectura</span>
          <span v-else class="badge-active">Activo</span>
        </div>
      </div>

      <!-- Alerta saldo bajo -->
      <div v-if="isBlocked" class="bg-coral/10 border border-coral/20 rounded-lg p-3 mb-3 text-sm text-coral">
        ⚠️ {{ blockMsg }}
        <button v-if="isEmpresa" @click="creditsStore.recharge(10)" :disabled="creditsStore.recharging"
          class="ml-2 underline font-semibold disabled:opacity-50">
          {{ creditsStore.recharging ? 'Procesando…' : 'Recargar $10' }}
        </button>
      </div>

      <!-- Mensajes -->
      <div class="flex-1 overflow-y-auto space-y-3 pr-2 pb-2">
        <div v-if="chatStore.loadingMessages" class="text-center text-navy/40 py-8">Cargando…</div>

        <template v-for="msg in messages" :key="msg.id">

          <!-- ── Tarjeta de propuesta / contraoferta ── -->
          <div v-if="msg.is_proposal" class="flex justify-center">
            <div class="card max-w-sm w-full border-violet/30 bg-violet/5 space-y-2">

              <!-- Cabecera -->
              <div class="flex items-center gap-2">
                <span class="text-violet">{{ msg.contraoferta_data ? '↔️' : '📋' }}</span>
                <p class="font-display font-semibold text-violet text-sm">
                  {{ msg.contraoferta_data ? 'Contraoferta del influencer' : 'Propuesta de contrato' }}
                </p>
                <span class="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" :class="{
                  'bg-amber-100 text-amber-700': msg.proposal_status === 'pending',
                  'bg-red-100 text-red-700':    ['rejected','counter_rejected'].includes(msg.proposal_status ?? ''),
                  'bg-blue-100 text-blue-700':   msg.proposal_status === 'countered',
                  'bg-green-100 text-green-700': msg.proposal_status === 'accepted',
                  'bg-violet/10 text-violet':    msg.proposal_status === 'funded',
                }">{{ statusLabel(msg.proposal_status ?? '') }}</span>
              </div>

              <!-- Datos -->
              <div class="text-sm space-y-1 text-navy/70">
                <p>💰 <strong>${{ msg.contraoferta_data?.tarifa_propuesta ?? msg.proposal_data?.tarifa }}</strong> USD</p>
                <p v-if="msg.contraoferta_data?.justificacion" class="italic text-navy/60">
                  "{{ msg.contraoferta_data.justificacion }}"
                </p>
                <template v-else-if="msg.proposal_data">
                  <p>📦 {{ msg.proposal_data.entregables?.[0]?.tipo }}: {{ msg.proposal_data.entregables?.[0]?.descripcion }}</p>
                  <p>📅 Plazo: {{ msg.proposal_data.plazo }}</p>
                  <a v-if="msg.proposal_data.contrato_pdf_url" :href="msg.proposal_data.contrato_pdf_url" target="_blank"
                    class="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-violet/10 text-violet text-xs font-medium hover:bg-violet/20 transition-colors">
                    📄 Ver contrato PDF
                  </a>
                </template>
              </div>

              <!-- Acciones — Influencer sobre propuesta normal (pending, sin contraoferta_data) -->
              <template v-if="!isEmpresa && msg.proposal_status === 'pending' && !msg.contraoferta_data">
                <div v-if="counterMsgId !== msg.id" class="flex gap-2 pt-1">
                  <button @click="acceptProposal(msg)" :disabled="acceptLoading === msg.id"
                    class="btn-primary text-xs flex-1">
                    {{ acceptLoading === msg.id ? 'Aceptando…' : '✓ Aceptar' }}
                  </button>
                  <button @click="openCounter(msg)"
                    class="btn-ghost text-xs flex-1 border-violet/30 text-violet">
                    ↔ Contraoferta
                  </button>
                  <button @click="rejectProposal(msg)" :disabled="rejectLoading === msg.id"
                    class="btn-ghost text-xs flex-1 border-coral/30 text-coral">
                    {{ rejectLoading === msg.id ? '…' : '✕ Rechazar' }}
                  </button>
                </div>

                <!-- Panel de contraoferta -->
                <div v-else class="border border-violet/20 rounded-lg p-3 space-y-2 bg-white">
                  <p class="text-xs font-semibold text-violet">Tu contraoferta</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="label">Nueva tarifa (USD)</label>
                      <input v-model.number="counterTarifa" type="number" min="1" class="input text-sm" />
                    </div>
                    <div>
                      <label class="label">Justificación</label>
                      <input v-model="counterJust" class="input text-sm" placeholder="Motivo…" />
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button @click="sendCounter(msg)" :disabled="counterLoading || !counterTarifa || !counterJust"
                      class="btn-primary text-xs">
                      {{ counterLoading ? 'Enviando…' : 'Enviar contraoferta' }}
                    </button>
                    <button @click="counterMsgId = null" class="btn-ghost text-xs">Cancelar</button>
                  </div>
                </div>
              </template>

              <!-- Acciones — Empresa sobre contraoferta (pending + contraoferta_data) -->
              <template v-if="isEmpresa && msg.proposal_status === 'pending' && msg.contraoferta_data">
                <div class="flex gap-2 pt-1">
                  <button @click="resolveCounter(msg, 'accept')" :disabled="resolveLoading === msg.id"
                    class="btn-primary text-xs flex-1">
                    {{ resolveLoading === msg.id ? '…' : '✓ Aceptar contraoferta' }}
                  </button>
                  <button @click="resolveCounter(msg, 'reject')" :disabled="resolveLoading === msg.id"
                    class="btn-ghost text-xs flex-1 border-coral/30 text-coral">
                    {{ resolveLoading === msg.id ? '…' : '✕ Rechazar' }}
                  </button>
                </div>
              </template>

              <!-- Link al contrato generado -->
              <p v-if="msg.contrato_id" class="text-xs text-violet text-center pt-1">
                <RouterLink :to="`/contratos/${msg.contrato_id}`" class="underline">Ver contrato →</RouterLink>
              </p>
            </div>
          </div>

          <!-- ── Tarjeta de brief ── -->
          <div v-else-if="msg.campaignBrief" class="flex justify-center">
            <div class="card max-w-sm w-full border-amber-200 bg-amber-50 space-y-2">
              <div class="flex items-center gap-2">
                <span>📋</span>
                <p class="font-display font-semibold text-amber-800 text-sm">Brief de campaña</p>
                <span class="ml-auto text-xs text-amber-600">{{ formatTime(msg.created_at) }}</span>
              </div>
              <p class="font-semibold text-navy text-sm">{{ msg.campaignBrief.titulo_campana }}</p>
              <div class="text-xs space-y-1 text-navy/70">
                <p v-if="msg.campaignBrief.objetivo_principal">
                  <span class="font-medium text-navy/50 uppercase tracking-wide">Objetivo:</span>
                  {{ msg.campaignBrief.objetivo_principal }}
                </p>
                <p v-if="msg.campaignBrief.tono_de_voz">
                  <span class="font-medium text-navy/50 uppercase tracking-wide">Tono:</span>
                  {{ msg.campaignBrief.tono_de_voz }}
                </p>
                <p v-if="msg.campaignBrief.puntos_clave_si">
                  <span class="font-medium text-green-700 uppercase tracking-wide">✅ Incluir:</span>
                  {{ msg.campaignBrief.puntos_clave_si }}
                </p>
                <p v-if="msg.campaignBrief.restricciones_no">
                  <span class="font-medium text-coral uppercase tracking-wide">🚫 Evitar:</span>
                  {{ msg.campaignBrief.restricciones_no }}
                </p>
                <p v-if="msg.campaignBrief.recursos_esteticos">
                  <span class="font-medium text-navy/50 uppercase tracking-wide">🎨 Recursos:</span>
                  {{ msg.campaignBrief.recursos_esteticos }}
                </p>
              </div>
            </div>
          </div>

          <!-- ── Mensaje normal ── -->
          <div v-else :class="['flex', isMine(msg) ? 'justify-end' : 'justify-start']">
            <div :class="['max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm', isMine(msg)
              ? 'bg-violet text-white rounded-br-sm'
              : 'bg-white text-navy border border-navy/10 rounded-bl-sm']">
              <p>{{ msg.message_text }}</p>
              <p :class="['text-xs mt-1', isMine(msg) ? 'text-white/60' : 'text-navy/40']">
                {{ formatTime(msg.created_at) }}
              </p>
            </div>
          </div>
        </template>

        <div ref="msgEnd" />
      </div>

      <!-- Formulario de propuesta -->
      <div v-if="showProposal && isEmpresa" class="card mb-3 space-y-3">
        <p class="font-semibold text-navy text-sm">Nueva propuesta de contrato</p>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label">Tarifa (USD)</label>
            <input v-model.number="propTarifa" type="number" min="1" class="input" required />
          </div>
          <div>
            <label class="label">Tipo de entregable</label>
            <select v-model="propTipo" class="input" required>
              <option>TikTok</option><option>Instagram</option>
              <option>YouTube</option><option>Twitter</option>
            </select>
          </div>
        </div>
        <div>
          <label class="label">Descripción del entregable</label>
          <textarea v-model="propDesc" class="input" rows="3"
            placeholder="Describe el contenido esperado, formato, menciones requeridas…" required />
        </div>
        <div>
          <label class="label">Fecha límite</label>
          <input v-model="propPlazo" type="date" class="input" required />
        </div>
        <div>
          <label class="label">Contrato PDF <span class="text-navy/40 font-normal">(opcional, máx. 10 MB)</span></label>
          <label class="flex items-center gap-3 cursor-pointer group">
            <div :class="['flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
              propPdfFile ? 'border-violet/50 bg-violet/5 text-violet' : 'border-navy/20 bg-white text-navy/50 group-hover:border-violet/40']">
              <span>📎</span>
              <span class="truncate max-w-[200px]">{{ propPdfFile ? propPdfFile.name : 'Adjuntar PDF…' }}</span>
              <button v-if="propPdfFile" type="button" @click.prevent="propPdfFile = null"
                class="ml-1 text-navy/40 hover:text-coral text-xs">✕</button>
            </div>
            <input type="file" accept="application/pdf" class="hidden" @change="onPdfChange" />
          </label>
          <p v-if="propPdfError" class="text-coral text-xs mt-1">{{ propPdfError }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="sendProposal" :disabled="propLoading" class="btn-primary text-sm">
            {{ propLoading ? 'Enviando…' : 'Enviar propuesta' }}
          </button>
          <button @click="showProposal = false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>

      <!-- Selector de briefs -->
      <div v-if="showBriefPicker && isEmpresa" class="card mb-2 space-y-2">
        <p class="font-semibold text-navy text-sm flex items-center gap-2">
          📋 Enviar brief de campaña
          <button @click="showBriefPicker = false" class="ml-auto text-navy/40 hover:text-navy text-xs">✕</button>
        </p>
        <div v-if="!profileStore.briefs.length" class="text-navy/40 text-sm text-center py-3">
          No tienes briefs creados.
          <RouterLink to="/perfil/empresa" class="text-violet underline ml-1">Crear uno →</RouterLink>
        </div>
        <div v-else class="divide-y divide-navy/5 max-h-48 overflow-y-auto">
          <button v-for="b in profileStore.briefs" :key="b.id"
            @click="pickBrief(b.id)"
            class="w-full text-left px-2 py-2.5 hover:bg-violet/5 rounded-lg transition-colors">
            <p class="text-sm font-medium text-navy">{{ b.titulo_campana }}</p>
            <p v-if="b.objetivo_principal" class="text-xs text-navy/50 truncate mt-0.5">
              {{ b.objetivo_principal }}
            </p>
          </button>
        </div>
      </div>

      <!-- Input de mensaje -->
      <div class="card py-3">
        <div class="flex gap-2">
          <button v-if="isEmpresa && !isBlocked" @click="showProposal = !showProposal; showBriefPicker = false"
            class="btn-ghost text-sm px-3" title="Enviar propuesta">📝</button>
          <button v-if="isEmpresa && !isBlocked" @click="showBriefPicker = !showBriefPicker; showProposal = false"
            class="btn-ghost text-sm px-3" title="Enviar brief">📋</button>
          <input v-model="text" @keyup.enter="send" :disabled="isBlocked"
            :placeholder="isBlocked ? 'Chat en solo lectura — recarga créditos' : 'Escribe un mensaje…'"
            class="input flex-1" />
          <button @click="send" :disabled="!text.trim() || isBlocked" class="btn-primary px-4">→</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
