<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { useChatStore } from '@/stores/chat'
import { useContractsStore } from '@/stores/contracts'
import { useProfileStore } from '@/stores/profile'

const router         = useRouter()
const route          = useRoute()
const authStore      = useAuthStore()
const creditsStore   = useCreditsStore()
const chatStore      = useChatStore()
const contractsStore = useContractsStore()

const profileStore = useProfileStore()

const isEmpresa   = computed(() => authStore.isEmpresa)
const balance     = computed(() => creditsStore.balance)

// ─── Recarga: paquetes + monto personalizado ──────────────────────────────────
const RECHARGE_PACKS = [25, 50, 100]
const RECHARGE_MIN   = 5
const RECHARGE_MAX   = 1000
const suggestedAmt   = computed(() => balance.value ? Math.max(10, Math.ceil(balance.value.deficit + 5)) : 10)
const selectedPack   = ref<number | 'custom'>(25)
const customAmt      = ref<number | null>(null)
const rechargeAmt    = computed(() => selectedPack.value === 'custom' ? Number(customAmt.value ?? 0) : selectedPack.value)
const rechargeValid  = computed(() => rechargeAmt.value >= RECHARGE_MIN && rechargeAmt.value <= RECHARGE_MAX)
const isDevelopment = import.meta.env.VITE_FORMA_PAGO !== 'produccion'
const showDevCheckout = ref(false)
const devCheckoutStep = ref<'review' | 'success'>('review')

async function confirmDevelopmentRecharge() {
  try {
    await creditsStore.simulateRecharge(rechargeAmt.value)
    devCheckoutStep.value = 'success'
  } catch {
    // El store muestra el error en la tarjeta.
  }
}

function closeDevCheckout() {
  showDevCheckout.value = false
  devCheckoutStep.value = 'review'
}

// ─── Saludo ───────────────────────────────────────────────────────────────────
const greetingName = computed(() =>
  (isEmpresa.value ? profileStore.empresaProfile?.nombre_comercial : null)
  ?? authStore.user?.email?.split('@')[0] ?? '',
)

// ─── Métricas ─────────────────────────────────────────────────────────────────
const ESCROW_STATUSES = ['funded_in_escrow', 'under_review', 'changes_requested', 'pending_publication', 'publication_review']
const REVIEW_STATUSES = ['under_review', 'publication_review']

const activeChats = computed(() => chatStore.chats.filter(c => c.status === 'active').length)
const sumMonto = (statuses: string[]) => contractsStore.contracts
  .filter(c => statuses.includes(c.status))
  .reduce((acc, c) => acc + Number(c.monto_total), 0)
const totalInvertido   = computed(() => sumMonto(['completed']))
const totalEnCustodia  = computed(() => sumMonto(ESCROW_STATUSES))
const pendientesRevision = computed(() => contractsStore.contracts.filter(c => REVIEW_STATUSES.includes(c.status)).length)
const pendientesPago   = computed(() => contractsStore.contracts.filter(c => c.status === 'pending_payment').length)

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

onMounted(async () => {
  const role = authStore.user?.role
  await Promise.all([
    isEmpresa.value ? profileStore.loadEmpresaProfile() : Promise.resolve(),
    (role === 'empresa' || role === 'influencer') ? chatStore.loadChats() : Promise.resolve(),
    (role === 'empresa' || role === 'influencer') ? contractsStore.fetchContracts() : Promise.resolve(),
    isEmpresa.value ? creditsStore.fetchBalance() : Promise.resolve(),
  ])

  // Gap 3: Wompi redirige aquí tras recarga de créditos exitosa
  if (route.query.wompi === 'success' && route.query.tipo === 'creditos') {
    await new Promise(r => setTimeout(r, 1500))
    await creditsStore.fetchBalance()
    router.replace({ path: '/dashboard' })
  }
})

const STATUS_LABEL: Record<string, string> = {
  pending_payment:  'Pago pendiente',
  funded_in_escrow: 'En custodia',
  under_review:     'En revisión',
  changes_requested:   'Cambios solicitados',
  pending_publication: 'Por publicar',
  publication_review:  'Revisión de publicación',
  completed:        'Completado',
  incumplimiento:   'Incumplimiento',
}

const STATUS_ICON: Record<string, string> = {
  pending_payment:     'pi-clock',
  funded_in_escrow:    'pi-lock',
  under_review:        'pi-search',
  changes_requested:   'pi-pencil',
  pending_publication: 'pi-upload',
  publication_review:  'pi-eye',
  completed:           'pi-check-circle',
  incumplimiento:      'pi-ban',
}

