<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useReceiptsStore } from '@/stores/receipts'
import type { PaymentReceipt } from '@/api/receipts'
import { formatDate, formatLocalDateTimeForDocument } from '@/utils/date'

const store = useReceiptsStore()

const labels: Record<string, string> = {
  credits_top_up: 'Recarga de créditos',
  escrow_funding: 'Fondeo en custodia',
  platform_commission: 'Comisión de plataforma',
  influencer_payout: 'Pago al influencer',
}

const sortedReceipts = computed(() => store.receipts)
const selectedReceipt = ref<PaymentReceipt | null>(null)

function showDetails(receipt: PaymentReceipt) {
  selectedReceipt.value = receipt
}

function closeDetails() {
  selectedReceipt.value = null
}

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
      <div v-else class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="bg-slate border-b border-border-strong">
              <tr class="text-left text-xs uppercase tracking-wide text-ink-muted">
                <th class="px-4 py-3 font-semibold">Operación</th>
                <th class="px-4 py-3 font-semibold">Comprobante</th>
                <th class="px-4 py-3 font-semibold">Monto</th>
                <th class="px-4 py-3 font-semibold">Estado factura</th>
                <th class="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="receipt in sortedReceipts" :key="receipt.id" class="align-top hover:bg-slate/60">
                <td class="px-4 py-4">
                  <p class="font-semibold text-navy">{{ labels[receipt.operation_type] ?? receipt.operation_type }}</p>
                  <span class="text-xs text-ink-muted mt-1 inline-block">{{ formatDate(receipt.created_at) }}</span>
                </td>
                <td class="px-4 py-4">
                  <p class="font-semibold text-navy">{{ receipt.receipt_number }}</p>
                  <p class="text-xs text-ink-muted mt-1">Contrato #{{ receipt.contrato_id ?? '—' }}</p>
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                  <p class="font-semibold text-navy">${{ Number(receipt.amount_usd).toFixed(2) }} USD</p>
                  <p class="text-xs text-ink-muted mt-1">{{ receipt.currency }}</p>
                </td>
                <td class="px-4 py-4">
                  <span :class="receipt.factura_enviada ? 'badge-success' : 'badge-warning'">
                    <i :class="['pi', receipt.factura_enviada ? 'pi-check' : 'pi-exclamation-triangle']" aria-hidden="true" />
                    {{ receipt.factura_enviada ? 'Enviada' : 'No enviada' }}
                  </span>
                </td>
                <td class="px-4 py-4 text-right whitespace-nowrap">
                  <button type="button" class="btn-secondary inline-flex items-center gap-1.5" @click="showDetails(receipt)">
                    <i class="pi pi-eye" aria-hidden="true" /> Ver detalle
                  </button>
                  <a v-if="receipt.dte?.pdf_url" :href="receipt.dte.pdf_url" target="_blank"
                    class="btn-primary inline-flex items-center gap-1.5 ml-2">
                    <i class="pi pi-file-pdf" aria-hidden="true" /> Ver factura
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="px-4 py-3 text-xs text-ink-muted border-t border-border">
          Los comprobantes son internos. Los DTE de desarrollo son simulados y no tienen validez fiscal.
        </p>
      </div>
    </div>

    <div v-if="selectedReceipt" class="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4" @click.self="closeDetails">
      <section class="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="receipt-detail-title">
        <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-muted">Detalle del comprobante</p>
            <h2 id="receipt-detail-title" class="text-xl font-display font-bold text-navy mt-1">
              {{ selectedReceipt.receipt_number }}
            </h2>
          </div>
          <button type="button" class="text-ink-muted hover:text-navy" aria-label="Cerrar detalle" @click="closeDetails">
            <i class="pi pi-times text-lg" aria-hidden="true" />
          </button>
        </div>
        <div class="grid sm:grid-cols-2 gap-4 py-5 text-sm">
          <div><p class="text-xs text-ink-muted">Operación</p><p class="font-semibold text-navy">{{ labels[selectedReceipt.operation_type] ?? selectedReceipt.operation_type }}</p></div>
          <div><p class="text-xs text-ink-muted">Fecha y hora</p><p class="font-semibold text-navy">{{ formatLocalDateTimeForDocument(selectedReceipt.created_at) }}</p></div>
          <div><p class="text-xs text-ink-muted">Monto USD</p><p class="font-semibold text-navy">${{ Number(selectedReceipt.amount_usd).toFixed(2) }}</p></div>
          <div><p class="text-xs text-ink-muted">Moneda</p><p class="font-semibold text-navy">{{ selectedReceipt.currency }}</p></div>
          <div><p class="text-xs text-ink-muted">Contrato</p><p class="font-semibold text-navy">#{{ selectedReceipt.contrato_id ?? '—' }}</p></div>
          <div><p class="text-xs text-ink-muted">Transacción</p><p class="font-semibold text-navy break-all">{{ selectedReceipt.wompi_transaction_id ?? 'Sin transacción' }}</p></div>
          <div><p class="text-xs text-ink-muted">Factura enviada</p><span :class="selectedReceipt.factura_enviada ? 'badge-success' : 'badge-warning'">{{ selectedReceipt.factura_enviada ? 'Enviada' : 'No enviada' }}</span></div>
        </div>
        <div v-if="selectedReceipt.dte" class="rounded-lg border border-border-strong p-4">
          <h3 class="font-semibold text-navy flex items-center gap-2"><i class="pi pi-file-check" aria-hidden="true" /> Factura electrónica</h3>
          <div class="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
            <div><p class="text-xs text-ink-muted">Número de control</p><p class="font-semibold text-navy break-all">{{ selectedReceipt.dte.numero_control }}</p></div>
            <div><p class="text-xs text-ink-muted">Estado</p><p class="font-semibold text-navy">{{ selectedReceipt.dte.estado }}</p></div>
            <div><p class="text-xs text-ink-muted">Ambiente</p><p class="font-semibold text-navy">{{ selectedReceipt.dte.ambiente === '00' ? 'Desarrollo' : 'Producción' }}</p></div>
          </div>
          <a v-if="selectedReceipt.dte.pdf_url" :href="selectedReceipt.dte.pdf_url" target="_blank" class="btn-primary inline-flex items-center gap-2 mt-4">
            <i class="pi pi-file-pdf" aria-hidden="true" /> Ver factura PDF
          </a>
          <p class="text-xs text-ink-muted mt-3">El DTE de desarrollo es simulado y no tiene validez fiscal.</p>
        </div>
        <div v-else class="rounded-lg border border-border-strong p-4 text-sm text-ink-muted">
          No se ha generado un DTE para este comprobante.
        </div>
      </section>
    </div>
  </AppLayout>
</template>
