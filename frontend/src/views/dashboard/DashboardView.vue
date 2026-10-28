<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { viewPath } from '@/router/paths'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { useChatStore } from '@/stores/chat'
import { useContractsStore, type Contract } from '@/stores/contracts'
import { useProfileStore } from '@/stores/profile'
import { formatDate, formatTime, todayInAppTimeZone } from '@/utils/date'
import { formatUsd } from '@/utils/money'
import { dashboardSummary, contractTask } from '@/utils/dashboard'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const credits = useCreditsStore()
const chats = useChatStore()
const contracts = useContractsStore()
const profile = useProfileStore()
const loading = ref(true)
const errors = ref<Record<string, boolean>>({})
const refreshedAt = ref<string | null>(null)
const isEmpresa = computed(() => auth.isEmpresa)
const isParticipant = computed(() => auth.isEmpresa || auth.isInfluencer)
const today = todayInAppTimeZone()
const profilePath = computed(() => isEmpresa.value ? '/perfil/empresa' : '/perfil/influencer')
const name = computed(() => {
  if (loading.value || errors.value.profile) return auth.user?.email?.split('@')[0] ?? ''
  return (isEmpresa.value ? profile.empresaProfile?.nombre_comercial : profile.influencerProfile?.nombre_artistico)
    || auth.user?.email?.split('@')[0] || ''
})

async function loadDashboard() {
  loading.value = true
  errors.value = {}
  const requests: [string, () => Promise<unknown>][] = isParticipant.value ? [
    ['profile', () => isEmpresa.value ? profile.loadEmpresaProfile() : profile.loadInfluencerProfile()],
    ['contracts', () => contracts.fetchContracts()],
    ['chats', () => chats.loadChats()],
    ...(isEmpresa.value ? [['balance', () => credits.fetchBalance()] as [string, () => Promise<unknown>]] : []),
  ] : []
  const results = await Promise.allSettled(requests.map(([, request]) => request()))
  results.forEach((result, index) => { if (result.status === 'rejected') errors.value[requests[index]![0]] = true })
  loading.value = false
  refreshedAt.value = new Date().toISOString()
}
onMounted(async () => {
  if (auth.isEmpresa && route.query.wompi === 'success' && route.query.tipo === 'creditos') {
    await router.replace({ name: 'credit-recharge', query: route.query })
    return
  }
  await loadDashboard()
})
const summary = computed(() => dashboardSummary(contracts.contracts, isEmpresa.value))
const metrics = computed(() => isEmpresa.value ? [
  { label: 'Contratos en curso', value: summary.value.active, detail: 'Colaboraciones en producción o revisión', icon: 'pi-briefcase', money: false },
  { label: 'En custodia', value: summary.value.inProgressAmount, detail: 'Fondos de contratos en curso', icon: 'pi-lock', money: true },
  { label: 'Por revisar', value: summary.value.reviews, detail: 'Entregables y publicaciones', icon: 'pi-eye', money: false },
  { label: 'Por fondear', value: summary.value.funding, detail: 'Acuerdos pendientes de pago', icon: 'pi-wallet', money: false },
] : [
  { label: 'Colaboraciones en curso', value: summary.value.active, detail: 'Contratos en producción o revisión', icon: 'pi-briefcase', money: false },
  { label: 'Por entregar o publicar', value: summary.value.tasks, detail: 'Contratos que requieren tu acción', icon: 'pi-send', money: false },
  { label: 'Ingresos en proceso', value: summary.value.inProgressAmount, detail: 'Neto estimado de contratos en curso', icon: 'pi-clock', money: true },
  { label: 'Ingresos confirmados', value: summary.value.confirmedAmount, detail: 'Neto acumulado con pago confirmado', icon: 'pi-check-circle', money: true },
])
const tasks = computed(() => contracts.contracts.flatMap(contract => {
  const task = contractTask(contract, isEmpresa.value)
  return task ? [{ contract, ...task }] : []
}).sort((a, b) => a.priority - b.priority || (a.contract.fecha_limite_entrega || '9999').localeCompare(b.contract.fecha_limite_entrega || '9999')))
const recentContracts = computed(() => [...contracts.contracts].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5))
const recentChats = computed(() => [...chats.chats].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4))
const activeChats = computed(() => chats.chats.filter(chat => chat.status === 'active').length)
function counterpart(contract: Contract) {
  return isEmpresa.value ? contract.influencer?.nombre_artistico ?? 'Influencer' : contract.empresa?.nombre_comercial ?? 'Empresa'
}
const statuses: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: 'Por fondear', cls: 'badge-warning' },
  funded_in_escrow: { label: 'En producción', cls: 'badge-info' },
  under_review: { label: 'En revisión', cls: 'badge-info' },
  changes_requested: { label: 'Cambios solicitados', cls: 'badge-warning' },
  pending_publication: { label: 'Por publicar', cls: 'badge-info' },
  publication_review: { label: 'Publicación en revisión', cls: 'badge-info' },
  completed: { label: 'Completado', cls: 'badge-success' },
  incumplimiento: { label: 'Incumplimiento', cls: 'badge-warning' },
}
const readiness = computed(() => isEmpresa.value ? [
  { label: 'Correo verificado', done: !!auth.user?.is_email_verified },
  { label: 'Perfil de empresa verificado', done: !!profile.empresaProfile?.is_verified },
] : [
  { label: 'Correo verificado', done: !!auth.user?.is_email_verified },
  { label: 'Perfil verificado', done: !!profile.influencerProfile?.is_verified },
  { label: 'Cuenta bancaria registrada', done: !!(profile.influencerProfile?.banco_nombre && profile.influencerProfile?.banco_cuenta_numero && profile.influencerProfile?.banco_cuenta_tipo) },
])
const readyCount = computed(() => readiness.value.filter(item => item.done).length)
</script>

