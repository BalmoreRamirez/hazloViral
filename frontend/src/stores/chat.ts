import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatsApi } from '@/api/chats'
import { contractsApi } from '@/api/contracts'
import { connectSocket, getSocket } from '@/socket'
import { useCreditsStore } from './credits'

export interface ChatRoom {
  id: number; empresa_id: number; influencer_id: number; status: string; created_at: string
  empresa?: any; influencer?: any
}

export interface BriefSnapshot {
  id: number; titulo_campana: string; objetivo_principal: string | null
  tono_de_voz: string | null; puntos_clave_si: string | null
  restricciones_no: string | null; recursos_esteticos: string | null
}

export interface ChatMessage {
  id: number; chat_id: number; sender_id: number; message_text: string | null
  is_proposal: boolean; proposal_status: string | null; proposal_data: any
  contraoferta_data: { tarifa_propuesta: number; justificacion: string } | null
  contrato_id: number | null; created_at: string; read_at: string | null; sender?: any
  campaign_brief_id: number | null; campaignBrief: BriefSnapshot | null
}

function readKey() {
  try { return `hv_read_chats_${JSON.parse(localStorage.getItem('hv_user') ?? '{}').id ?? 0}` } catch { return 'hv_read_chats_0' }
}

function loadReadIds(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(readKey()) ?? '[]') as number[]) } catch { return new Set() }
}

function saveReadIds(ids: Set<number>) {
  localStorage.setItem(readKey(), JSON.stringify([...ids]))
}

export const useChatStore = defineStore('chat', () => {
  const chats           = ref<ChatRoom[]>([])
  const activeChat      = ref<ChatRoom | null>(null)
  const messages        = ref<ChatMessage[]>([])
  const isBlocked       = ref(false)
  const blockMessage    = ref('')
  const isCompleted     = ref(false)
  const socketConnected = ref(false)
  const loadingMessages = ref(false)
  const readIds         = ref<Set<number>>(loadReadIds())

  const creditsStore = useCreditsStore()

  function isRead(chatId: number) { return readIds.value.has(chatId) }

  function markRead(chatId: number) {
    readIds.value.add(chatId)
    saveReadIds(readIds.value)
  }

  async function loadChats() {
    chats.value = await chatsApi.list()
  }

  async function openChat(influencer_id: number) {
    const chat = await chatsApi.open(influencer_id)
    if (!chats.value.find((c) => c.id === chat.id)) chats.value.unshift(chat)
    return chat
  }

  async function enterChat(chat: ChatRoom) {
    activeChat.value  = chat
    isBlocked.value   = false
    isCompleted.value = chat.status === 'completed'
    markRead(chat.id)
    loadingMessages.value = true
    try {
      messages.value = await chatsApi.messages(chat.id)
      // Detectar contrato completado para chats que no tienen chat.status='completed' aún
      if (!isCompleted.value) {
        const funded = messages.value.find(m => m.proposal_status === 'funded' && m.contrato_id)
        if (funded) {
          const contrato = await contractsApi.get(funded.contrato_id!).catch(() => null)
          if (contrato?.status === 'completed') isCompleted.value = true
        }
      }
    } finally {
      loadingMessages.value = false
    }

    const socket = connectSocket()
    socketConnected.value = true

    // Evitar listeners duplicados
    socket
      .off('joined_chat').off('new_message').off('credit_status').off('chat_blocked')
      .off('contract_created').off('proposal_countered').off('proposal_rejected')
      .off('counter_resolved').off('contract_funded').off('messages_read')
      .off('contract_completed')

    socket.emit('join_chat', { chat_id: chat.id })

    socket.on('new_message', (msg: ChatMessage) => {
      if (msg.chat_id === activeChat.value?.id) messages.value.push(msg)
    })

    socket.on('messages_read', (data: { chat_id: number; ids: number[]; read_at: string }) => {
      if (data.chat_id !== activeChat.value?.id) return
      const idSet = new Set(data.ids)
      messages.value.forEach(m => {
        if (idSet.has(m.id)) m.read_at = data.read_at
      })
    })

    socket.on('credit_status', (data: any) => creditsStore.updateFromSocket(data))

    socket.on('chat_blocked', (data: any) => {
      isBlocked.value  = true
      blockMessage.value = data.message ?? 'Chat en solo lectura por saldo insuficiente.'
      creditsStore.updateFromSocket(data.balance ?? data)
    })

    socket.on('contract_created', (data: any) => {
      // Re-cargar mensajes para mostrar el mensaje de contrato creado
      chatsApi.messages(chat.id).then((msgs) => { messages.value = msgs })
      console.log('Contrato creado:', data)
    })

    // Contraoferta enviada por el influencer
    socket.on('proposal_countered', (data: { message: ChatMessage; original_message_id: number }) => {
      // Marcar la propuesta original como 'countered'
      const original = messages.value.find(m => m.id === data.original_message_id)
      if (original) original.proposal_status = 'countered'
      // Agregar el mensaje de contraoferta si no está ya en la lista
      if (!messages.value.find(m => m.id === data.message.id)) {
        messages.value.push(data.message)
      }
    })

    // Propuesta rechazada por el influencer
    socket.on('proposal_rejected', (data: { message_id: number }) => {
      const msg = messages.value.find(m => m.id === data.message_id)
      if (msg) msg.proposal_status = 'rejected'
    })

    // Empresa acepta o rechaza la contraoferta
    socket.on('counter_resolved', (data: { message_id: number; action: 'accepted' | 'rejected'; contrato?: any }) => {
      const msg = messages.value.find(m => m.id === data.message_id)
      if (msg) {
        msg.proposal_status = data.action === 'accepted' ? 'accepted' : 'counter_rejected'
        if (data.action === 'accepted' && data.contrato) {
          msg.contrato_id = data.contrato.id
        }
      }
    })

    // Empresa fonda el contrato → propuesta pasa a 'funded'
    socket.on('contract_funded', (data: { contrato_id: number; proposal_message_id: number | null }) => {
      if (data.proposal_message_id) {
        const msg = messages.value.find(m => m.id === data.proposal_message_id)
        if (msg) msg.proposal_status = 'funded'
      }
    })

    // Contrato finalizado → chat queda en solo lectura permanente
    socket.on('contract_completed', () => {
      isCompleted.value = true
      isBlocked.value   = false
    })
  }

  function sendMessage(text: string) {
    if (!activeChat.value) return
    const socket = getSocket()
    socket.emit('send_message', { chat_id: activeChat.value.id, message_text: text })
  }

  function sendProposal(proposal_data: { tarifa: number; entregables: any[]; plazo: string; contrato_pdf_url?: string }) {
    if (!activeChat.value) return
    const socket = getSocket()
    socket.emit('send_message', {
      chat_id: activeChat.value.id,
      is_proposal: true,
      proposal_data,
    })
  }

  function sendBrief(briefId: number) {
    if (!activeChat.value) return
    const socket = getSocket()
    socket.emit('send_message', {
      chat_id: activeChat.value.id,
      campaign_brief_id: briefId,
    })
  }

  function addMessage(msg: ChatMessage) {
    if (!messages.value.find(m => m.id === msg.id)) messages.value.push(msg)
  }

  function leaveChat() {
    activeChat.value  = null
    messages.value    = []
    isBlocked.value   = false
    isCompleted.value = false
  }

  return {
    chats, activeChat, messages, isBlocked, blockMessage, isCompleted,
    socketConnected, loadingMessages, readIds,
    isRead, markRead,
    loadChats, openChat, enterChat, sendMessage, sendProposal, sendBrief, addMessage, leaveChat,
  }
})