const CHAT_STATUS_LABEL: Record<string, string> = {
  active: 'Activo', blocked: 'Bloqueado', completed: 'Finalizado',
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
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">
          Hola, {{ greetingName }}
        </h1>
        <p class="text-ink-muted text-sm mt-1">
          {{ isEmpresa ? 'Panel de Marca / Empresa' : 'Panel de Influencer' }}
        </p>
      </div>

      <!-- Créditos (empresa) -->
      <template v-if="isEmpresa && balance">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="card flex flex-col gap-1">
            <p class="text-xs text-ink-muted uppercase tracking-wide font-semibold">Saldo disponible</p>
            <p class="text-3xl font-display font-bold" :class="balance.is_above_threshold ? 'text-navy' : 'text-coral-text'">
              ${{ balance.balance_creditos.toFixed(2) }}
              <span class="text-base font-normal text-ink-muted">USD</span>
            </p>
            <p class="text-xs text-ink-muted">
              Alerta de saldo bajo: <strong>${{ balance.umbral_creditos.toFixed(2) }} USD</strong>
              — por debajo de este monto tus chats se congelan
            </p>
          </div>
          <div class="card flex flex-col gap-1">
            <p class="text-xs text-ink-muted uppercase tracking-wide font-semibold">Estado del chat</p>
            <span :class="balance.is_above_threshold ? 'badge-active' : 'badge-warning'" class="self-start mt-1 text-base inline-flex items-center gap-1.5">
              <i class="pi pi-circle-fill text-[0.6em]" :class="balance.is_above_threshold ? 'text-success' : 'text-coral-text'" aria-hidden="true" />
              {{ balance.is_above_threshold ? 'Activo' : 'Chats congelados' }}
            </span>
            <p class="text-xs text-ink-muted mt-1">
              {{ balance.is_above_threshold
                ? 'Puedes enviar mensajes y propuestas'
                : `Recarga $${balance.deficit.toFixed(2)} USD o más para reactivar` }}
            </p>
          </div>
          <div class="card flex flex-col gap-2">
            <p class="text-xs text-ink-muted uppercase tracking-wide font-semibold">Recargar saldo</p>
            <div class="grid grid-cols-4 gap-1.5">
              <button v-for="pack in RECHARGE_PACKS" :key="pack" type="button" @click="selectedPack = pack"
                class="py-1.5 rounded-lg text-sm font-semibold border transition-colors"
                :class="selectedPack === pack ? 'bg-violet text-white border-violet' : 'border-navy/15 text-navy hover:border-violet/40'">
                ${{ pack }}
              </button>
              <button type="button" @click="selectedPack = 'custom'"
                class="py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                :class="selectedPack === 'custom' ? 'bg-violet text-white border-violet' : 'border-navy/15 text-navy hover:border-violet/40'">
                Otro
              </button>
            </div>
            <input v-if="selectedPack === 'custom'" v-model.number="customAmt" type="number"
              :min="RECHARGE_MIN" :max="RECHARGE_MAX" step="1" class="input text-sm" placeholder="Monto en USD" />
            <button @click="isDevelopment ? (showDevCheckout = true) : creditsStore.recharge(rechargeAmt)"
              :disabled="creditsStore.recharging || !rechargeValid"
              class="btn-primary text-sm">
              {{ creditsStore.recharging ? 'Procesando…' : `Recargar $${rechargeAmt || 0} USD` }}
            </button>
            <p v-if="selectedPack === 'custom' && customAmt != null && !rechargeValid" class="text-xs text-coral-text">
              El monto debe estar entre ${{ RECHARGE_MIN }} y ${{ RECHARGE_MAX }} USD.
            </p>
            <p v-if="creditsStore.rechargeError" class="text-xs text-coral-text">
              {{ creditsStore.rechargeError }}
            </p>
            <p v-else class="text-xs text-ink-muted">{{ isDevelopment ? 'Ambiente de desarrollo · Sin cargos reales' : '1 crédito = $1 USD · Pago seguro con Wompi' }}</p>
          </div>
        </div>
      </template>

      <div v-if="showDevCheckout" class="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 px-4" @click.self="closeDevCheckout">
        <section class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="dev-checkout-title">
          <div class="bg-navy px-6 py-5 text-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><i class="pi pi-wallet text-xl" aria-hidden="true" /></span>
                <div><p class="text-xs uppercase tracking-wider text-white/60">InfluSmart</p><h2 id="dev-checkout-title" class="font-display text-xl font-bold">Checkout de desarrollo</h2></div>
              </div>
              <button type="button" class="text-white/70 hover:text-white" aria-label="Cerrar" @click="closeDevCheckout"><i class="pi pi-times" aria-hidden="true" /></button>
            </div>
          </div>
          <div class="space-y-5 px-6 py-6">
            <template v-if="devCheckoutStep === 'review'">
              <div class="rounded-xl border border-navy/10 bg-slate p-4">
                <div class="flex items-center justify-between"><span class="text-sm text-ink-muted">Recarga de créditos</span><i class="pi pi-shield text-navy" aria-hidden="true" /></div>
                <p class="mt-2 text-3xl font-display font-bold text-navy">${{ Number(rechargeAmt).toFixed(2) }} <span class="text-sm font-normal text-ink-muted">USD</span></p>
                <p class="mt-1 text-xs text-ink-muted">Se acreditará en tu saldo de pruebas.</p>
              </div>
              <div class="flex items-start gap-3 rounded-lg border border-navy/15 p-3 text-sm text-navy"><i class="pi pi-info-circle mt-0.5" aria-hidden="true" /><p>Esta operación es simulada. No solicita datos bancarios y no realiza cargos reales.</p></div>
              <p v-if="creditsStore.rechargeError" class="text-sm text-coral-text">{{ creditsStore.rechargeError }}</p>
              <div class="flex gap-3"><button type="button" class="btn-secondary flex-1" @click="closeDevCheckout">Cancelar</button><button type="button" class="btn-primary flex-1" :disabled="creditsStore.recharging" @click="confirmDevelopmentRecharge">{{ creditsStore.recharging ? 'Procesando…' : 'Confirmar recarga' }}</button></div>
            </template>
            <template v-else>
              <div class="py-4 text-center"><span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white"><i class="pi pi-check text-2xl" aria-hidden="true" /></span><h3 class="mt-4 text-xl font-display font-bold text-navy">Recarga simulada completada</h3><p class="mt-2 text-sm text-ink-muted">El saldo fue actualizado correctamente en el ambiente de desarrollo.</p><button type="button" class="btn-primary mt-6 w-full" @click="closeDevCheckout">Continuar</button></div>
            </template>
          </div>
        </section>
      </div>

      <!-- Estadísticas rápidas -->
      <!-- Inversión (empresa) -->
      <div v-if="isEmpresa" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="card">
          <p class="text-xs text-ink-muted uppercase tracking-wide font-semibold">Total invertido</p>
          <p class="text-2xl font-display font-bold text-navy mt-1">{{ usd(totalInvertido) }}</p>
          <p class="text-xs text-ink-muted mt-0.5">Contratos completados</p>
        </div>
        <div class="card">
          <p class="text-xs text-ink-muted uppercase tracking-wide font-semibold">En custodia</p>
          <p class="text-2xl font-display font-bold text-violet mt-1">{{ usd(totalEnCustodia) }}</p>
          <p class="text-xs text-ink-muted mt-0.5">Retenido hasta aprobar entregas</p>
        </div>
        <RouterLink to="/contratos" class="card hover:border-coral/30 border border-transparent">
          <p class="text-xs text-ink-muted uppercase tracking-wide font-semibold">Esperan tu revisión</p>
          <p class="text-2xl font-display font-bold mt-1" :class="pendientesRevision ? 'text-coral-text' : 'text-navy'">{{ pendientesRevision }}</p>
          <p class="text-xs text-ink-muted mt-0.5">Entregables o publicaciones</p>
        </RouterLink>
        <RouterLink to="/contratos" class="card hover:border-coral/30 border border-transparent">
          <p class="text-xs text-ink-muted uppercase tracking-wide font-semibold">Pendientes de pago</p>
          <p class="text-2xl font-display font-bold mt-1" :class="pendientesPago ? 'text-coral-text' : 'text-navy'">{{ pendientesPago }}</p>
          <p class="text-xs text-ink-muted mt-0.5">Contratos por fondear</p>
        </RouterLink>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="card text-center">
          <p class="text-2xl font-bold text-violet">{{ activeChats }}</p>
          <p class="text-xs text-ink-muted mt-1">Chats activos</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-violet">{{ contractsStore.contracts.length }}</p>
          <p class="text-xs text-ink-muted mt-1">Contratos</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-navy">
            {{ contractsStore.contracts.filter(c => c.status === 'completed').length }}
          </p>
          <p class="text-xs text-ink-muted mt-1">Completados</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-coral-text">
            {{ contractsStore.contracts.filter(c => c.status === 'incumplimiento').length }}
          </p>
          <p class="text-xs text-ink-muted mt-1">En disputa</p>
        </div>
      </div>

      <!-- Chats recientes -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-navy">Chats recientes</h2>
          <RouterLink to="/chats" class="text-violet text-sm font-semibold">Ver todos →</RouterLink>
        </div>
        <div v-if="chatStore.chats.length === 0" class="text-ink-muted text-sm text-center py-4">
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
              <p class="text-xs text-ink-muted">{{ new Date(chat.created_at).toLocaleDateString() }}</p>
            </div>
            <span :class="chat.status === 'active' ? 'badge-active' : chat.status === 'completed' ? 'badge-muted' : 'badge-warning'">
              {{ CHAT_STATUS_LABEL[chat.status] ?? chat.status }}
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
              <p class="text-xs text-ink-muted">Límite: {{ c.fecha_limite_entrega }}</p>
            </div>
            <span class="badge-info text-xs inline-flex items-center gap-1.5">
              <i v-if="STATUS_ICON[c.status]" :class="['pi', STATUS_ICON[c.status]]" aria-hidden="true" />
              {{ STATUS_LABEL[c.status] ?? c.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
