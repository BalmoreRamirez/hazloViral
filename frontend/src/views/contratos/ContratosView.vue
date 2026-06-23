<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useContractsStore } from '@/stores/contracts'
import { useAuthStore } from '@/stores/auth'

const router         = useRouter()
const contractsStore = useContractsStore()
const authStore      = useAuthStore()

const isEmpresa = computed(() => authStore.isEmpresa)

onMounted(() => contractsStore.fetchContracts())

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending_payment:  { label: '⏳ Pago pendiente',  cls: 'badge-warning' },
  funded_in_escrow: { label: '🔒 En custodia',     cls: 'badge-info' },
  under_review:     { label: '🔍 En revisión',     cls: 'badge-info' },
  completed:        { label: '✅ Completado',       cls: 'badge-active' },
  in_dispute:       { label: '⚠️ En disputa',      cls: 'badge-warning' },
}

const REDES_ICON: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Twitter: '𝕏',
  Facebook: '👤', Twitch: '🎮',
}

function counterpartName(c: any) {
  if (isEmpresa.value) {
    return c.influencer?.nombre_artistico ?? 'Influencer'
  }
  return c.empresa?.nombre_comercial ?? 'Empresa'
}

function counterpartInitial(c: any) {
  return (counterpartName(c)[0] ?? '?').toUpperCase()
}

function neto(c: any) {
  return (Number(c.monto_total) - Number(c.comision_plataforma)).toFixed(2)
}
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Mis Contratos</h1>
        <p class="text-navy/50 text-sm mt-1">{{ contractsStore.contracts.length }} contrato{{ contractsStore.contracts.length !== 1 ? 's' : '' }}</p>
      </div>

      <div v-if="contractsStore.loading" class="text-center py-8 text-navy/40">Cargando…</div>
      <div v-else-if="contractsStore.contracts.length === 0" class="card text-center py-10 text-navy/40">
        No tienes contratos aún. Acepta una propuesta en un chat para comenzar.
      </div>

      <div v-else class="grid gap-4">
        <div v-for="c in contractsStore.contracts" :key="c.id"
          @click="router.push(`/contratos/${c.id}`)"
          class="card cursor-pointer hover:shadow-md transition-shadow group">

          <!-- Fila superior: participante + estado -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center font-bold text-violet shrink-0 text-sm">
                {{ counterpartInitial(c) }}
              </div>
              <div class="min-w-0">
                <p class="font-display font-semibold text-navy leading-tight">{{ counterpartName(c) }}</p>
                <p class="text-xs text-navy/40 mt-0.5">
                  {{ new Date(c.created_at).toLocaleDateString('es-CO') }}
                </p>
              </div>
            </div>
            <span :class="[STATUS_LABEL[c.status]?.cls ?? 'badge-muted', 'shrink-0']">
              {{ STATUS_LABEL[c.status]?.label ?? c.status }}
            </span>
          </div>

          <!-- Entregables -->
          <div v-if="c.entregables?.length" class="mt-3 flex flex-wrap gap-1.5">
            <span v-for="(e, i) in c.entregables" :key="i"
              class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate text-navy/60 font-medium">
              {{ REDES_ICON[e.tipo] ?? '📦' }} {{ e.tipo }}
            </span>
          </div>

          <!-- Métricas financieras -->
          <div class="mt-3 grid grid-cols-3 gap-3 text-sm border-t border-navy/5 pt-3">
            <div>
              <p class="text-xs text-navy/40 mb-0.5">Monto total</p>
              <p class="font-semibold text-navy">${{ Number(c.monto_total).toFixed(2) }} <span class="text-xs font-normal text-navy/40">USD</span></p>
            </div>
            <div>
              <p class="text-xs text-navy/40 mb-0.5">{{ isEmpresa ? 'Comisión plataforma' : 'Recibes (neto)' }}</p>
              <p class="font-semibold" :class="isEmpresa ? 'text-navy' : 'text-green-600'">
                ${{ isEmpresa ? Number(c.comision_plataforma).toFixed(2) : neto(c) }}
                <span class="text-xs font-normal text-navy/40">USD</span>
              </p>
            </div>
            <div>
              <p class="text-xs text-navy/40 mb-0.5">Fecha límite</p>
              <p class="font-semibold text-navy">{{ c.fecha_limite_entrega }}</p>
            </div>
          </div>

          <!-- CTA si requiere acción -->
          <div v-if="c.status === 'pending_payment' && isEmpresa"
            class="mt-3 text-xs text-coral font-medium flex items-center gap-1">
            ← Fondea el contrato para que el influencer pueda comenzar
          </div>
          <div v-else-if="c.status === 'funded_in_escrow' && !isEmpresa"
            class="mt-3 text-xs text-violet font-medium flex items-center gap-1">
            ← Sube tus entregables para recibir el pago
          </div>
          <div v-else-if="c.status === 'under_review' && isEmpresa"
            class="mt-3 text-xs text-violet font-medium flex items-center gap-1">
            ← Revisa y aprueba los entregables del influencer
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
