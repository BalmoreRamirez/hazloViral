<script setup lang="ts">
import { viewPath } from '@/router/paths'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { formatDate } from '@/utils/date'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { formatUsd } from '@/utils/money'
import { influencerApi, type InfluencerChatSuggestion } from '@/api/profiles'

const router    = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()
const creditsStore = useCreditsStore()

const usernameInput = ref('')
const openError     = ref('')
const opening       = ref(false)
const suggestions   = ref<InfluencerChatSuggestion[]>([])
const suggestionsLoading = ref(false)
const selectedInfluencer = ref<InfluencerChatSuggestion | null>(null)
const chatSearch = ref('')
const showUnreadOnly = ref(false)
const chatsLoading = ref(false)
const chatsError = ref('')
const displayLimit = ref(10)
const pageSize = 10
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
  suggestionsLoading.value = true
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

const unreadChats = computed(() => chatStore.chats.filter((chat) => Number(chat.unread_count ?? 0) > 0).length)
const visibleChats = computed(() => {
  const query = chatSearch.value.trim().toLocaleLowerCase()
  return chatStore.chats.filter((chat) => {
    if (showUnreadOnly.value && !Number(chat.unread_count ?? 0)) return false
    if (!query) return true
    const counterpart = authStore.isEmpresa ? chat.influencer : chat.empresa
    const name = authStore.isEmpresa ? counterpart?.nombre_artistico : counterpart?.nombre_comercial
    return String(name ?? '').toLocaleLowerCase().includes(query)
  })
})
const displayedChats = computed(() => visibleChats.value.slice(0, displayLimit.value))
watch([chatSearch, showUnreadOnly], () => { displayLimit.value = pageSize })

async function loadChats() {
  chatsLoading.value = true
  chatsError.value = ''
  try {
    await chatStore.loadChats()
  } catch {
    chatsError.value = 'No pudimos cargar tus conversaciones.'
  } finally {
    chatsLoading.value = false
  }
}

onMounted(() => {
  void loadChats()
  if (authStore.isEmpresa) void creditsStore.fetchChatOpenCost().catch(() => null)
})

function counterpartName(chat: (typeof chatStore.chats)[number]) {
  return authStore.isEmpresa
    ? chat.influencer?.nombre_artistico ?? 'Influencer'
    : chat.empresa?.nombre_comercial ?? 'Empresa'
}

