<script setup lang="ts">
import { viewPath } from '@/router/paths'
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { formatDate } from '@/utils/date'
import { formatUsd } from '@/utils/money'
import { useContractsStore } from '@/stores/contracts'
import { useAuthStore } from '@/stores/auth'

const contractsStore = useContractsStore()
const authStore      = useAuthStore()

const isEmpresa = computed(() => authStore.isEmpresa)

const loadError = ref('')
async function loadContracts() {
  loadError.value = ''
  try { await contractsStore.fetchContracts() }
  catch { loadError.value = 'No se pudieron cargar los contratos. Intenta de nuevo.' }
}
onMounted(loadContracts)

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
  pending_payment:  { label: 'Pago pendiente',  cls: 'badge-warning', icon: 'pi-clock' },
  funded_in_escrow: { label: 'En custodia',     cls: 'badge-info',    icon: 'pi-lock' },
  under_review:     { label: 'En revisión',     cls: 'badge-info',    icon: 'pi-search' },
  changes_requested: { label: 'Cambios solicitados', cls: 'badge-warning', icon: 'pi-pencil' },
  pending_publication: { label: 'Pendiente de publicación', cls: 'badge-info', icon: 'pi-upload' },
  publication_review: { label: 'Revisión de publicación', cls: 'badge-info', icon: 'pi-eye' },
  completed:        { label: 'Completado',      cls: 'badge-active',  icon: 'pi-check-circle' },
  incumplimiento:   { label: 'Incumplimiento',  cls: 'badge-warning', icon: 'pi-ban' },
}

const PAYMENT_STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  pending_funding: { label: 'Pendiente de fondeo', cls: 'badge-warning', icon: 'pi-clock' },
  in_escrow: { label: 'Fondos en custodia', cls: 'badge-info', icon: 'pi-lock' },
  pending_approval: { label: 'Pendiente de aprobación', cls: 'badge-info', icon: 'pi-eye' },
  processing: { label: 'Procesando payout', cls: 'badge-warning', icon: 'pi-spin pi-spinner' },
  paid: { label: 'Pago confirmado', cls: 'badge-active', icon: 'pi-check-circle' },
  failed: { label: 'Payout fallido', cls: 'badge-warning', icon: 'pi-exclamation-triangle' },
  not_applicable: { label: 'No disponible', cls: 'badge-muted', icon: 'pi-minus-circle' },
}

function paymentState(c: any): keyof typeof PAYMENT_STATUS {
  if (c.payout_status === 'paid' || c.stripe_transfer_id) return 'paid'
  if (c.payout_status === 'processing') return 'processing'
  if (c.payout_status === 'failed' || (c.status === 'completed' && !c.stripe_transfer_id)) return 'failed'
  if (c.status === 'pending_payment') return 'pending_funding'
  if (c.status === 'funded_in_escrow' || c.status === 'under_review' || c.status === 'changes_requested') return 'in_escrow'
  if (c.status === 'pending_publication' || c.status === 'publication_review') return 'pending_approval'
  return 'not_applicable'
}

function paymentStatus(c: any): { label: string; cls: string; icon: string } {
  return PAYMENT_STATUS[paymentState(c)] ?? { label: 'No disponible', cls: 'badge-muted', icon: 'pi-minus-circle' }
}

const paymentSummary = computed(() => {
  const counts = { pending: 0, inProgress: 0, paid: 0, failed: 0 }
  contractsStore.contracts.forEach((c) => {
    const state = paymentState(c)
    if (state === 'pending_funding') counts.pending++
    else if (state === 'in_escrow' || state === 'pending_approval' || state === 'processing') counts.inProgress++
    else if (state === 'paid') counts.paid++
    else if (state === 'failed') counts.failed++
  })
  return counts
})

const REDES_ICON: Record<string, string> = {
  TikTok: 'pi-tiktok', Instagram: 'pi-instagram', YouTube: 'pi-youtube', Facebook: 'pi-facebook',
}

