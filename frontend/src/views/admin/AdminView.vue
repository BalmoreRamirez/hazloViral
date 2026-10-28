<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useAdminStore, type AdminStats, type AdminUser } from '@/stores/admin'
import { viewPath } from '@/router/paths'

const adminStore = useAdminStore()
const route = useRoute()
const adminPage = computed(() => String(route.meta.adminSection ?? 'overview'))
const pageTitle = computed(() => ({
  overview: 'Inicio de administración',
  users: 'Usuarios',
  incidents: 'Incumplimientos',
  settings: 'Configuración',
}[adminPage.value] ?? 'Administración'))
const pageDescription = computed(() => ({
  overview: 'Supervisa la actividad y atiende las tareas pendientes de InfluSmart.',
  users: 'Consulta las cuentas registradas y administra su acceso.',
  incidents: 'Revisa los contratos reportados y registra la resolución administrativa.',
  settings: 'Administra los parámetros globales que afectan la operación de la plataforma.',
}[adminPage.value] ?? 'Administración de InfluSmart.'))

// Settings
const editingKey   = ref<string | null>(null)
const editingValue = ref('')
const savingKey    = ref<string | null>(null)

// Users
const togglingId = ref<number | null>(null)
const refreshError = ref('')
const actionError = ref('')
const userSearch = ref('')
const usersLimit = ref(8)
const incidentsLimit = ref(5)

const metrics: { key: keyof AdminStats; label: string; icon: string; tone: string }[] = [
  { key: 'users', label: 'Usuarios registrados', icon: 'pi-users', tone: 'text-violet bg-violet-tint' },
  { key: 'empresas', label: 'Empresas', icon: 'pi-briefcase', tone: 'text-sky-700 bg-sky-50' },
  { key: 'influencers', label: 'Influencers', icon: 'pi-star', tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'contratos', label: 'Contratos', icon: 'pi-file-edit', tone: 'text-indigo-700 bg-indigo-50' },
  { key: 'incumplimientos', label: 'Pendientes de resolución', icon: 'pi-exclamation-triangle', tone: 'text-rose-700 bg-rose-50' },
]

const pendingIncidents = computed(() => adminStore.incumplimientos.filter((item) => !item.resuelto_por_admin))
const orderedIncidents = computed(() => [
  ...pendingIncidents.value,
  ...adminStore.incumplimientos.filter((item) => item.resuelto_por_admin),
])
const filteredUsers = computed(() => {
  const query = userSearch.value.trim().toLocaleLowerCase()
  if (!query) return adminStore.users
  return adminStore.users.filter((user) => {
    const profileName = user.profile?.nombre_comercial ?? user.profile?.nombre_artistico ?? ''
    return `${user.email} ${profileName} ${user.role}`.toLocaleLowerCase().includes(query)
  })
})
const displayedUsers = computed(() => filteredUsers.value.slice(0, usersLimit.value))
const displayedIncidents = computed(() => orderedIncidents.value.slice(0, incidentsLimit.value))

function errorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message
  return Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message : fallback
}

async function refresh() {
  refreshError.value = ''
  try { await adminStore.fetchAll() }
  catch { refreshError.value = 'No se pudo cargar la información administrativa.' }
}

// Incumplimientos
const resolvingId    = ref<number | null>(null)
const resolucionText = ref<Record<number, string>>({})
function toggleResolve(id: number) {
  if (resolucionText.value[id] !== undefined) { delete resolucionText.value[id] }
  else { resolucionText.value[id] = '' }
}
async function submitResolve(id: number) {
  if (!resolucionText.value[id]?.trim()) return
  resolvingId.value = id
  actionError.value = ''
  try {
    await adminStore.resolveIncumplimiento(id, resolucionText.value[id])
    delete resolucionText.value[id]
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo guardar la resolución. Intenta nuevamente.')
  } finally { resolvingId.value = null }
}

onMounted(refresh)

function startEdit(key: string, currentValue: string) {
  editingKey.value   = key
  editingValue.value = currentValue
}

async function saveSetting(key: string) {
  savingKey.value = key
  actionError.value = ''
  try {
    await adminStore.updateSetting(key, editingValue.value)
    editingKey.value = null
  } catch (error) {
    actionError.value = errorMessage(error, 'No se pudo guardar el parámetro. Intenta nuevamente.')
  } finally { savingKey.value = null }
}

