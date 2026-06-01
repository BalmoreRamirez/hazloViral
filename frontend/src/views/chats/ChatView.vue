<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { useContractsStore } from '@/stores/contracts'
import type { ChatMessage } from '@/stores/chat'

const route          = useRoute()
const router         = useRouter()
const chatStore      = useChatStore()
const authStore      = useAuthStore()
const creditsStore   = useCreditsStore()
const contractsStore = useContractsStore()

const chatId      = Number(route.params.id)
const text        = ref('')
const msgEnd      = ref<HTMLDivElement | null>(null)
const showProposal = ref(false)
const propTarifa  = ref(500)
const propTipo    = ref('TikTok')
const propDesc    = ref('')
const propPlazo   = ref('')
const propLoading = ref(false)
const acceptLoading = ref<number | null>(null)

const isEmpresa   = computed(() => authStore.isEmpresa)
const isBlocked   = computed(() => chatStore.isBlocked)
const blockMsg    = computed(() => chatStore.blockMessage)
const messages    = computed(() => chatStore.messages)
const myId        = computed(() => authStore.user?.id)

onMounted(async () => {
  await chatStore.loadChats()
  const chat = chatStore.chats.find(c => c.id === chatId)
  if (!chat) { router.push('/chats'); return }
  await chatStore.enterChat(chat)
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

function sendProposal() {
  if (!propTarifa.value || !propDesc.value || !propPlazo.value) return
  propLoading.value = true
  chatStore.sendProposal({
    tarifa: propTarifa.value,
    entregables: [{ tipo: propTipo.value, descripcion: propDesc.value }],
    plazo: propPlazo.value,
  })
  showProposal.value = false
  propLoading.value  = false
  propDesc.value = ''
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

function isMine(msg: ChatMessage) { return msg.sender_id === myId.value }

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
          <button @click="router.push('/chats')" class="text-navy/40 hover:text-navy">←</button>
          <div>
            <p class="font-display font-semibold text-navy">Chat #{{ chatId }}</p>
            <p class="text-xs text-navy/40">{{ chatStore.activeChat?.status }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="isBlocked" class="badge-warning">Solo lectura</span>
          <span v-else class="badge-active">Activo</span>
        </div>
      </div>

      <!-- Alerta saldo bajo -->
      <div v-if="isBlocked" class="bg-coral/10 border border-coral/20 rounded-lg p-3 mb-3 text-sm text-coral">
        ⚠️ {{ blockMsg }}
        <button v-if="isEmpresa"
          @click="creditsStore.recharge(10)"
          :disabled="creditsStore.recharging"
          class="ml-2 underline font-semibold disabled:opacity-50">
          {{ creditsStore.recharging ? 'Procesando…' : 'Recargar $10' }}
        </button>
        <span v-if="creditsStore.rechargeError" class="block mt-1 text-xs">
          {{ creditsStore.rechargeError }}
        </span>
      </div>

      <!-- Mensajes -->
      <div class="flex-1 overflow-y-auto space-y-3 pr-2 pb-2">
        <div v-if="chatStore.loadingMessages" class="text-center text-navy/40 py-8">Cargando…</div>

        <template v-for="msg in messages" :key="msg.id">
          <!-- Propuesta -->
          <div v-if="msg.is_proposal" class="flex justify-center">
            <div class="card max-w-sm w-full border-violet/30 bg-violet/5">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-violet">📋</span>
                <p class="font-display font-semibold text-violet text-sm">Propuesta de contrato</p>
                <span :class="{
                  'badge-muted': msg.proposal_status === 'pending',
                  'badge-active': msg.proposal_status === 'accepted',
                  'badge-info': msg.proposal_status === 'funded',
                }" class="ml-auto">{{ msg.proposal_status }}</span>
              </div>
              <div v-if="msg.proposal_data" class="text-sm space-y-1 text-navy/70">
                <p>💰 <strong>${{ msg.proposal_data.tarifa }}</strong> USD</p>
                <p>📦 {{ msg.proposal_data.entregables?.[0]?.tipo }}: {{ msg.proposal_data.entregables?.[0]?.descripcion }}</p>
                <p>📅 Plazo: {{ msg.proposal_data.plazo }}</p>
              </div>
              <button
                v-if="!isEmpresa && msg.proposal_status === 'pending'"
                @click="acceptProposal(msg)"
                :disabled="acceptLoading === msg.id"
                class="btn-primary text-sm mt-3 w-full">
                {{ acceptLoading === msg.id ? 'Aceptando…' : 'Aceptar propuesta ✓' }}
              </button>
              <p v-if="msg.contrato_id" class="text-xs text-violet mt-2 text-center">
                <RouterLink :to="`/contratos/${msg.contrato_id}`" class="underline">Ver contrato #{{ msg.contrato_id }} →</RouterLink>
              </p>
            </div>
          </div>

          <!-- Mensaje normal -->
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
            <input v-model.number="propTarifa" type="number" min="1" class="input" />
          </div>
          <div>
            <label class="label">Tipo de entregable</label>
            <select v-model="propTipo" class="input">
              <option>TikTok</option><option>Instagram</option>
              <option>YouTube</option><option>Twitter</option>
            </select>
          </div>
        </div>
        <div>
          <label class="label">Descripción del entregable</label>
          <input v-model="propDesc" class="input" placeholder="1 video de 60s…" />
        </div>
        <div>
          <label class="label">Fecha límite</label>
          <input v-model="propPlazo" type="date" class="input" />
        </div>
        <div class="flex gap-2">
          <button @click="sendProposal" :disabled="propLoading" class="btn-primary text-sm">Enviar propuesta</button>
          <button @click="showProposal = false" class="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>

      <!-- Input de mensaje -->
      <div class="card py-3">
        <div class="flex gap-2">
          <button v-if="isEmpresa && !isBlocked" @click="showProposal = !showProposal"
            class="btn-ghost text-sm px-3" title="Enviar propuesta">📋</button>
          <input
            v-model="text"
            @keyup.enter="send"
            :disabled="isBlocked"
            :placeholder="isBlocked ? 'Chat en solo lectura — recarga créditos' : 'Escribe un mensaje…'"
            class="input flex-1"
          />
          <button @click="send" :disabled="!text.trim() || isBlocked" class="btn-primary px-4">→</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