function counterpartName(c: any) {
  if (isEmpresa.value) {
    return c.influencer?.nombre_artistico ?? 'Influencer'
  }
  return c.empresa?.nombre_comercial ?? 'Empresa'
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
        <p class="text-ink-muted text-sm mt-1">{{ contractsStore.contracts.length }} contrato{{ contractsStore.contracts.length !== 1 ? 's' : '' }}</p>
      </div>

      <div v-if="isEmpresa && contractsStore.contracts.length" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="card">
          <p class="text-xs text-ink-muted">Pendientes de fondeo</p>
          <p class="text-2xl font-display font-bold text-warning mt-1">{{ paymentSummary.pending }}</p>
        </div>
        <div class="card">
          <p class="text-xs text-ink-muted">En seguimiento</p>
          <p class="text-2xl font-display font-bold text-violet mt-1">{{ paymentSummary.inProgress }}</p>
        </div>
        <div class="card">
          <p class="text-xs text-ink-muted">Pagos confirmados</p>
          <p class="text-2xl font-display font-bold text-success mt-1">{{ paymentSummary.paid }}</p>
        </div>
        <div class="card">
          <p class="text-xs text-ink-muted">Payouts fallidos</p>
          <p class="text-2xl font-display font-bold text-coral-text mt-1">{{ paymentSummary.failed }}</p>
        </div>
      </div>

      <div v-if="contractsStore.loading" class="text-center py-8 text-ink-muted">Cargando…</div>
      <div v-else-if="loadError" class="card text-center py-8" role="alert">
        <p class="text-coral-text">{{ loadError }}</p>
        <button type="button" class="btn-secondary mt-3" @click="loadContracts">Reintentar</button>
      </div>
      <div v-else-if="contractsStore.contracts.length === 0" class="card text-center py-10 text-ink-muted">
        No tienes contratos aún. Acepta una propuesta en un chat para comenzar.
      </div>

      <div v-else class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1080px] table-fixed text-sm text-left">
            <caption class="sr-only">Listado de contratos</caption>
            <colgroup>
              <col style="width: 11%" />
              <col style="width: 10%" />
              <col style="width: 12%" />
              <col :style="{ width: isEmpresa ? '14%' : '20%' }" />
              <col style="width: 10%" />
              <col style="width: 10%" />
              <col :style="{ width: isEmpresa ? '11%' : '21%' }" />
              <col v-if="isEmpresa" style="width: 16%" />
              <col style="width: 6%" />
            </colgroup>
            <thead class="bg-slate border-b border-border-strong text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" class="px-3 xl:px-4 py-3">Contrato</th>
                <th scope="col" class="px-3 xl:px-4 py-3">{{ isEmpresa ? 'Influencer' : 'Empresa' }}</th>
                <th scope="col" class="px-3 xl:px-4 py-3">Plataformas</th>
                <th scope="col" class="px-3 xl:px-4 py-3">Estado</th>
                <th scope="col" class="px-3 xl:px-4 py-3 text-right whitespace-nowrap">Monto total <span class="block text-[10px] font-normal mt-1">USD</span></th>
                <th scope="col" class="px-3 xl:px-4 py-3 text-right">{{ isEmpresa ? 'Comisión' : 'Recibes (neto)' }} <span class="block text-[10px] font-normal mt-1">USD</span></th>
                <th scope="col" class="px-3 xl:px-4 py-3">Fecha límite</th>
                <th v-if="isEmpresa" scope="col" class="px-3 xl:px-4 py-3">Pago</th>
                <th scope="col" class="px-3 xl:px-4 py-3 text-center"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="c in contractsStore.contracts" :key="c.id" class="align-middle hover:bg-slate/60">
                <th scope="row" class="px-3 xl:px-4 py-5 font-semibold text-navy">
                  <p>Contrato #{{ c.id }}</p>
                  <p class="text-xs text-ink-muted font-normal mt-1">{{ formatDate(c.created_at) }}</p>

                </th>
                <td class="px-3 xl:px-4 py-5 text-navy"><span class="block break-words">{{ counterpartName(c) }}</span></td>
                <td class="px-3 xl:px-4 py-5">
                  <div v-if="c.entregables?.length" class="flex flex-col gap-2">
                    <span v-for="(e, i) in c.entregables" :key="i" class="inline-flex items-center gap-1 text-xs font-normal text-ink-muted">
                      <i :class="['pi', REDES_ICON[e.tipo] ?? 'pi-box']" aria-hidden="true" />{{ e.tipo }}
                    </span>
                  </div>
                  <span v-else class="text-ink-muted">—</span>
                </td>
                <td class="px-3 xl:px-4 py-5">
                  <span :class="[STATUS_LABEL[c.status]?.cls ?? 'badge-muted', 'inline-flex items-center gap-1.5']">
                    <i v-if="STATUS_LABEL[c.status]" :class="['pi', STATUS_LABEL[c.status]?.icon]" aria-hidden="true" />
                    {{ STATUS_LABEL[c.status]?.label ?? c.status }}
                  </span>
                  <p v-if="c.status === 'pending_payment' && isEmpresa" class="text-xs text-coral-text mt-2">Fondeo pendiente</p>
                  <p v-else-if="c.status === 'funded_in_escrow' && !isEmpresa" class="text-xs text-violet mt-2">Entrega tus archivos</p>
                  <p v-else-if="c.status === 'under_review' && isEmpresa" class="text-xs text-violet mt-2">Revisa los entregables</p>
                </td>
                <td class="px-3 xl:px-4 py-5 font-semibold text-navy whitespace-nowrap text-right tabular-nums">{{ formatUsd(c.monto_total) }}</td>
                <td class="px-3 xl:px-4 py-5 font-semibold whitespace-nowrap text-right tabular-nums" :class="isEmpresa ? 'text-navy' : 'text-success'">
                  {{ formatUsd(isEmpresa ? c.comision_plataforma : neto(c)) }}
                </td>
                <td class="px-3 xl:px-4 py-5 text-ink-muted whitespace-nowrap">{{ c.fecha_limite_entrega ? formatDate(c.fecha_limite_entrega) : 'Sin definir' }}</td>
                <td v-if="isEmpresa" class="px-3 xl:px-4 py-5">
                  <span :class="[paymentStatus(c).cls, 'inline-flex items-center gap-1.5']">
                    <i :class="['pi', paymentStatus(c).icon]" aria-hidden="true" />{{ paymentStatus(c).label }}
                  </span>
                  <p v-if="paymentState(c) === 'failed'" class="text-xs text-coral-text mt-2 max-w-56 break-words">
                    {{ c.payout_error ?? 'No existe una transferencia confirmada.' }} Abre el detalle para reintentar.
                  </p>
                  <p v-else-if="paymentState(c) === 'paid' && c.stripe_transfer_id" class="text-xs text-success mt-2 break-words [overflow-wrap:anywhere]">{{ c.stripe_transfer_id }}</p>
                </td>
                <td class="px-3 xl:px-4 py-5 text-center">
                  <RouterLink :to="viewPath(`/contratos/${c.id}`)" v-tooltip.top="'Ver detalle'"
                    :aria-label="`Ver detalle del contrato #${c.id}`"
                    class="btn-ghost inline-flex items-center justify-center w-9 h-9 rounded-full text-violet">
                    <i class="pi pi-eye" aria-hidden="true" />
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
