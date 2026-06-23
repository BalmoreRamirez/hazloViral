<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { useChatStore } from '@/stores/chat'
import { useContractsStore } from '@/stores/contracts'

const router         = useRouter()
const authStore      = useAuthStore()
const creditsStore   = useCreditsStore()
const chatStore      = useChatStore()
const contractsStore = useContractsStore()

const isEmpresa   = computed(() => authStore.isEmpresa)
const balance     = computed(() => creditsStore.balance)
const rechargeAmt = computed(() => balance.value ? Math.max(10, balance.value.deficit + 5) : 10)

onMounted(async () => {
  await Promise.all([
    chatStore.loadChats(),
    contractsStore.fetchContracts(),
    isEmpresa.value ? creditsStore.fetchBalance() : Promise.resolve(),
  ])
})

const STATUS_LABEL: Record<string, string> = {
  pending_payment:  '⏳ Pago pendiente',
  funded_in_escrow: '🔒 En custodia',
  under_review:     '🔍 En revisión',
  completed:        '✅ Completado',
  in_dispute:       '⚠️ En disputa',
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">
          Hola, {{ authStore.user?.email?.split('@')[0] }} 👋
        </h1>
        <p class="text-navy/50 text-sm mt-1">
          {{ isEmpresa ? 'Panel de Marca / Empresa' : 'Panel de Influencer' }}
        </p>
      </div>

      <!-- Créditos (empresa) -->
      <template v-if="isEmpresa && balance">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="card flex flex-col gap-1">
            <p class="text-xs text-navy/50 uppercase tracking-wide font-semibold">Créditos</p>
            <p class="text-3xl font-display font-bold" :class="balance.is_above_threshold ? 'text-navy' : 'text-coral'">
              {{ balance.balance_creditos.toFixed(2) }}
            </p>
            <p class="text-xs text-navy/40">Umbral mínimo: {{ balance.umbral_creditos }} cr.</p>
          </div>
          <div class="card flex flex-col gap-1">
            <p class="text-xs text-navy/50 uppercase tracking-wide font-semibold">Estado</p>
            <span :class="balance.is_above_threshold ? 'badge-active' : 'badge-warning'" class="self-start mt-1 text-base">
              {{ balance.is_above_threshold ? '🟢 Activo' : '🔴 Solo lectura' }}
            </span>
            <p class="text-xs text-navy/40 mt-1">
              {{ balance.is_above_threshold ? 'Puedes enviar mensajes' : `Déficit: ${balance.deficit.toFixed(2)} cr.` }}
            </p>
          </div>
          <div class="card flex flex-col gap-2">
            <p class="text-xs text-navy/50 uppercase tracking-wide font-semibold">Recargar</p>
            <button @click="creditsStore.recharge(rechargeAmt)"
              :disabled="creditsStore.recharging"
              class="btn-primary text-sm">
              {{ creditsStore.recharging ? 'Procesando…' : `+ $${rechargeAmt} créditos` }}
            </button>
            <p v-if="creditsStore.rechargeError" class="text-xs text-coral">
              {{ creditsStore.rechargeError }}
            </p>
            <p v-else class="text-xs text-navy/40">Pago seguro con Stripe</p>
          </div>
        </div>
      </template>

      <!-- Estadísticas rápidas -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="card text-center">
          <p class="text-2xl font-bold text-violet">{{ chatStore.chats.length }}</p>
          <p class="text-xs text-navy/50 mt-1">Chats activos</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-violet">{{ contractsStore.contracts.length }}</p>
          <p class="text-xs text-navy/50 mt-1">Contratos</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-navy">
            {{ contractsStore.contracts.filter(c => c.status === 'completed').length }}
          </p>
          <p class="text-xs text-navy/50 mt-1">Completados</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-coral">
            {{ contractsStore.contracts.filter(c => c.status === 'in_dispute').length }}
          </p>
          <p class="text-xs text-navy/50 mt-1">En disputa</p>
        </div>
      </div>

      <!-- Chats recientes -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-navy">Chats recientes</h2>
          <RouterLink to="/chats" class="text-violet text-sm font-semibold">Ver todos →</RouterLink>
        </div>
        <div v-if="chatStore.chats.length === 0" class="text-navy/40 text-sm text-center py-4">
          No tienes chats aún.
        </div>
        <div v-else class="divide-y divide-navy/5">
          <div v-for="chat in chatStore.chats.slice(0,5)" :key="chat.id"
            @click="router.push(`/chats/${chat.id}`)"
            class="py-3 flex items-center justify-between cursor-pointer hover:bg-slate/50 -mx-5 px-5 rounded-lg transition-colors">
            <div>
              <p class="font-medium text-sm text-navy">
                <span v-if="isEmpresa && chat.influencer">{{ chat.influencer.nombre_artistico }}</span>
                <span v-else-if="chat.empresa">{{ chat.empresa.nombre_comercial }}</span>
                <span v-else>Sin nombre</span>
              </p>
              <p class="text-xs text-navy/40">{{ new Date(chat.created_at).toLocaleDateString() }}</p>
            </div>
            <span :class="chat.status === 'active' ? 'badge-active' : 'badge-warning'">
              {{ chat.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Contratos recientes -->
      <div class="card" v-if="contractsStore.contracts.length > 0">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-navy">Contratos recientes</h2>
          <RouterLink to="/contratos" class="text-violet text-sm font-semibold">Ver todos →</RouterLink>
        </div>
        <div class="divide-y divide-navy/5">
          <div v-for="c in contractsStore.contracts.slice(0,5)" :key="c.id"
            @click="router.push(`/contratos/${c.id}`)"
            class="py-3 flex items-center justify-between cursor-pointer hover:bg-slate/50 -mx-5 px-5 rounded-lg">
            <div>
              <p class="font-medium text-sm">
                {{ c.influencer?.nombre_artistico ?? c.empresa?.nombre_comercial ?? 'Contrato' }}
                — ${{ c.monto_total }}
              </p>
              <p class="text-xs text-navy/40">Límite: {{ c.fecha_limite_entrega }}</p>
            </div>
            <span class="badge-info text-xs">{{ STATUS_LABEL[c.status] ?? c.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
