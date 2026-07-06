<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { influencerApi } from '@/api/profiles'

const router    = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()

const usernameInput = ref('')
const openError     = ref('')
const opening       = ref(false)

onMounted(() => chatStore.loadChats())

async function openChat() {
  const raw = usernameInput.value.trim()
  if (!raw) return
  openError.value = ''
  opening.value   = true
  try {
    const profile = await influencerApi.getByUsername(raw)
    const chat    = await chatStore.openChat(profile.id)
    router.push(`/chats/${chat.id}`)
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
        <h1 class="text-2xl font-display font-bold text-navy">Mis Chats</h1>
      </div>

      <!-- Abrir nuevo chat (empresa) -->
      <div v-if="authStore.isEmpresa" class="card">
        <p class="text-sm font-semibold text-navy/70 mb-3">Iniciar chat con influencer</p>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40 font-medium select-none">@</span>
            <input v-model="usernameInput" type="text" placeholder="username_del_influencer"
              class="input pl-7 w-full" @keyup.enter="openChat" />
          </div>
          <button @click="openChat" :disabled="opening || !usernameInput.trim()" class="btn-primary whitespace-nowrap">
            {{ opening ? 'Buscando…' : 'Iniciar chat' }}
          </button>
        </div>
        <p v-if="openError" class="text-coral text-xs mt-2">{{ openError }}</p>
        <p class="text-xs text-navy/40 mt-2">Costo: 1 crédito por chat nuevo.</p>
      </div>

      <!-- Lista de chats -->
      <div class="card">
        <div v-if="chatStore.chats.length === 0" class="text-center py-8 text-navy/40">
          No tienes chats aún.
        </div>
        <div v-else class="divide-y divide-navy/5">
          <div v-for="chat in chatStore.chats" :key="chat.id"
            @click="router.push(`/chats/${chat.id}`)"
            class="py-4 flex items-center justify-between cursor-pointer hover:bg-slate rounded-lg -mx-5 px-5 transition-colors">
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
                <p :class="['text-xs', chatStore.isRead(chat.id) ? 'text-navy/40' : 'text-violet/70 font-medium']">
                  {{ chatStore.isRead(chat.id) ? new Date(chat.created_at).toLocaleDateString('es-SV', { day:'2-digit', month:'short', year:'numeric' }) : 'Nuevo mensaje' }}
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
