<script setup lang="ts">
import { viewPath } from '@/router/paths'
import BrandName from '@/components/BrandName.vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { authApi } from '@/api/auth'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AvatarUpload from '@/components/AvatarUpload.vue'

const router       = useRouter()
const route = useRoute()
const mobileMenuOpen = ref(false)
const accountMenu = ref<HTMLElement | null>(null)
const accountButton = ref<HTMLButtonElement | null>(null)
const accountOpen = ref(false)
function closeAccount() {
  accountOpen.value = false
  accountButton.value?.focus()
}
const authStore    = useAuthStore()
const creditsStore = useCreditsStore()

const user           = computed(() => authStore.user)
const balance        = computed(() => creditsStore.balance)
const isLow          = computed(() => balance.value && !balance.value.is_above_threshold)
const profilePath = computed(() => user.value?.role === 'empresa' ? '/perfil/empresa' : user.value?.role === 'influencer' ? '/perfil/influencer' : null)
const roleLabel = computed(() => ({ empresa: 'Empresa', influencer: 'Influencer', admin: 'Administrador' })[user.value?.role ?? 'empresa'])
const navigationGroups = computed(() => {
  const groups = [{ label: 'General', items: [{ label: 'Inicio', path: '/dashboard', icon: 'pi-home' }] }]
  if (user.value?.role === 'empresa') {
    groups.push({ label: 'Campañas', items: [
      { label: 'Briefs de campaña', path: '/briefs', icon: 'pi-clipboard' },
      { label: 'Buscar influencers', path: '/influencers', icon: 'pi-search' },
      { label: 'Chats', path: '/chats', icon: 'pi-comments' },
      { label: 'Contratos', path: '/contratos', icon: 'pi-file-edit' },
    ] }, { label: 'Finanzas', items: [
      { label: 'Recargar saldo', path: '/saldo/recargar', icon: 'pi-wallet' },
      { label: 'Historial de pagos', path: '/pagos/comprobantes', icon: 'pi-receipt' },
    ] })
  } else if (user.value?.role === 'influencer') {
    groups.push({ label: 'Colaboraciones', items: [
      { label: 'Chats', path: '/chats', icon: 'pi-comments' },
      { label: 'Contratos', path: '/contratos', icon: 'pi-file-edit' },
    ] }, { label: 'Finanzas', items: [
      { label: 'Mis pagos', path: '/pagos/comprobantes', icon: 'pi-wallet' },
    ] })
  } else if (user.value?.role === 'admin') {
    groups.push({ label: 'Administración', items: [
      { label: 'Panel de administración', path: '/admin', icon: 'pi-cog' },
      { label: 'Buscar influencers', path: '/influencers', icon: 'pi-search' },
    ] })
  }
  return groups
})
function itemActive(path: string) {
  if (route.path === viewPath(path)) return true
  if (path === '/contratos') return route.name === 'contrato'
  if (path === '/chats') return route.name === 'chat'
  if (path === '/influencers') return route.name === 'influencer-public'
  return false
}
const emailUnverified = computed(() => user.value && !user.value.is_email_verified)
const resendLoading  = ref(false)
const resendDone     = ref(false)

async function resendVerification() {
  resendLoading.value = true
  try {
    await authApi.resendVerification()
    resendDone.value = true
  } finally {
    resendLoading.value = false
  }
}

function closeAccountOnOutsideClick(event: MouseEvent) {
  if (event.target instanceof Node && !accountMenu.value?.contains(event.target)) {
    accountOpen.value = false
  }
}
onUnmounted(() => document.removeEventListener('click', closeAccountOnOutsideClick))
onMounted(async () => {
  document.addEventListener('click', closeAccountOnOutsideClick)
  if (authStore.isEmpresa) await creditsStore.fetchBalance()
})

function logout() {
  authStore.logout()
  router.push('/login')
}

