<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useContractsStore } from '@/stores/contracts'

const router         = useRouter()
const contractsStore = useContractsStore()

onMounted(() => contractsStore.fetchContracts())

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending_payment:  { label: '⏳ Pago pendiente',  cls: 'badge-warning' },
  funded_in_escrow: { label: '🔒 En custodia',     cls: 'badge-info' },
  under_review:     { label: '🔍 En revisión',     cls: 'badge-info' },
  completed:        { label: '✅ Completado',       cls: 'badge-active' },
  in_dispute:       { label: '⚠️ En disputa',      cls: 'badge-warning' },
}
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <h1 class="text-2xl font-display font-bold text-navy">Mis Contratos</h1>

      <div v-if="contractsStore.loading" class="text-center py-8 text-navy/40">Cargando…</div>
      <div v-else-if="contractsStore.contracts.length === 0" class="card text-center py-10 text-navy/40">
        No tienes contratos aún. Acepta una propuesta en un chat para comenzar.
      </div>

      <div v-else class="grid gap-4">
        <div v-for="c in contractsStore.contracts" :key="c.id"
          @click="router.push(`/contratos/${c.id}`)"
          class="card cursor-pointer hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-display font-semibold text-navy">Contrato #{{ c.id }}</p>
              <p class="text-xs text-navy/40 mt-0.5">Chat #{{ c.chat_id }} · {{ new Date(c.created_at).toLocaleDateString() }}</p>
            </div>
            <span :class="STATUS_LABEL[c.status]?.cls ?? 'badge-muted'">
              {{ STATUS_LABEL[c.status]?.label ?? c.status }}
            </span>
          </div>

          <div class="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p class="text-xs text-navy/50">Monto total</p>
              <p class="font-semibold">${{ c.monto_total }} USD</p>
            </div>
            <div>
              <p class="text-xs text-navy/50">Comisión plataforma</p>
              <p class="font-semibold">${{ c.comision_plataforma }} USD</p>
            </div>
            <div>
              <p class="text-xs text-navy/50">Fecha límite</p>
              <p class="font-semibold">{{ c.fecha_limite_entrega }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
