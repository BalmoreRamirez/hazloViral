<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useReceiptsStore } from '@/stores/receipts'
import type { PaymentReceipt } from '@/api/receipts'
import { APP_TIME_ZONE, formatDate, formatLocalDateTimeForDocument } from '@/utils/date'
import { receiptsApi } from '@/api/receipts'
import { formatUsd, parseMoney } from '@/utils/money'

const store = useReceiptsStore()

const labels: Record<string, string> = {
  credits_top_up: 'Recarga de créditos',
  escrow_funding: 'Fondeo en custodia',
  platform_commission: 'Comisión de plataforma',
  influencer_payout: 'Pago al influencer',
}

const startDate = ref('')
const endDate = ref('')
const operationType = ref<PaymentReceipt['operation_type'] | ''>('')
const invalidDateRange = computed(() => Boolean(startDate.value && endDate.value && startDate.value > endDate.value))
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})
const sortedReceipts = computed(() => {
  if (invalidDateRange.value) return []
  return store.receipts.filter((receipt) => {
    if (operationType.value && receipt.operation_type !== operationType.value) return false
    const parts = dateFormatter.formatToParts(new Date(receipt.created_at))
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    const day = `${values.year}-${values.month}-${values.day}`
    return (!startDate.value || day >= startDate.value) && (!endDate.value || day <= endDate.value)
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})
const totalAmount = computed(() => {
  let cents = 0
  for (const receipt of sortedReceipts.value) {
    const amount = parseMoney(receipt.amount_usd)
    if (amount === null) return null
    cents += Math.round(amount * 100)
  }
  return cents / 100
})
const missingDteAmounts = computed(() => {
  const dte = selectedReceipt.value?.dte
  return dte && [dte.subtotal, dte.monto_iva, dte.total_pagar].some((value) => parseMoney(value) === null)
})

function clearFilters() {
  startDate.value = ''
  endDate.value = ''
  operationType.value = ''
}
const selectedReceipt = ref<PaymentReceipt | null>(null)

function showDetails(receipt: PaymentReceipt) {
  selectedReceipt.value = receipt
}

function closeDetails() {
  selectedReceipt.value = null
}

async function openDte(url: string) {
  const blob = await receiptsApi.downloadDte(url)
  const objectUrl = URL.createObjectURL(blob)
  window.open(objectUrl, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

onMounted(() => store.fetchReceipts())
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Historial de pagos</h1>
        <p class="text-ink-muted text-sm mt-1">Comprobantes internos de operaciones. No son DTE fiscales.</p>
      </div>

      <section class="card space-y-4" aria-label="Filtros del historial de pagos">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <label for="payment-start-date" class="label">Desde</label>
            <input id="payment-start-date" v-model="startDate" type="date" class="input" :max="endDate || undefined"
              :aria-invalid="invalidDateRange" :aria-describedby="invalidDateRange ? 'payment-date-error' : undefined" />
          </div>
          <div>
            <label for="payment-end-date" class="label">Hasta</label>
            <input id="payment-end-date" v-model="endDate" type="date" class="input" :min="startDate || undefined"
              :aria-invalid="invalidDateRange" :aria-describedby="invalidDateRange ? 'payment-date-error' : undefined" />
          </div>
          <div>
            <label for="payment-operation" class="label">Tipo de operación</label>
            <select id="payment-operation" v-model="operationType" class="input">
              <option value="">Todas las operaciones</option>
              <option v-for="(label, type) in labels" :key="type" :value="type">{{ label }}</option>
            </select>
          </div>
          <button type="button" class="btn-secondary" @click="clearFilters">Limpiar filtros</button>
        </div>
        <p v-if="invalidDateRange" id="payment-date-error" role="alert" class="text-sm text-coral-text">
          La fecha inicial debe ser anterior o igual a la fecha final.
        </p>
        <p class="text-xs text-ink-muted">Fechas inclusivas en horario de El Salvador. Sin fechas, se muestra todo el historial.</p>
      </section>

      <section v-if="!store.loading && !store.error && !invalidDateRange" class="card" aria-label="Resumen del período" aria-live="polite">
        <p class="text-sm text-ink-muted">Total del período</p>
        <p class="text-2xl font-display font-bold text-navy mt-1">{{ formatUsd(totalAmount) }} USD</p>
        <p class="text-sm text-ink-muted mt-1">{{ sortedReceipts.length }} operaciones encontradas</p>
        <p class="text-xs text-ink-muted mt-2">Suma de los comprobantes filtrados; no representa un saldo neto. Un contrato puede incluir fondeo, comisión y pago.</p>
      </section>

      <div v-if="store.loading" class="card text-center py-8 text-ink-muted">Cargando…</div>
      <div v-else-if="store.error" class="card text-center py-8 text-coral-text">{{ store.error }}</div>
      <div v-else-if="invalidDateRange" class="card text-center py-10 text-ink-muted">Corrige el rango de fechas para consultar el historial.</div>
      <div v-else-if="!sortedReceipts.length" class="card text-center py-10 text-ink-muted">
        {{ store.receipts.length ? 'No hay pagos que coincidan con los filtros seleccionados.' : 'Aún no tienes comprobantes de pago.' }}
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
                  <p class="font-semibold text-navy">{{ formatUsd(receipt.amount_usd) }} USD</p>
                  <p class="text-xs text-ink-muted mt-1">{{ receipt.currency }}</p>
                </td>
                <td class="px-4 py-4">
                  <span :class="receipt.factura_enviada ? 'badge-success' : 'badge-warning'">
                    <i :class="['pi', receipt.factura_enviada ? 'pi-check' : 'pi-exclamation-triangle']" aria-hidden="true" />
                    {{ receipt.factura_enviada ? 'Enviada' : 'No enviada' }}
                  </span>
                </td>
                <td class="px-4 py-4 text-right whitespace-nowrap">
                  <button type="button" class="btn-ghost inline-flex items-center justify-center w-9 h-9 rounded-full"
                    v-tooltip.top="'Ver detalle'" :aria-label="`Ver detalle de ${receipt.receipt_number}`" @click="showDetails(receipt)">
                    <i class="pi pi-eye" aria-hidden="true" />
                  </button>
                  <button v-if="receipt.dte?.pdf_url" type="button"
                    class="btn-ghost inline-flex items-center justify-center w-9 h-9 rounded-full text-violet ml-1"
                    v-tooltip.top="'Ver factura PDF'" :aria-label="`Ver factura de ${receipt.receipt_number}`"
                    @click="openDte(receipt.dte.pdf_url)">
                    <i class="pi pi-file-pdf" aria-hidden="true" />
                  </button>
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
          <div><p class="text-xs text-ink-muted">Monto USD</p><p class="font-semibold text-navy">{{ formatUsd(selectedReceipt.amount_usd) }}</p></div>
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
          <p v-if="missingDteAmounts" class="text-sm text-ink-muted mt-3" role="status">
            El desglose fiscal no está disponible en los datos recibidos. Consulta el PDF de la factura.
          </p>
          <dl class="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div><dt class="text-xs text-ink-muted">Subtotal sin IVA</dt><dd class="font-semibold text-navy">{{ formatUsd(selectedReceipt.dte.subtotal) }}</dd></div>
            <div><dt class="text-xs text-ink-muted">IVA (13%)</dt><dd class="font-semibold text-navy">{{ formatUsd(selectedReceipt.dte.monto_iva) }}</dd></div>
            <div><dt class="text-xs text-ink-muted">Total</dt><dd class="font-semibold text-navy">{{ formatUsd(selectedReceipt.dte.total_pagar) }}</dd></div>
          </dl>
          <button v-if="selectedReceipt.dte.pdf_url" type="button" class="btn-primary inline-flex items-center gap-2 mt-4" @click="openDte(selectedReceipt.dte.pdf_url)">
            <i class="pi pi-file-pdf" aria-hidden="true" /> Ver factura PDF
          </button>
          <p class="text-xs text-ink-muted mt-3">El DTE de desarrollo es simulado y no tiene validez fiscal.</p>
        </div>
        <div v-else class="rounded-lg border border-border-strong p-4 text-sm text-ink-muted">
          No se ha generado un DTE para este comprobante.
        </div>
      </section>
    </div>
  </AppLayout>
</template>
