<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useCreditsStore } from '@/stores/credits'
import { formatUsd } from '@/utils/money'
import { viewPath } from '@/router/paths'
import { receiptsApi, type PaymentReceipt } from '@/api/receipts'
import { formatDateTime } from '@/utils/date'
const creditsStore = useCreditsStore()
const route = useRoute()
const balance = computed(() => creditsStore.balance)
const loadError = ref('')
const invoiceLoading = ref<number | null>(null)
const invoiceError = ref('')
const sendingInvoice = ref<number | null>(null)
const mailNotice = ref('')
async function sendInvoice(receipt: PaymentReceipt) {
  if (sendingInvoice.value !== null) return
  sendingInvoice.value = receipt.id
  mailNotice.value = ''
  try {
    const { sent } = await receiptsApi.sendInvoice(receipt.id)
    mailNotice.value = sent ? 'Factura aceptada por el servidor de correo. Revisa tu bandeja y spam.' : 'El correo no pudo enviarse. Tu recarga está registrada; puedes reintentar.'
    await loadHistory()
  } catch { mailNotice.value = 'No se pudo enviar el correo. Intenta nuevamente.' }
  finally { sendingInvoice.value = null }
}
async function openInvoice(receipt: PaymentReceipt) {
  if (!receipt.dte?.pdf_url || invoiceLoading.value !== null) return
  invoiceLoading.value = receipt.id
  invoiceError.value = ''
  try {
    const blob = await receiptsApi.downloadDte(receipt.dte.pdf_url)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${receipt.dte.numero_control}.pdf`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch { invoiceError.value = 'No se pudo descargar la factura. Intenta de nuevo.' }
  finally { invoiceLoading.value = null }
}
const history = ref<PaymentReceipt[]>([])
const historyLoading = ref(false)
const historyError = ref('')
async function loadHistory() {
  historyLoading.value = true
  historyError.value = ''
  try {
    history.value = (await receiptsApi.list())
      .filter((receipt) => receipt.operation_type === 'credits_top_up')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch { historyError.value = 'No se pudo cargar el historial de recargas.' }
  finally { historyLoading.value = false }
}
async function refreshData() {
  await Promise.all([loadBalance(), loadHistory()])
}
async function loadBalance() {
  loadError.value = ''
  try { await creditsStore.fetchBalance() }
  catch { loadError.value = 'No se pudo consultar el saldo. Intenta de nuevo.' }
}
onMounted(() => {
  creditsStore.rechargeError = null
  return refreshData()
})
// ─── Recarga: paquetes + monto personalizado ──────────────────────────────────
const RECHARGE_PACKS = [25, 50, 100]
const RECHARGE_MIN   = 5
const RECHARGE_MAX   = 1000
const suggestedAmt   = computed(() => balance.value ? Math.max(10, Math.ceil(balance.value.deficit + 5)) : 10)
const selectedPack   = ref<number | 'custom'>(25)
const customAmt      = ref<number | null>(null)
const rechargeAmt    = computed(() => selectedPack.value === 'custom' ? Number(customAmt.value ?? 0) : selectedPack.value)
const rechargeValid  = computed(() => Number.isFinite(rechargeAmt.value) && rechargeAmt.value >= RECHARGE_MIN && rechargeAmt.value <= RECHARGE_MAX && Math.abs(rechargeAmt.value * 100 - Math.round(rechargeAmt.value * 100)) < 1e-8)
const rechargeBreakdown = computed(() => {
  const total = rechargeValid.value ? rechargeAmt.value : 0
  const base = Math.round((total / 1.13) * 100) / 100
  return { base, iva: Math.round((total - base) * 100) / 100, total }
})
const isDevelopment = import.meta.env.VITE_FORMA_PAGO !== 'produccion'
const showDevCheckout = ref(false)
const checkoutAmount = ref(0)
const devCheckoutStep = ref<'review' | 'success'>('review')

async function confirmDevelopmentRecharge() {
  if (creditsStore.recharging || checkoutAmount.value < RECHARGE_MIN || checkoutAmount.value > RECHARGE_MAX) return
  try {
    await creditsStore.simulateRecharge(checkoutAmount.value)
    devCheckoutStep.value = 'success'
    await loadHistory()
  } catch {
    // El store muestra el error en la tarjeta.
  }
}

function closeDevCheckout() {
  showDevCheckout.value = false
  devCheckoutStep.value = 'review'
}

async function startRecharge() {
  if (!rechargeValid.value || creditsStore.recharging) return
  creditsStore.rechargeError = null
  if (isDevelopment) {
    checkoutAmount.value = rechargeAmt.value
    showDevCheckout.value = true
  } else await creditsStore.recharge(rechargeAmt.value)
}
// Si los chats están congelados, sugerir un monto que cubra el déficit
watch(balance, (b) => {
  if (b && !b.is_above_threshold && !RECHARGE_PACKS.some(p => p >= suggestedAmt.value)) {
    selectedPack.value = 'custom'
    customAmt.value = suggestedAmt.value
  }
}, { immediate: true })
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-display font-bold text-navy">Recargar saldo</h1>
        <p class="text-sm text-ink-muted mt-1">Agrega créditos para conversar y negociar con influencers.</p>
      </header>
      <p v-if="route.query.wompi === 'success'" role="status" class="card text-sm text-ink-muted">
        Regresaste del proveedor de pago. El saldo se actualizará cuando se confirme la transacción. Puedes consultar el saldo nuevamente.
      </p>
      <div v-if="loadError" role="alert" class="card text-coral-text">{{ loadError }}</div>
      <div class="grid gap-6 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)] items-stretch">
        <section class="card space-y-4 flex flex-col">
          <h2 class="font-display font-semibold text-navy">Tu saldo</h2>
          <p v-if="creditsStore.loading" class="text-ink-muted" role="status">Consultando saldo…</p>
          <template v-else-if="balance">
            <p class="text-3xl font-display font-bold text-navy">{{ formatUsd(balance.balance_creditos) }} <span class="text-sm text-ink-muted">USD</span></p>
            <span :class="balance.is_above_threshold ? 'badge-success' : 'badge-warning'">{{ balance.is_above_threshold ? 'Chats activos' : 'Chats en solo lectura' }}</span>
            <p class="text-sm text-ink-muted">Saldo mínimo: {{ formatUsd(balance.umbral_creditos) }} USD.</p>
            <p v-if="!balance.is_above_threshold" class="text-sm text-coral-text">Recarga al menos {{ formatUsd(balance.deficit) }} USD para alcanzar el mínimo.</p>
          </template>
          <button type="button" class="btn-secondary" :disabled="creditsStore.loading" @click="refreshData">Actualizar saldo</button>
          <RouterLink :to="viewPath('/pagos/comprobantes')" class="block text-sm text-violet font-semibold">Ver historial de pagos</RouterLink>
        </section>
        <section class="min-w-0 w-full">
          <div class="card h-full flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-display font-semibold text-navy">Elige cuánto recargar</h2>
              <span class="badge-info">1 crédito = $1 USD</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button v-for="pack in RECHARGE_PACKS" :key="pack" type="button" :aria-pressed="selectedPack === pack" :disabled="creditsStore.recharging" @click="selectedPack = pack"
                class="py-4 rounded-xl text-lg font-semibold border transition-colors"
                :class="selectedPack === pack ? 'bg-violet text-white border-violet' : 'border-navy/15 text-navy hover:border-violet/40'">
                ${{ pack }}
              </button>
              <button type="button" :aria-pressed="selectedPack === 'custom'" :disabled="creditsStore.recharging" @click="selectedPack = 'custom'"
                class="py-4 rounded-xl text-sm font-semibold border transition-colors"
                :class="selectedPack === 'custom' ? 'bg-violet text-white border-violet' : 'border-navy/15 text-navy hover:border-violet/40'">
                Otro
              </button>
            </div>
            <label v-if="selectedPack === 'custom'" for="recharge-amount" class="label">Monto en USD</label>
            <input v-if="selectedPack === 'custom'" v-model.number="customAmt" type="number"
              :min="RECHARGE_MIN" :max="RECHARGE_MAX" step="0.01" id="recharge-amount" class="input text-sm" placeholder="Monto en USD" />
            <div class="grid gap-5 lg:grid-cols-2 rounded-xl bg-slate border border-border p-4">
              <div>
                <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Resumen de la recarga</p>
                <dl class="text-sm mt-3 space-y-2">
                  <div class="flex justify-between gap-3"><dt class="text-ink-muted">Base sin IVA</dt><dd class="text-navy tabular-nums">{{ formatUsd(rechargeBreakdown.base) }}</dd></div>
                  <div class="flex justify-between gap-3"><dt class="text-ink-muted">IVA incluido (13%)</dt><dd class="text-navy tabular-nums">{{ formatUsd(rechargeBreakdown.iva) }}</dd></div>
                  <div class="flex justify-between gap-3 border-t border-border pt-2 font-semibold text-navy"><dt>Total</dt><dd class="tabular-nums">{{ formatUsd(rechargeBreakdown.total) }} USD</dd></div>
                </dl>
              </div>
              <div class="lg:border-l lg:border-border lg:pl-5">
                <p class="text-sm font-semibold text-navy inline-flex items-center gap-2"><i class="pi pi-file-pdf text-violet" aria-hidden="true" />Factura de tu recarga</p>
                <p class="text-xs text-ink-muted mt-2 leading-relaxed">{{ isDevelopment ? 'Se genera un documento simulado con IVA, sin validez fiscal. Descárgalo desde el historial al completar la recarga.' : 'La emisión fiscal depende de la integración con Hacienda. Consulta el estado del documento en el historial.' }}</p>
                <p v-if="balance && rechargeValid" class="text-sm text-ink-muted mt-3">Saldo estimado: <strong class="text-navy">{{ formatUsd(Number(balance.balance_creditos) + rechargeAmt) }} USD</strong></p>
              </div>
            </div>
            <button @click="startRecharge"
              :disabled="creditsStore.recharging || !rechargeValid"
              class="btn-primary text-sm">
              {{ creditsStore.recharging ? 'Procesando…' : `Recargar $${rechargeAmt || 0} USD` }}
            </button>
            <p v-if="selectedPack === 'custom' && customAmt != null && !rechargeValid" class="text-xs text-coral-text">
              Ingresa un monto con hasta dos decimales entre ${{ RECHARGE_MIN }} y ${{ RECHARGE_MAX }} USD.
            </p>
            <p v-if="creditsStore.rechargeError" class="text-xs text-coral-text">
              {{ creditsStore.rechargeError }}
            </p>
            <p v-else class="text-xs text-ink-muted">{{ isDevelopment ? 'Ambiente de desarrollo · Sin cargos reales' : '1 crédito = $1 USD · Pago seguro con Wompi' }}</p>
          </div>
        </section>
      </div>
      <section class="card p-0 overflow-hidden" aria-labelledby="recharge-history-title">
        <div class="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-border">
          <div>
            <h2 id="recharge-history-title" class="font-display font-semibold text-navy">Historial de recargas</h2>
            <p class="text-xs text-ink-muted mt-1">Recargas registradas, de la más reciente a la más antigua.</p>
          </div>
          <button type="button" class="btn-ghost inline-flex items-center justify-center w-9 h-9 rounded-full"
            v-tooltip.top="'Actualizar historial'" aria-label="Actualizar historial" :disabled="historyLoading" @click="loadHistory">
            <i :class="['pi pi-refresh', { 'pi-spin': historyLoading }]" aria-hidden="true" />
          </button>
        </div>
        <p v-if="mailNotice" role="status" class="px-5 py-3 text-sm text-ink-muted">{{ mailNotice }}</p>
        <p v-if="invoiceError" role="alert" class="px-5 py-3 text-sm text-coral-text">{{ invoiceError }}</p>
        <p v-if="historyLoading" role="status" class="p-8 text-center text-ink-muted">Cargando recargas…</p>
        <div v-else-if="historyError" role="alert" class="p-8 text-center space-y-3">
          <p class="text-coral-text">{{ historyError }}</p>
          <button type="button" class="btn-secondary" @click="loadHistory">Reintentar</button>
        </div>
        <p v-else-if="!history.length" class="p-8 text-center text-ink-muted">Aún no tienes recargas registradas.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm text-left">
            <caption class="sr-only">Historial de recargas de saldo de la empresa</caption>
            <thead class="bg-slate text-xs uppercase tracking-wide text-ink-muted border-b border-border-strong">
              <tr>
                <th scope="col" class="px-5 py-3">Fecha y hora</th>
                <th scope="col" class="px-5 py-3">Comprobante</th>
                <th scope="col" class="px-5 py-3">Transacción</th>
                <th scope="col" class="px-5 py-3">Operación</th>
                <th scope="col" class="px-5 py-3 text-right">Total (USD)</th>
                <th scope="col" class="px-5 py-3">Factura</th>
                <th scope="col" class="px-5 py-3">Correo</th>
                <th scope="col" class="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="receipt in history" :key="receipt.id" class="hover:bg-slate/60">
                <td class="px-5 py-4 whitespace-nowrap text-ink-muted">{{ formatDateTime(receipt.created_at) }}<span v-if="receipt.metadata?.timestamp_approximate" class="block text-xs">Hora aproximada reportada</span></td>
                <th scope="row" class="px-5 py-4 font-semibold text-navy">{{ receipt.receipt_number }}</th>
                <td class="px-5 py-4 text-ink-muted break-all">{{ receipt.wompi_transaction_id ?? 'Sin referencia' }}</td>
                <td class="px-5 py-4"><span :class="receipt.metadata?.simulated ? 'badge-info' : 'badge-success'">{{ receipt.metadata?.recovered ? 'Recuperada (desarrollo)' : receipt.metadata?.simulated ? 'Simulada' : 'Recarga registrada' }}</span></td>
                <td class="px-5 py-4 text-right font-semibold tabular-nums text-navy whitespace-nowrap">{{ formatUsd(receipt.amount_usd) }}</td>
                <td class="px-5 py-4">
                  <span :class="receipt.dte ? 'badge-info' : 'badge-warning'">{{ receipt.dte ? (receipt.dte.ambiente === '00' ? 'Simulada' : receipt.dte.estado) : 'Sin emitir' }}</span>
                  <p v-if="receipt.dte" class="text-xs text-ink-muted mt-1">IVA: {{ formatUsd(receipt.dte.monto_iva) }}</p>
                </td>
                <td class="px-5 py-4"><span :class="receipt.factura_enviada ? 'badge-success' : 'badge-warning'">{{ receipt.factura_enviada ? 'Enviado' : 'Pendiente' }}</span></td>
                <td class="px-5 py-4 text-right whitespace-nowrap">
                  <button v-if="!receipt.factura_enviada" type="button" @click="sendInvoice(receipt)" :disabled="sendingInvoice !== null"
                    :aria-label="`Enviar factura de ${receipt.receipt_number} al correo`" v-tooltip.top="'Enviar factura al correo'"
                    class="btn-ghost inline-flex items-center justify-center w-9 h-9 rounded-full text-violet">
                    <i :class="sendingInvoice === receipt.id ? 'pi pi-spinner pi-spin' : 'pi pi-envelope'" aria-hidden="true" />
                  </button>
                  <button v-if="receipt.dte?.pdf_url" type="button" @click="openInvoice(receipt)" :disabled="invoiceLoading !== null"
                    :aria-label="`Descargar factura de ${receipt.receipt_number}`" v-tooltip.top="'Descargar factura PDF'"
                    class="btn-ghost inline-flex items-center justify-center w-9 h-9 rounded-full text-violet">
                    <i :class="invoiceLoading === receipt.id ? 'pi pi-spinner pi-spin' : 'pi pi-file-pdf'" aria-hidden="true" />
                  </button>
                  <span v-else class="text-ink-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
      <div v-if="showDevCheckout" class="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 px-4" @click.self="!creditsStore.recharging && closeDevCheckout()">
        <section class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="dev-checkout-title">
          <div class="bg-navy px-6 py-5 text-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><i class="pi pi-wallet text-xl" aria-hidden="true" /></span>
                <div><p class="text-xs uppercase tracking-wider text-white/60">InfluSmart</p><h2 id="dev-checkout-title" class="font-display text-xl font-bold">Checkout de desarrollo</h2></div>
              </div>
              <button type="button" class="text-white/70 hover:text-white" aria-label="Cerrar" :disabled="creditsStore.recharging" @click="closeDevCheckout"><i class="pi pi-times" aria-hidden="true" /></button>
            </div>
          </div>
          <div class="space-y-5 px-6 py-6">
            <template v-if="devCheckoutStep === 'review'">
              <div class="rounded-xl border border-navy/10 bg-slate p-4">
                <div class="flex items-center justify-between"><span class="text-sm text-ink-muted">Recarga de créditos</span><i class="pi pi-shield text-navy" aria-hidden="true" /></div>
                <p class="mt-2 text-3xl font-display font-bold text-navy">${{ Number(checkoutAmount).toFixed(2) }} <span class="text-sm font-normal text-ink-muted">USD</span></p>
                <p class="mt-1 text-xs text-ink-muted">Se acreditará en tu saldo de pruebas.</p>
              </div>
              <div class="flex items-start gap-3 rounded-lg border border-navy/15 p-3 text-sm text-navy"><i class="pi pi-info-circle mt-0.5" aria-hidden="true" /><p>Esta operación es simulada. No solicita datos bancarios y no realiza cargos reales.</p></div>
              <p v-if="creditsStore.rechargeError" class="text-sm text-coral-text">{{ creditsStore.rechargeError }}</p>
              <div class="flex gap-3"><button type="button" class="btn-secondary flex-1" :disabled="creditsStore.recharging" @click="closeDevCheckout">Cancelar</button><button type="button" class="btn-primary flex-1" :disabled="creditsStore.recharging" @click="confirmDevelopmentRecharge">{{ creditsStore.recharging ? 'Procesando…' : 'Confirmar recarga' }}</button></div>
            </template>
            <template v-else>
              <div class="py-4 text-center"><span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white"><i class="pi pi-check text-2xl" aria-hidden="true" /></span><h3 class="mt-4 text-xl font-display font-bold text-navy">Recarga simulada completada</h3><p class="mt-2 text-sm text-ink-muted">El saldo fue actualizado correctamente en el ambiente de desarrollo.</p><button type="button" class="btn-primary mt-6 w-full" @click="closeDevCheckout">Continuar</button></div>
            </template>
          </div>
        </section>
      </div>

  </AppLayout>
</template>
