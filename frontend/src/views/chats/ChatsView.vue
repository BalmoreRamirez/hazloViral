<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const chatStore = useChatStore()
const authStore = useAuthStore()

const newInfluencerId = ref('')
const openError       = ref('')
const opening         = ref(false)

onMounted(() => chatStore.loadChats())

async function openChat() {
  if (!newInfluencerId.value) return
  openError.value = ''
  opening.value   = true
  try {
    const chat = await chatStore.openChat(Number(newInfluencerId.value))
    router.push(`/chats/${chat.id}`)
  } catch (e: any) {
    openError.value = e.response?.data?.message ?? 'Error al abrir chat.'
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
          <input v-model="newInfluencerId" type="number" placeholder="ID del influencer"
            class="input flex-1" min="1" />
          <button @click="openChat" :disabled="opening" class="btn-primary whitespace-nowrap">
            {{ opening ? 'Abriendo…' : 'Abrir chat' }}
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
              <div class="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center text-violet font-bold">
                {{ (authStore.isEmpresa ? chat.influencer?.nombre_artistico : chat.empresa?.nombre_comercial)?.[0]?.toUpperCase() ?? '?' }}
              </div>
              <div>
                <p class="font-semibold text-sm text-navy">
                  <span v-if="authStore.isEmpresa && chat.influencer">{{ chat.influencer.nombre_artistico }}</span>
                  <span v-else-if="chat.empresa">{{ chat.empresa.nombre_comercial }}</span>
                  <span v-else>Sin nombre</span>
                </p>
                <p class="text-xs text-navy/40">
                  {{ new Date(chat.created_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) }}
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