async function toggleUser(id: number, current: boolean) {
  togglingId.value = id
  actionError.value = ''
  try { await adminStore.toggleUserStatus(id, !current) }
  catch (error) { actionError.value = errorMessage(error, 'No se pudo actualizar el estado del usuario.') }
  finally { togglingId.value = null }
}

const ROLE_BADGE: Record<string, string> = { admin: 'bg-violet/20 text-violet', empresa: 'bg-navy/10 text-navy', influencer: 'bg-success-tint text-success' }
const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', empresa: 'Empresa', influencer: 'Influencer' }

function userDisplayName(user: AdminUser) {
  return user.profile?.nombre_comercial ?? user.profile?.nombre_artistico ?? user.email
}

function userInitial(user: AdminUser) {
  return userDisplayName(user).trim().charAt(0).toLocaleUpperCase() || '?'
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-violet">Vista general</p>
          <h1 class="page-title font-bold text-navy mt-1">{{ pageTitle }}</h1>
          <p class="text-ink-muted text-sm mt-2">{{ pageDescription }}</p>
        </div>
        <button type="button" class="btn-secondary w-fit" :disabled="adminStore.loading" @click="refresh">
          <i :class="['pi', adminStore.loading ? 'pi-spin pi-spinner' : 'pi-refresh']" aria-hidden="true" />
          {{ adminStore.loading ? 'Actualizando…' : 'Actualizar datos' }}
        </button>
      </header>

      <div v-if="refreshError" role="alert" class="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
        <span><i class="pi pi-exclamation-circle mr-2" aria-hidden="true" />{{ refreshError }}</span>
        <button type="button" class="font-semibold underline" @click="refresh">Reintentar</button>
      </div>

      <div v-if="adminStore.loading && !adminStore.stats" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Cargando panel" aria-live="polite">
        <div v-for="n in 5" :key="n" class="h-28 animate-pulse rounded-2xl border border-border bg-white" />
      </div>

      <template v-else-if="adminStore.stats">
      <!-- Summary metrics -->
      <div v-if="adminPage === 'overview' && adminStore.stats" class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <div v-for="metric in metrics" :key="metric.key"
          class="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <span :class="metric.tone" class="inline-flex h-10 w-10 items-center justify-center rounded-xl"><i :class="['pi', metric.icon]" aria-hidden="true" /></span>
          <p class="mt-4 text-2xl font-bold tabular-nums text-navy">{{ adminStore.stats[metric.key] }}</p>
          <p class="mt-1 text-xs leading-5 text-ink-muted">{{ metric.label }}</p>
        </div>
      </div>

      <div v-if="adminPage === 'overview' && adminStore.stats?.incumplimientos" class="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        <i class="pi pi-exclamation-triangle mt-0.5" aria-hidden="true" />
        <p><strong>{{ adminStore.stats.incumplimientos }} contrato{{ adminStore.stats.incumplimientos === 1 ? '' : 's' }}</strong> {{ adminStore.stats.incumplimientos === 1 ? 'requiere' : 'requieren' }} revisión administrativa.</p>
        <RouterLink :to="viewPath('/admin/incumplimientos')" class="ml-auto shrink-0 font-semibold underline">Revisar</RouterLink>
      </div>

      <section v-if="adminPage === 'overview'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Accesos administrativos">
        <RouterLink :to="viewPath('/admin/usuarios')" class="group flex items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-violet/30 hover:bg-violet/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
          <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-tint text-violet"><i class="pi pi-users" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm text-navy">Gestionar usuarios</strong><span class="mt-1 block text-xs leading-relaxed text-ink-muted">Consulta perfiles, roles y estado de acceso.</span><span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet">{{ adminStore.stats?.users ?? 0 }} cuentas <i class="pi pi-arrow-right text-[10px] transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></span>
        </RouterLink>
        <RouterLink :to="viewPath('/admin/incumplimientos')" class="group flex items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-violet/30 hover:bg-violet/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
          <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><i class="pi pi-shield" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm text-navy">Revisar incumplimientos</strong><span class="mt-1 block text-xs leading-relaxed text-ink-muted">Atiende reportes y deja constancia de la resolución.</span><span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet">{{ pendingIncidents.length }} pendientes <i class="pi pi-arrow-right text-[10px] transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></span>
        </RouterLink>
        <RouterLink :to="viewPath('/admin/configuracion')" class="group flex items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-violet/30 hover:bg-violet/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
          <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><i class="pi pi-sliders-h" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm text-navy">Parámetros de la plataforma</strong><span class="mt-1 block text-xs leading-relaxed text-ink-muted">Configura comisiones, créditos y umbrales.</span><span class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet">{{ adminStore.settings.length }} parámetros <i class="pi pi-arrow-right text-[10px] transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></span>
        </RouterLink>
      </section>

      <div v-if="actionError" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <i class="pi pi-exclamation-circle mr-2" aria-hidden="true" />{{ actionError }}
      </div>

      <!-- Incumplimientos -->
      <section v-if="adminPage === 'incidents'" id="incumplimientos" class="card scroll-mt-24" aria-labelledby="incidents-heading">
        <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 id="incidents-heading" class="flex items-center gap-2 font-semibold text-navy"><i class="pi pi-shield text-violet" aria-hidden="true" /> Casos que requieren atención</h2><p class="mt-1 text-sm text-ink-muted">Contratos reportados y seguimiento de su resolución.</p></div>
          <span :class="pendingIncidents.length ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'" class="w-fit rounded-full px-2.5 py-1 text-xs font-semibold">{{ pendingIncidents.length }} pendientes</span>
        </div>
        <div v-if="!adminStore.incumplimientos.length" class="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-5 py-8 text-center">
          <i class="pi pi-check-circle text-2xl text-emerald-600" aria-hidden="true" /><p class="mt-2 text-sm font-semibold text-emerald-800">No hay casos pendientes</p><p class="mt-1 text-xs text-ink-muted">Los contratos reportados aparecerán en esta sección.</p>
        </div>
        <div v-else class="divide-y divide-border">
          <article v-for="inc in displayedIncidents" :key="inc.id" class="py-4 first:pt-1 last:pb-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-navy">Contrato #{{ inc.id }}</span>
                  <span v-if="inc.resuelto_por_admin" class="badge-active text-xs inline-flex items-center gap-1"><i class="pi pi-check-circle text-xs" aria-hidden="true" />Resuelto</span>
                  <span v-else class="text-xs bg-coral/10 text-coral-text px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1"><i class="pi pi-clock text-xs" aria-hidden="true" />Pendiente</span>
                  <span class="rounded bg-slate px-2 py-1 text-xs font-semibold tabular-nums text-navy">${{ Number(inc.monto_total).toFixed(2) }} USD</span>
                </div>
                <p class="text-xs text-ink-muted">{{ inc.empresa?.nombre_comercial ?? 'Empresa' }} <i class="pi pi-arrow-right mx-1 text-[10px]" aria-hidden="true" /> {{ inc.influencer?.nombre_artistico ?? 'Influencer' }}</p>
                <p class="mt-2 text-sm leading-relaxed text-navy"><span class="font-semibold">Motivo:</span> {{ inc.motivo_incumplimiento }}</p>
                <p v-if="inc.resolucion_admin" class="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <span class="font-medium">Resolución admin:</span> {{ inc.resolucion_admin }}
                </p>
              </div>
              <button v-if="!inc.resuelto_por_admin"
                @click="toggleResolve(inc.id)"
                class="btn-ghost text-xs shrink-0">
                {{ resolucionText[inc.id] !== undefined ? 'Cancelar' : 'Resolver' }}
              </button>
            </div>
            <!-- Panel de resolución -->
            <div v-if="resolucionText[inc.id] !== undefined" class="mt-3 space-y-3 rounded-xl border border-violet/20 bg-violet/5 p-4">
              <p class="text-xs font-semibold text-violet">Nota de resolución (mínimo 10 caracteres)</p>
              <textarea v-model="resolucionText[inc.id]" class="input text-sm" rows="2"
                placeholder="Ej: Se determinó que el influencer incumplió el acuerdo. Se procede con devolución parcial al anunciante…" />
              <div class="flex gap-2">
                <button @click="submitResolve(inc.id)"
                  :disabled="resolvingId === inc.id || !resolucionText[inc.id]?.trim() || (resolucionText[inc.id]?.length ?? 0) < 10"
                  class="btn-primary text-xs">
                  {{ resolvingId === inc.id ? 'Guardando…' : 'Confirmar resolución' }}
                </button>
                <button @click="toggleResolve(inc.id)" class="btn-ghost text-xs">Cancelar</button>
              </div>
            </div>
          </article>
        </div>
        <div v-if="orderedIncidents.length > displayedIncidents.length" class="mt-4 border-t border-border pt-3 text-center">
          <button class="text-sm font-semibold text-violet hover:underline" @click="incidentsLimit += 5">Ver 5 casos más ({{ orderedIncidents.length - displayedIncidents.length }} restantes)</button>
        </div>
      </section>

      <!-- Users -->
      <section v-if="adminPage === 'users'" id="usuarios" class="card scroll-mt-24" aria-labelledby="users-heading">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="users-heading" class="flex items-center gap-2 font-semibold text-navy"><i class="pi pi-users text-violet" aria-hidden="true" /> Usuarios</h2><p class="mt-1 text-sm text-ink-muted">{{ adminStore.users.length }} cuentas registradas en la plataforma.</p></div>
          <label class="relative min-w-0 sm:w-72"><i class="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" /><input v-model="userSearch" class="input w-full pl-9" type="search" placeholder="Buscar nombre o correo" aria-label="Buscar usuarios por nombre, correo o perfil" @input="usersLimit = 8" /></label>
        </div>
        <div v-if="!adminStore.users.length" class="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-ink-muted">No hay usuarios para mostrar.</div>
        <div v-else-if="!filteredUsers.length" class="py-8 text-center text-sm text-ink-muted">No encontramos usuarios con ese criterio.</div>
        <div v-else class="divide-y divide-border">
          <div v-for="u in displayedUsers" :key="u.id" class="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-tint text-sm font-bold text-violet">
                {{ userInitial(u) }}
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-navy">{{ userDisplayName(u) }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span :class="['text-xs px-1.5 py-0.5 rounded font-medium', ROLE_BADGE[u.role]]">
                    {{ ROLE_LABEL[u.role] ?? u.role }}
                  </span>
                  <span class="truncate text-xs text-ink-muted">{{ u.email }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span :class="u.is_active ? 'badge-active' : 'badge-muted'">
                {{ u.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <button v-if="u.role !== 'admin'"
                @click="toggleUser(u.id, u.is_active)"
                :disabled="togglingId === u.id"
                :class="['btn-ghost text-xs', u.is_active ? 'text-rose-700 hover:bg-rose-50' : 'text-violet']">
                <i :class="['pi', togglingId === u.id ? 'pi-spin pi-spinner' : u.is_active ? 'pi-user-minus' : 'pi-user-plus']" aria-hidden="true" />
                {{ togglingId === u.id ? 'Actualizando…' : u.is_active ? 'Desactivar' : 'Activar' }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="displayedUsers.length < filteredUsers.length" class="mt-3 border-t border-border pt-3 text-center">
          <button class="text-sm font-semibold text-violet hover:underline" @click="usersLimit += 8">Mostrar más usuarios ({{ filteredUsers.length - displayedUsers.length }} restantes)</button>
        </div>
      </section>

      <!-- Settings -->
      <section v-if="adminPage === 'settings'" class="card" aria-labelledby="settings-heading">
        <div class="mb-3 flex items-start gap-3 sm:mb-4">
          <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-tint text-violet"><i class="pi pi-sliders-h" aria-hidden="true" /></span>
          <div><h2 id="settings-heading" class="font-semibold text-navy">Parámetros económicos</h2><p class="mt-1 text-sm text-ink-muted">Valores globales que afectan la operación de la plataforma.</p></div>
        </div>
        <div v-if="adminStore.loading" class="text-center py-6 text-ink-muted">Cargando…</div>
        <div v-else class="divide-y divide-border">
          <div v-for="s in adminStore.settings" :key="s.key" class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-navy">{{ s.description || s.key }}</p>
              <p class="mt-1 text-xs text-ink-muted">Código: <code class="rounded bg-slate px-1.5 py-0.5">{{ s.key }}</code></p>
            </div>
            <div class="flex items-center justify-between gap-3 sm:justify-end">
              <template v-if="editingKey === s.key">
                <input v-model="editingValue" class="input w-32 text-sm" :aria-label="`Nuevo valor para ${s.description || s.key}`" @keyup.enter="saveSetting(s.key)" />
                <button @click="saveSetting(s.key)" :disabled="savingKey === s.key" class="btn-primary px-3 py-1.5 text-xs">{{ savingKey === s.key ? 'Guardando…' : 'Guardar' }}</button>
                <button @click="editingKey = null" class="btn-ghost px-3 py-1.5 text-xs">Cancelar</button>
              </template>
              <template v-else>
                <span class="rounded-lg bg-slate px-3 py-2 text-sm font-semibold tabular-nums text-navy">{{ s.value }}</span>
                <button @click="startEdit(s.key, s.value)" class="btn-ghost text-xs">Editar</button>
              </template>
            </div>
          </div>
        </div>
      </section>
      </template>
    </div>
  </AppLayout>
</template>
