import { ref, onMounted, onUnmounted, watch } from 'vue'
import { chatsApi } from '@/api/chats'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { connectSocket } from '@/socket'

/** El servidor es la fuente del contador; nunca se cuentan mensajes propios. */
export function useUnreadMessages() {
  const unreadCount = ref(0)
  const auth = useAuthStore()
  const chat = useChatStore()
  let timer: ReturnType<typeof setInterval> | undefined
  let socket: ReturnType<typeof connectSocket> | undefined
  let disposed = false
  let refreshing = false
  let pending = false

  async function refresh() {
    if (disposed || !['empresa', 'influencer'].includes(auth.user?.role ?? '')) return
    if (refreshing) { pending = true; return }
    refreshing = true
    try {
      // Leer únicamente si el usuario está viendo la conversación en una pestaña visible.
      if (chat.activeChat && !chat.loadingMessages && document.visibilityState === 'visible') {
        const result = await chatsApi.markRead(chat.activeChat.id)
        const ids = new Set<number>(result.ids)
        chat.messages.forEach(message => { if (ids.has(message.id)) message.read_at = result.read_at })
      }
      const result = await chatsApi.unreadCount()
      if (!disposed) unreadCount.value = result.count
    } catch {
      // Conservar el último contador durante fallos temporales de conexión.
    } finally {
      refreshing = false
      if (pending) { pending = false; void refresh() }
    }
  }
  watch(() => [chat.activeChat?.id, chat.loadingMessages], () => { void refresh() }, { flush: 'post' })
  function onVisibility() { if (document.visibilityState === 'visible') void refresh() }
  onMounted(() => {
    if (!['empresa', 'influencer'].includes(auth.user?.role ?? '')) return
    socket = connectSocket()
    socket.on('unread_changed', refresh)
    socket.on('connect', refresh)
    void refresh()
    // Reconcilia lecturas en otros dispositivos y mensajes de otros flujos.
    timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 15000)
    document.addEventListener('visibilitychange', onVisibility)
  })
  onUnmounted(() => {
    disposed = true
    clearInterval(timer)
    socket?.off('unread_changed', refresh)
    socket?.off('connect', refresh)
    document.removeEventListener('visibilitychange', onVisibility)
  })
  return { unreadCount }
}
