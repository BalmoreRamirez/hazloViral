<script setup lang="ts">
import { viewPath } from '@/router/paths'
import BrandName from '@/components/BrandName.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { authApi } from '@/api/auth'
import { computed, onMounted, ref } from 'vue'
import AvatarUpload from '@/components/AvatarUpload.vue'

const router       = useRouter()
const authStore    = useAuthStore()
const creditsStore = useCreditsStore()

const user           = computed(() => authStore.user)
const balance        = computed(() => creditsStore.balance)
const isLow          = computed(() => balance.value && !balance.value.is_above_threshold)
const isAdmin        = computed(() => user.value?.role === 'admin')
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

onMounted(async () => {
  if (authStore.isEmpresa) await creditsStore.fetchBalance()
})

function logout() {
  authStore.logout()
  router.push('/login')
}

const navLinkClass = 'px-3 py-1.5 rounded-lg text-sm text-slate/70 hover:text-white hover:bg-white/10 transition-colors [&.router-link-active]:text-white [&.router-link-active]:bg-white/10'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate">
    <!-- Navbar -->
    <header class="bg-navy text-white px-6 py-3 flex flex-wrap gap-3 items-center justify-between shadow-lg">
      <div class="flex items-center gap-3">
        <RouterLink :to="viewPath('/dashboard')" class="text-xl"><BrandName /></RouterLink>
        <nav class="hidden sm:flex flex-wrap items-center gap-1 ml-6">
          <RouterLink :to="viewPath('/dashboard')" :class="navLinkClass">Dashboard</RouterLink>

          <!-- Links para empresa -->
          <template v-if="user?.role === 'empresa'">
            <RouterLink :to="viewPath('/briefs')" :class="navLinkClass">Briefs de campaña</RouterLink>
            <RouterLink :to="viewPath('/influencers')"    :class="navLinkClass"><span class="inline-flex items-center gap-1.5"><i class="pi pi-search" aria-hidden="true" />Buscar</span></RouterLink>
            <RouterLink :to="viewPath('/chats')"          :class="navLinkClass">Chats</RouterLink>
            <RouterLink :to="viewPath('/contratos')"      :class="navLinkClass">Contratos</RouterLink>
            <RouterLink :to="viewPath('/pagos/comprobantes')" :class="navLinkClass">Pagos</RouterLink>
            <RouterLink :to="viewPath('/perfil/empresa')" :class="navLinkClass">Mi perfil</RouterLink>
          </template>

          <!-- Links para influencer -->
          <template v-else-if="user?.role === 'influencer'">
            <RouterLink :to="viewPath('/chats')"              :class="navLinkClass">Chats</RouterLink>
            <RouterLink :to="viewPath('/contratos')"          :class="navLinkClass">Contratos</RouterLink>
            <RouterLink :to="viewPath('/pagos/comprobantes')" :class="navLinkClass">Pagos</RouterLink>
            <RouterLink :to="viewPath('/perfil/influencer')"  :class="navLinkClass">Mi perfil</RouterLink>
          </template>

          <!-- Link exclusivo admin -->
          <RouterLink v-if="isAdmin" :to="viewPath('/admin')" :class="navLinkClass">
            <span class="inline-flex items-center gap-1.5"><i class="pi pi-cog" aria-hidden="true" />Admin</span>
          </RouterLink>
        </nav>
      </div>

      <div class="flex items-center gap-4">
        <!-- Balance de créditos (solo empresa) -->
        <template v-if="authStore.isEmpresa && balance">
          <RouterLink :to="viewPath('/dashboard')" class="flex items-center gap-2 text-sm" title="Saldo disponible — clic para recargar">
            <span class="inline-flex items-center gap-1.5" :class="isLow ? 'text-coral-text font-semibold' : 'text-slate/80'">
              <i :class="['pi', isLow ? 'pi-exclamation-triangle' : 'pi-wallet']" aria-hidden="true" />
              ${{ balance.balance_creditos.toFixed(2) }} USD
            </span>
          </RouterLink>
        </template>

        <div class="flex items-center gap-3">
          <span class="text-sm text-slate/60 hidden sm:block">{{ user?.email }}</span>
          <span class="badge-info">{{ user?.role }}</span>
          <AvatarUpload :name="user?.email ?? ''" size="sm" />
          <button @click="logout" class="text-slate/50 hover:text-coral-text text-sm transition-colors">
            Salir
          </button>
        </div>
      </div>
    </header>

    <nav v-if="authStore.isEmpresa" class="sm:hidden px-4 py-2 bg-white border-b border-border" aria-label="Campañas">
      <RouterLink :to="viewPath('/briefs')" class="text-sm font-semibold text-violet inline-flex items-center gap-2">
        <i class="pi pi-clipboard" aria-hidden="true" />Briefs de campaña
      </RouterLink>
    </nav>

    <!-- Alerta email no verificado -->
    <div v-if="emailUnverified" class="bg-warning-tint border-b border-amber-200 px-6 py-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-warning text-sm font-medium">
          <i class="pi pi-envelope mr-1.5" aria-hidden="true" />Verifica tu correo electrónico para activar todas las funciones de la plataforma.
        </p>
        <div class="flex items-center gap-3">
          <span v-if="resendDone" class="text-success text-xs font-medium">¡Enviado! Revisa tu bandeja.</span>
          <button v-if="!resendDone" @click="resendVerification" :disabled="resendLoading"
            class="text-xs text-warning border border-amber-400 rounded px-2 py-1 hover:bg-warning-tint transition-colors">
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
      <RouterLink :to="viewPath('/dashboard')" class="text-sm underline text-coral-text font-semibold">Recargar saldo →</RouterLink>
    </div>

    <main class="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1600px] xl:w-[90%]">
      <slot />
    </main>
  </div>
</template>
