<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useReceiptsStore } from '@/stores/receipts'

const store = useReceiptsStore()

const labels: Record<string, string> = {
  credits_top_up: 'Recarga de créditos',
  escrow_funding: 'Fondeo en custodia',
  platform_commission: 'Comisión de plataforma',
  influencer_payout: 'Pago al influencer',
}

const sortedReceipts = computed(() => store.receipts)

onMounted(() => store.fetchReceipts())
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Comprobantes de pago</h1>
        <p class="text-ink-muted text-sm mt-1">Comprobantes internos de operaciones. No son DTE fiscales.</p>
      </div>

      <div v-if="store.loading" class="card text-center py-8 text-ink-muted">Cargando…</div>
      <div v-else-if="store.error" class="card text-center py-8 text-coral-text">{{ store.error }}</div>
      <div v-else-if="!sortedReceipts.length" class="card text-center py-10 text-ink-muted">
        Aún no tienes comprobantes de pago.
      </div>
      <div v-else class="grid gap-3">
        <article v-for="receipt in sortedReceipts" :key="receipt.id" class="card">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-navy">{{ labels[receipt.operation_type] ?? receipt.operation_type }}</p>
              <p class="text-xs text-ink-muted mt-1">{{ receipt.receipt_number }}</p>
            </div>
            <span class="badge-info">{{ receipt.currency }}</span>
          </div>
          <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p class="text-xs text-ink-muted">Monto USD</p>
              <p class="font-semibold text-navy">${{ Number(receipt.amount_usd).toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-muted">Monto COP</p>
              <p class="font-semibold text-navy">${{ Number(receipt.amount_cop).toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-muted">Fecha</p>
              <p class="font-semibold text-navy">{{ new Date(receipt.created_at).toLocaleString('es-SV') }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-muted">Contrato</p>
              <p class="font-semibold text-navy">{{ receipt.contrato_id ?? '—' }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </AppLayout>
</template>