function statusLabel(status: string) {
  if (status === 'active') return 'Activa'
  if (status === 'blocked') return 'Solo lectura'
  return 'Finalizada'
}

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
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-violet">Mensajes</p>
          <h1 class="page-title font-bold text-navy mt-1">Mis chats</h1>
          <p class="mt-2 text-sm text-ink-muted">{{ authStore.isEmpresa ? 'Gestiona tus conversaciones con influencers desde un solo lugar.' : 'Mantén el contacto con las empresas de tus colaboraciones.' }}</p>
        </div>
        <div class="inline-flex w-fit items-center gap-2 rounded-full border border-violet/15 bg-white px-3 py-2 text-sm text-ink-muted shadow-sm">
          <i class="pi pi-comments text-violet" aria-hidden="true" />
          <span><strong class="text-navy">{{ chatStore.chats.length }}</strong> {{ chatStore.chats.length === 1 ? 'conversación' : 'conversaciones' }}</span>
          <span v-if="unreadChats" class="ml-1 rounded-full bg-violet px-2 py-0.5 text-xs font-semibold text-white">{{ unreadChats }} sin leer</span>
        </div>
      </header>

      <!-- Abrir nuevo chat (empresa) -->
      <section v-if="authStore.isEmpresa" class="overflow-visible rounded-2xl border border-violet/15 bg-gradient-to-br from-white via-white to-violet/5 p-4 shadow-sm sm:p-5">
        <div class="mb-3 flex items-start gap-3">
          <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-tint text-violet"><i class="pi pi-plus" aria-hidden="true" /></span>
          <div><h2 class="text-base font-semibold text-navy">Iniciar una conversación</h2><p class="mt-1 text-sm text-ink-muted">Busca por nombre o username del influencer.</p></div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <div class="relative flex-1">
            <i class="pi pi-at pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input v-model="usernameInput" type="text" placeholder="Nombre o username"
              class="input w-full pl-10" role="combobox" aria-autocomplete="list"
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
            <i v-if="!opening" class="pi pi-comments" aria-hidden="true" />
            {{ opening ? 'Abriendo…' : 'Iniciar chat' }}
          </button>
        </div>
        <p v-if="openError" role="alert" class="mt-2 text-sm text-coral-text">{{ openError }}</p>
        <p class="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <i class="pi pi-info-circle" aria-hidden="true" />
          <template v-if="creditsStore.chatOpenCost !== null">Un chat nuevo cuesta {{ creditsStore.chatOpenCost }} {{ creditsStore.chatOpenCost === 1 ? 'crédito' : 'créditos' }} ({{ formatUsd(creditsStore.chatOpenCost) }} USD). Si ya existe, no se vuelve a cobrar.</template>
          <template v-else-if="creditsStore.chatOpenCostLoading">Consultando el costo actual del chat…</template>
          <template v-else>El costo vigente se confirmará al iniciar el chat.</template>
        </p>
      </section>

      <section class="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div class="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 class="text-base font-semibold text-navy">Conversaciones</h2>
            <p class="mt-1 text-sm text-ink-muted">{{ showUnreadOnly ? 'Conversaciones pendientes de leer' : 'Tus conversaciones más recientes aparecen primero.' }}</p>
          </div>
          <div v-if="chatStore.chats.length" class="flex flex-col gap-2 sm:flex-row">
            <label class="relative min-w-0 sm:w-64">
              <i class="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input v-model="chatSearch" type="search" class="input w-full pl-9" placeholder="Buscar conversación" aria-label="Buscar conversación por nombre" />
            </label>
            <button type="button" :aria-pressed="showUnreadOnly" @click="showUnreadOnly = !showUnreadOnly"
              :class="showUnreadOnly ? 'border-violet bg-violet-tint text-violet' : 'border-border bg-white text-ink-muted'"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors">
              <i class="pi pi-envelope" aria-hidden="true" /> Sin leer <span v-if="unreadChats" class="rounded-full bg-violet/10 px-1.5 text-xs text-violet">{{ unreadChats }}</span>
            </button>
          </div>
        </div>

        <div v-if="chatsLoading" class="space-y-3 p-5" aria-label="Cargando conversaciones" aria-live="polite">
          <div v-for="n in 3" :key="n" class="flex animate-pulse items-center gap-3 rounded-xl bg-slate/70 p-4">
            <span class="h-11 w-11 rounded-full bg-navy/10" /><span class="flex-1"><span class="block h-3 w-36 rounded bg-navy/10" /><span class="mt-2 block h-3 w-24 rounded bg-navy/5" /></span>
          </div>
        </div>
        <div v-else-if="chatsError" class="p-10 text-center">
          <i class="pi pi-cloud text-2xl text-ink-muted" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-navy">{{ chatsError }}</p>
          <button type="button" class="btn-secondary mt-4" @click="loadChats"><i class="pi pi-refresh" aria-hidden="true" /> Reintentar</button>
        </div>
        <div v-else-if="chatStore.chats.length === 0" class="px-6 py-12 text-center">
          <span class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-tint text-violet"><i class="pi pi-comments text-xl" aria-hidden="true" /></span>
          <h3 class="mt-4 text-base font-semibold text-navy">Aún no tienes conversaciones</h3>
          <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{{ authStore.isEmpresa ? 'Busca un influencer por su nombre o username para iniciar una colaboración.' : 'Cuando una empresa te escriba, la conversación aparecerá aquí.' }}</p>
        </div>
        <div v-else-if="visibleChats.length === 0" class="px-6 py-10 text-center">
          <p class="text-sm font-medium text-navy">No encontramos conversaciones con esos criterios.</p>
          <button class="mt-2 text-sm font-semibold text-violet hover:underline" @click="chatSearch = ''; showUnreadOnly = false">Limpiar búsqueda</button>
        </div>
        <nav v-else aria-label="Lista de conversaciones" class="divide-y divide-border">
          <RouterLink v-for="chat in displayedChats" :key="chat.id" :to="viewPath(`/chats/${chat.id}`)"
            class="group flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-violet/[0.04] focus-visible:bg-violet/[0.06] sm:gap-4 sm:px-6">
            <span class="relative shrink-0">
              <template v-if="authStore.isEmpresa">
                <img v-if="chat.influencer?.user?.avatar_url" :src="chat.influencer.user.avatar_url" alt="" class="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm" />
                <span v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-violet-tint text-lg font-semibold text-violet">{{ counterpartName(chat).charAt(0).toUpperCase() }}</span>
              </template>
              <template v-else>
                <img v-if="chat.empresa?.user?.avatar_url" :src="chat.empresa.user.avatar_url" alt="" class="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm" />
                <span v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-violet-tint text-lg font-semibold text-violet">{{ counterpartName(chat).charAt(0).toUpperCase() }}</span>
              </template>
              <span v-if="Number(chat.unread_count ?? 0) > 0" class="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-violet" aria-label="Pendiente de leer" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span :class="Number(chat.unread_count ?? 0) ? 'font-bold' : 'font-semibold'" class="truncate text-sm text-navy">{{ counterpartName(chat) }}</span>
                <span v-if="Number(chat.unread_count ?? 0)" class="rounded-full bg-violet-tint px-2 py-0.5 text-[11px] font-semibold text-violet">{{ chat.unread_count }} sin leer</span>
              </span>
              <span class="mt-1 block truncate text-xs text-ink-muted">{{ Number(chat.unread_count ?? 0) ? 'Tienes mensajes pendientes de revisar' : `Conversación iniciada el ${formatDate(chat.created_at, { day:'2-digit', month:'short', year:'numeric' })}` }}</span>
            </span>
            <span :class="chat.status === 'active' ? 'bg-emerald-50 text-emerald-700' : chat.status === 'blocked' ? 'bg-amber-50 text-amber-700' : 'bg-slate text-ink-muted'"
              class="hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex">{{ statusLabel(chat.status) }}</span>
            <i class="pi pi-angle-right shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </RouterLink>
        </nav>
        <div v-if="visibleChats.length" class="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-ink-muted sm:flex-row sm:px-6">
          <p>Mostrando {{ displayedChats.length }} de {{ visibleChats.length }} conversaciones</p>
          <button v-if="displayedChats.length < visibleChats.length" type="button"
            class="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 font-semibold text-violet transition-colors hover:bg-violet-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            @click="displayLimit += pageSize">
            Cargar 10 más <i class="pi pi-angle-down" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  </AppLayout>
</template>