<template>
  <AppLayout>
    <div class="space-y-6" :aria-busy="loading">
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ isEmpresa ? 'Espacio de marca' : auth.isInfluencer ? 'Espacio de creador' : 'Administración' }}</p>
          <h1 class="text-2xl sm:text-3xl font-display font-bold text-navy mt-1">Hola, {{ name || 'bienvenido' }}</h1>
          <p class="text-sm text-ink-muted mt-2">{{ formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }} · Tu actividad, en un solo lugar.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-secondary inline-flex items-center gap-2" :disabled="loading" @click="loadDashboard">
            <i :class="['pi pi-refresh', { 'pi-spin': loading }]" aria-hidden="true" />Actualizar
          </button>
          <RouterLink v-if="isParticipant" :to="viewPath(isEmpresa ? '/influencers' : '/contratos')" class="btn-primary inline-flex items-center gap-2">
            <i :class="['pi', isEmpresa ? 'pi-search' : 'pi-briefcase']" aria-hidden="true" />{{ isEmpresa ? 'Buscar influencers' : 'Mis contratos' }}
          </RouterLink>
        </div>
      </header>

      <div v-if="Object.keys(errors).length" role="alert" class="rounded-xl border border-amber-200 bg-warning-tint px-5 py-4 text-sm text-warning">
        <i class="pi pi-exclamation-triangle mr-2" aria-hidden="true" />No pudimos cargar parte de tu información. Los datos no disponibles se indican abajo. Usa Actualizar para reintentar.
      </div>
      <section v-if="!isParticipant" class="card">
        <h2 class="font-display font-semibold text-navy">Gestiona la plataforma</h2>
        <RouterLink :to="viewPath('/admin')" class="btn-primary inline-flex mt-4">Abrir administración</RouterLink>
      </section>
      <template v-else>
        <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Resumen de actividad">
          <article v-for="metric in metrics" :key="metric.label" class="card flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-medium text-ink-muted">{{ metric.label }}</h2>
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-tint text-violet"><i :class="['pi', metric.icon]" aria-hidden="true" /></span>
            </div>
            <div v-if="loading" class="h-8 w-28 rounded bg-slate-dark/60 animate-pulse" aria-label="Cargando indicador" />
            <p v-else class="text-3xl font-display font-bold text-navy tabular-nums break-words">{{ errors.contracts ? '—' : metric.money ? formatUsd(metric.value) : metric.value }}</p>
            <p class="text-xs text-ink-muted">{{ errors.contracts ? 'Información no disponible' : metric.detail }}<span v-if="metric.money && !errors.contracts"> · USD</span></p>
          </article>
        </section>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)] items-start">
          <div class="space-y-6 min-w-0">
            <section class="card p-0 overflow-hidden" aria-labelledby="tasks-title">
              <div class="px-5 sm:px-6 py-5 border-b border-border flex items-center justify-between gap-3">
                <div><h2 id="tasks-title" class="font-display text-lg font-semibold text-navy">Tu siguiente paso</h2><p class="text-xs text-ink-muted mt-1">{{ isEmpresa ? 'Acuerdos que necesitan revisión o fondeo.' : 'Entregas, cambios y publicaciones por resolver.' }}</p></div>
                <span v-if="!loading && !errors.contracts" class="badge-info">{{ tasks.length }} pendientes</span>
              </div>
              <p v-if="loading" class="p-8 text-center text-ink-muted" role="status">Preparando tus pendientes…</p>
              <p v-else-if="errors.contracts" class="p-8 text-center text-ink-muted">No se pudieron consultar tus pendientes.</p>
              <div v-else-if="!tasks.length" class="p-8 sm:p-10 text-center">
                <span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-tint text-success"><i class="pi pi-check text-xl" aria-hidden="true" /></span>
                <h3 class="text-base font-semibold text-navy mt-3">{{ contracts.contracts.length ? 'Todo al día' : 'Tu próxima colaboración empieza aquí' }}</h3>
                <p class="text-sm text-ink-muted mt-2">{{ contracts.contracts.length ? 'No tienes acciones pendientes en tus contratos.' : isEmpresa ? 'Prepara un brief y encuentra al creador ideal para tu marca.' : 'Completa tu perfil y verifica tus redes para recibir propuestas.' }}</p>
                <RouterLink :to="viewPath(isEmpresa ? '/briefs' : profilePath)" class="text-sm text-violet font-semibold inline-flex items-center gap-2 mt-4">{{ isEmpresa ? 'Gestionar briefs' : 'Revisar mi perfil' }}<i class="pi pi-arrow-right" aria-hidden="true" /></RouterLink>
              </div>
              <ul v-else class="divide-y divide-border">
                <li v-for="task in tasks.slice(0, 5)" :key="task.contract.id" class="px-5 sm:px-6 py-4 flex flex-wrap sm:flex-nowrap items-center gap-4">
                  <span class="hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-tint text-warning"><i :class="['pi', task.icon]" aria-hidden="true" /></span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-navy">{{ task.title }}</p>
                    <p class="text-xs text-ink-muted mt-1 break-words">{{ counterpart(task.contract) }} · Contrato #{{ task.contract.id }}</p>
                    <p v-if="task.contract.fecha_limite_entrega" class="text-xs mt-1" :class="task.contract.fecha_limite_entrega < today ? 'text-coral-text' : 'text-ink-muted'">{{ task.contract.fecha_limite_entrega < today ? 'Plazo vencido' : 'Fecha límite' }}: {{ formatDate(task.contract.fecha_limite_entrega) }}</p>
                  </div>
                  <RouterLink :to="viewPath(`/contratos/${task.contract.id}`)" class="btn-secondary text-sm whitespace-nowrap">{{ task.action }}</RouterLink>
                </li>
              </ul>
              <RouterLink v-if="!errors.contracts && tasks.length > 5" :to="viewPath('/contratos')" class="block border-t border-border px-6 py-3 text-sm text-violet font-semibold">Ver todos los pendientes en contratos</RouterLink>
            </section>

            <section class="card p-0 overflow-hidden" aria-labelledby="contracts-title">
              <div class="px-5 sm:px-6 py-5 border-b border-border flex items-center justify-between gap-3">
                <h2 id="contracts-title" class="font-display text-lg font-semibold text-navy">Contratos recientes</h2>
                <RouterLink :to="viewPath('/contratos')" class="text-sm text-violet font-semibold whitespace-nowrap">Ver todos</RouterLink>
              </div>
              <p v-if="loading || errors.contracts" class="p-8 text-center text-ink-muted">{{ loading ? 'Cargando contratos…' : 'Contratos no disponibles.' }}</p>
              <p v-else-if="!recentContracts.length" class="p-8 text-center text-sm text-ink-muted">Cuando aceptes una propuesta, encontrarás aquí su contrato.</p>
              <ul v-else class="divide-y divide-border">
                <li v-for="contract in recentContracts" :key="contract.id">
                  <RouterLink :to="viewPath(`/contratos/${contract.id}`)" class="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 sm:px-6 py-4 ui-hover focus-visible:outline-2 focus-visible:outline-violet">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate text-navy text-xs font-bold shrink-0">#{{ contract.id }}</span>
                    <div class="flex-1 min-w-0"><p class="text-sm font-semibold text-navy break-words">{{ counterpart(contract) }}</p><p class="text-xs text-ink-muted mt-1">{{ formatDate(contract.created_at) }}</p></div>
                    <div class="text-right"><p class="text-sm font-semibold text-navy tabular-nums">{{ formatUsd(isEmpresa ? contract.monto_total : Number(contract.monto_total) - Number(contract.comision_plataforma)) }}</p><p v-if="!isEmpresa" class="text-[11px] text-ink-muted">Neto del contrato</p></div>
                    <span :class="statuses[contract.status]?.cls ?? 'badge-muted'">{{ statuses[contract.status]?.label ?? contract.status }}</span>
                    <i class="pi pi-angle-right text-ink-muted hidden sm:block" aria-hidden="true" />
                  </RouterLink>
                </li>
              </ul>
            </section>
          </div>

          <aside class="space-y-6 min-w-0" aria-label="Tu cuenta y conversaciones">
            <section v-if="isEmpresa" class="rounded-2xl bg-navy p-6 text-white space-y-4">
              <div class="flex items-center justify-between"><h2 class="font-display font-semibold !text-white">Saldo para conectar</h2><i class="pi pi-wallet text-white/70" aria-hidden="true" /></div>
              <p class="text-3xl font-display font-bold tabular-nums">{{ loading || errors.balance || !credits.balance ? '—' : formatUsd(credits.balance.balance_creditos) }} <span class="text-sm font-normal text-white/70">USD</span></p>
              <p class="text-sm text-white/80">{{ errors.balance ? 'No se pudo consultar el saldo.' : credits.balance ? credits.balance.is_above_threshold ? 'Tus chats están habilitados para seguir negociando.' : 'Recarga saldo para volver a escribir en tus chats.' : 'Consultando tu saldo disponible…' }}</p>
              <RouterLink :to="viewPath('/saldo/recargar')" class="btn-primary inline-flex items-center justify-center gap-2 w-full"><i class="pi pi-plus" aria-hidden="true" />Recargar saldo</RouterLink>
              <RouterLink :to="viewPath('/pagos/comprobantes')" class="block text-center text-sm text-white/80 underline underline-offset-4">Consultar pagos y facturas</RouterLink>
            </section>

            <section class="card space-y-4">
              <div class="flex items-center justify-between gap-3"><h2 class="font-display text-lg font-semibold text-navy">Tu perfil profesional</h2><i class="pi pi-verified text-violet" aria-hidden="true" /></div>
              <p v-if="loading || errors.profile" class="text-sm text-ink-muted">{{ loading ? 'Consultando tu perfil…' : 'No se pudo verificar tu perfil.' }}</p>
              <template v-else>
                <div class="flex justify-between text-xs text-ink-muted"><span>Requisitos de tu cuenta</span><span>{{ readyCount }} de {{ readiness.length }}</span></div>
                <div class="h-1.5 rounded-full bg-slate-dark overflow-hidden" role="progressbar" :aria-valuenow="readyCount" :aria-valuemax="readiness.length" :aria-valuemin="0" aria-label="Requisitos de la cuenta"><div class="h-full bg-violet rounded-full" :style="{ width: `${readyCount / readiness.length * 100}%` }" /></div>
                <ul class="space-y-3"><li v-for="item in readiness" :key="item.label" class="text-sm flex items-center gap-2"><i :class="['pi', item.done ? 'pi-check-circle text-success' : 'pi-circle text-ink-muted']" aria-hidden="true" /><span class="text-ink-muted">{{ item.label }}</span><span class="sr-only">{{ item.done ? 'Completo' : 'Pendiente' }}</span></li></ul>
              </template>
              <RouterLink :to="viewPath(profilePath)" class="inline-flex items-center gap-2 text-sm font-semibold text-violet">Gestionar mi perfil<i class="pi pi-arrow-right" aria-hidden="true" /></RouterLink>
            </section>

            <section class="card p-0 overflow-hidden" aria-labelledby="chats-title">
              <div class="px-5 py-5 border-b border-border flex items-center justify-between gap-3"><div><h2 id="chats-title" class="font-display text-lg font-semibold text-navy">Conversaciones</h2><p v-if="!loading && !errors.chats" class="text-xs text-ink-muted mt-1">{{ activeChats }} chats activos</p></div><RouterLink :to="viewPath('/chats')" class="text-sm font-semibold text-violet">Ver todos</RouterLink></div>
              <p v-if="loading || errors.chats" class="p-6 text-sm text-ink-muted">{{ loading ? 'Cargando conversaciones…' : 'No se pudieron cargar los chats.' }}</p>
              <div v-else-if="!recentChats.length" class="p-6 space-y-3"><p class="text-sm text-ink-muted">{{ isEmpresa ? 'Encuentra un influencer y abre tu primera conversación.' : 'Aquí aparecerán tus conversaciones con las marcas.' }}</p><RouterLink v-if="isEmpresa" :to="viewPath('/influencers')" class="text-sm font-semibold text-violet">Explorar influencers</RouterLink></div>
              <ul v-else class="divide-y divide-border"><li v-for="chat in recentChats" :key="chat.id"><RouterLink :to="viewPath(`/chats/${chat.id}`)" class="flex items-center gap-3 px-5 py-4 ui-hover focus-visible:outline-2 focus-visible:outline-violet"><span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-tint text-violet"><i class="pi pi-comments" aria-hidden="true" /></span><div class="flex-1 min-w-0"><p class="text-sm font-semibold text-navy truncate">{{ isEmpresa ? chat.influencer?.nombre_artistico ?? 'Influencer' : chat.empresa?.nombre_comercial ?? 'Empresa' }}</p><p class="text-xs text-ink-muted mt-1">{{ chat.status === 'active' ? 'Conversación activa' : chat.status === 'blocked' ? 'Solo lectura' : 'Conversación finalizada' }}</p></div><i class="pi pi-angle-right text-ink-muted" aria-hidden="true" /></RouterLink></li></ul>
            </section>
          </aside>
        </div>
        <p v-if="refreshedAt && !loading" class="text-xs text-ink-muted text-center">{{ Object.keys(errors).length ? 'Último intento de actualización' : 'Información actualizada' }} a las {{ formatTime(refreshedAt) }} · El Salvador</p>
      </template>
    </div>
  </AppLayout>
</template>
