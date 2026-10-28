<script setup lang="ts">
import { viewPath } from '@/router/paths'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { formatDate } from '@/utils/date'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { influencerApi, type InfluencerChatSuggestion } from '@/api/profiles'

const router    = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()

const usernameInput = ref('')
const openError     = ref('')
const opening       = ref(false)
const suggestions   = ref<InfluencerChatSuggestion[]>([])
const suggestionsLoading = ref(false)
const selectedInfluencer = ref<InfluencerChatSuggestion | null>(null)
let suggestionTimer: ReturnType<typeof setTimeout> | undefined
let suggestionRequest = 0

watch(usernameInput, (value) => {
  suggestionRequest++
  const normalized = value.trim().replace(/^@/, '').toLowerCase()
  if (selectedInfluencer.value?.username.toLowerCase() === normalized) {
    suggestions.value = []
    return
  }
  selectedInfluencer.value = null
  openError.value = ''
  if (suggestionTimer) clearTimeout(suggestionTimer)
  const query = value.trim().replace(/^@/, '')
  if (query.length < 2) {
    suggestions.value = []
    suggestionsLoading.value = false
    return
  }
  suggestionTimer = setTimeout(async () => {
    const request = suggestionRequest
    suggestionsLoading.value = true
    try {
      const results = await influencerApi.suggestForChat(query)
      if (request === suggestionRequest) suggestions.value = results
    } catch {
      if (request === suggestionRequest) suggestions.value = []
    } finally {
      if (request === suggestionRequest) suggestionsLoading.value = false
    }
  }, 250)
})

function selectInfluencer(suggestion: InfluencerChatSuggestion) {
  if (suggestionTimer) clearTimeout(suggestionTimer)
  suggestionRequest++
  selectedInfluencer.value = suggestion
  usernameInput.value = suggestion.username
  suggestions.value = []
}

onUnmounted(() => {
  if (suggestionTimer) clearTimeout(suggestionTimer)
  suggestionRequest++
})

onMounted(() => chatStore.loadChats())

async function openChat() {
  const raw = usernameInput.value.trim()
  if (!raw) return
  openError.value = ''
  opening.value   = true
  try {
    const influencerId = selectedInfluencer.value?.id
      ?? (await influencerApi.getByUsername(raw)).id
    const chat    = await chatStore.openChat(influencerId)
    router.push(viewPath(`/chats/${chat.id}`))
  } catch (e: any) {
    openError.value = e.response?.data?.message ?? 'No se encontró ese influencer.'
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <h1 class="page-title font-display font-bold text-navy">Mis Chats</h1>
      </div>

      <!-- Abrir nuevo chat (empresa) -->
      <div v-if="authStore.isEmpresa" class="card">
        <p class="text-sm font-semibold text-ink-muted mb-3">Iniciar chat con influencer</p>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-medium select-none">@</span>
            <input v-model="usernameInput" type="text" placeholder="username_del_influencer"
              class="input pl-7 w-full" role="combobox" aria-autocomplete="list"
              :aria-expanded="suggestions.length > 0" aria-controls="influencer-suggestions"
              autocomplete="off" @keyup.enter="openChat" @keydown.esc="suggestions = []" />
            <div v-if="usernameInput.trim().replace(/^@/, '').length >= 2"
              id="influencer-suggestions" role="listbox"
              class="absolute z-30 top-full mt-1 w-full overflow-hidden rounded-xl border border-navy/10 bg-white shadow-lg">
              <p v-if="suggestionsLoading" class="px-4 py-3 text-sm text-ink-muted">Buscando influencers…</p>
              <p v-else-if="suggestions.length === 0" class="px-4 py-3 text-sm text-ink-muted">No hay coincidencias disponibles.</p>
              <button v-for="suggestion in suggestions" :key="suggestion.id" type="button"
                role="option" :aria-selected="selectedInfluencer?.id === suggestion.id"
                class="flex w-full items-center gap-3 px-4 py-3 text-left ui-hover"
                @click="selectInfluencer(suggestion)">
                <img v-if="suggestion.avatar_url" :src="suggestion.avatar_url" alt=""
                  class="h-9 w-9 shrink-0 rounded-full object-cover" />
                <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet/10 font-semibold text-violet">
                  {{ suggestion.nombre_artistico.charAt(0).toUpperCase() }}
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-navy">{{ suggestion.nombre_artistico }}</span>
                  <span class="block truncate text-xs text-ink-muted">@{{ suggestion.username }}<template v-if="suggestion.ubicacion"> · {{ suggestion.ubicacion }}</template></span>
                </span>
              </button>
            </div>
          </div>
          <button @click="openChat" :disabled="opening || !usernameInput.trim()" class="btn-primary whitespace-nowrap">
            {{ opening ? 'Buscando…' : 'Iniciar chat' }}
          </button>
        </div>
        <p v-if="openError" class="text-coral-text text-xs mt-2">{{ openError }}</p>
        <p class="text-xs text-ink-muted mt-2">Costo: 1 crédito por chat nuevo.</p>
      </div>

      <!-- Lista de chats -->
      <div class="card">
        <div v-if="chatStore.chats.length === 0" class="text-center py-8 text-ink-muted">
          No tienes chats aún.
        </div>
        <div v-else class="divide-y divide-navy/5">
          <div v-for="chat in chatStore.chats" :key="chat.id"
            @click="router.push(viewPath(`/chats/${chat.id}`))"
            class="py-4 flex items-center justify-between cursor-pointer ui-hover rounded-lg -mx-5 px-5 transition-colors">
            <div class="flex items-center gap-3">
              <!-- Avatar con punto de no leído -->
              <div class="relative shrink-0">
                <template v-if="authStore.isEmpresa">
                  <img v-if="chat.influencer?.user?.avatar_url"
                    :src="chat.influencer.user.avatar_url"
                    class="w-10 h-10 rounded-full object-cover" />
                  <div v-else class="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center text-violet font-bold">
                    {{ chat.influencer?.nombre_artistico?.[0]?.toUpperCase() ?? '?' }}
                  </div>
                </template>
                <template v-else>
                  <img v-if="chat.empresa?.user?.avatar_url"
                    :src="chat.empresa.user.avatar_url"
                    class="w-10 h-10 rounded-full object-cover" />
                  <div v-else class="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center text-violet font-bold">
                    {{ chat.empresa?.nombre_comercial?.[0]?.toUpperCase() ?? '?' }}
                  </div>
                </template>
                <span v-if="!chatStore.isRead(chat.id)"
                  class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet border-2 border-white" />
              </div>
              <div>
                <p :class="['text-sm', chatStore.isRead(chat.id) ? 'font-medium text-navy' : 'font-bold text-navy']">
                  <span v-if="authStore.isEmpresa && chat.influencer">{{ chat.influencer.nombre_artistico }}</span>
                  <span v-else-if="chat.empresa">{{ chat.empresa.nombre_comercial }}</span>
                  <span v-else>Sin nombre</span>
                </p>
                <p :class="['text-xs', chatStore.isRead(chat.id) ? 'text-ink-muted' : 'text-violet/70 font-medium']">
                  {{ chatStore.isRead(chat.id) ? formatDate(chat.created_at, { day:'2-digit', month:'short', year:'numeric' }) : 'Nuevo mensaje' }}
                </p>
              </div>
            </div>
            <span :class="chat.status === 'active' ? 'badge-active' : 'badge-warning'">{{ chat.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