</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate">
    <header class="relative bg-navy text-white shadow-lg">
      <div class="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 2xl:gap-6">
        <div class="flex items-center gap-3 shrink-0">
          <button type="button" class="2xl:hidden p-2 rounded-lg ui-hover-inverse focus-visible:outline-2 focus-visible:outline-white"
            :aria-expanded="mobileMenuOpen" aria-controls="main-navigation" :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'" @click="mobileMenuOpen = !mobileMenuOpen">
            <i :class="['pi', mobileMenuOpen ? 'pi-times' : 'pi-bars']" aria-hidden="true" />
          </button>
          <RouterLink :to="viewPath('/dashboard')" class="text-xl" aria-label="InfluSmart — Inicio"><BrandName /></RouterLink>
        </div>
      <nav id="main-navigation" aria-label="Navegación principal" :class="mobileMenuOpen ? 'block' : 'hidden 2xl:block'" class="absolute top-full left-0 right-0 z-40 bg-navy border-t border-white/10 p-4 shadow-lg 2xl:static 2xl:flex-1 2xl:min-w-0 2xl:border-0 2xl:p-0 2xl:shadow-none">
        <div class="flex flex-col 2xl:flex-row 2xl:items-center gap-4 2xl:gap-3">
          <section v-for="group in navigationGroups" :key="group.label" :aria-label="group.label" class="2xl:border-r 2xl:border-white/15 2xl:pr-3 last:border-0 last:pr-0">
            <p class="2xl:sr-only text-[10px] font-semibold uppercase tracking-wider text-white/60 px-2 mb-1">{{ group.label }}</p>
            <div class="flex flex-wrap 2xl:flex-nowrap gap-1">
              <RouterLink v-for="item in group.items" :key="item.path" :to="viewPath(item.path)"
                :aria-current="itemActive(item.path) ? 'page' : undefined" @click="mobileMenuOpen = false"
                class="inline-flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-white"
                :class="itemActive(item.path) ? 'bg-white/15 text-white font-semibold' : 'text-white/80 ui-hover-inverse'">
                <i :class="['pi', item.icon]" aria-hidden="true" />{{ item.label }}
              </RouterLink>
            </div>
          </section>
        </div>
      </nav>
        <div class="flex items-center gap-3 sm:gap-5 min-w-0 shrink-0">
          <RouterLink v-if="authStore.isEmpresa && balance" :to="viewPath('/saldo/recargar')"
            class="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm ui-hover-inverse whitespace-nowrap"
            title="Saldo disponible. Recargar saldo" :class="isLow ? 'text-rose-200' : 'text-white'">
            <i class="pi pi-wallet" aria-hidden="true" />
            <span>${{ balance.balance_creditos.toFixed(2) }} <span class="hidden sm:inline">USD</span></span>
          </RouterLink>
          <AvatarUpload :name="user?.email ?? ''" size="sm" />
          <div ref="accountMenu" class="relative" @keydown.esc.stop.prevent="closeAccount">
            <button ref="accountButton" id="account-toggle" type="button" :aria-expanded="accountOpen" aria-controls="account-panel"
              @click="accountOpen = !accountOpen"
              class="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 ui-hover-inverse focus-visible:outline-2 focus-visible:outline-white">
              <span class="text-sm font-semibold whitespace-nowrap">Mi cuenta</span>
              <i class="pi pi-chevron-down text-xs" aria-hidden="true" />
            </button>
            <div v-if="accountOpen" id="account-panel" aria-labelledby="account-toggle" class="absolute right-0 top-full mt-2 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white text-navy shadow-lg p-2">
              <div class="px-3 py-2 border-b border-border mb-1">
                <p class="text-xs text-ink-muted">{{ roleLabel }}</p>
                <p class="text-sm font-medium break-all mt-1 select-text cursor-text">{{ user?.email }}</p>
              </div>
              <RouterLink v-if="profilePath" :to="viewPath(profilePath)" @click="accountOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm ui-hover focus-visible:outline-2 focus-visible:outline-violet">
                <i class="pi pi-user" aria-hidden="true" />Mi perfil
              </RouterLink>
              <button type="button" @click="logout" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-coral-text ui-hover-danger focus-visible:outline-2 focus-visible:outline-violet">
                <i class="pi pi-sign-out" aria-hidden="true" />Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

    </header>

    <!-- Alerta email no verificado -->
    <div v-if="emailUnverified" class="bg-warning-tint border-b border-amber-200 px-6 py-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-warning text-sm font-medium">
          <i class="pi pi-envelope mr-1.5" aria-hidden="true" />Verifica tu correo electrónico para activar todas las funciones de la plataforma.
        </p>
        <div class="flex items-center gap-3">
          <span v-if="resendDone" class="text-success text-xs font-medium">¡Enviado! Revisa tu bandeja.</span>
          <button v-if="!resendDone" @click="resendVerification" :disabled="resendLoading"
            class="text-xs text-warning border border-amber-400 rounded px-2 py-1 ui-hover transition-colors">
            {{ resendLoading ? 'Enviando…' : 'Reenviar correo' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Alerta saldo bajo (claude.md §5.1) -->
    <div v-if="isLow" class="bg-coral/10 border-b border-coral/30 px-6 py-2 flex items-center justify-between">
      <p class="text-coral-text text-sm font-medium">
        <i class="pi pi-exclamation-triangle mr-1.5" aria-hidden="true" />Saldo bajo el mínimo (te faltan ${{ balance?.deficit.toFixed(2) }} USD).
        Los chats están en <strong>solo lectura</strong>.
      </p>
      <RouterLink :to="viewPath('/saldo/recargar')" class="text-sm underline text-coral-text font-semibold">Recargar saldo →</RouterLink>
    </div>

    <main class="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1600px] xl:w-[90%]">
      <slot />
    </main>
  </div>
</template>
