<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { authApi } from '@/api/auth'
import { computed, onMounted, ref } from 'vue'

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
const devVerifyUrl   = ref<string | null>(null)

async function resendVerification() {
  resendLoading.value = true
  try {
    const res = await authApi.resendVerification()
    devVerifyUrl.value = res?.dev_verify_url ?? null
    resendDone.value = true
  } finally {
    resendLoading.value = false
  }
}

onMounted(async () => {
  await authStore.refreshUser()
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
    <header class="bg-navy text-white px-6 py-3 flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-3">
        <span class="text-violet font-display font-bold text-xl tracking-tight">hazloViral</span>
        <nav class="hidden sm:flex items-center gap-1 ml-6">
          <RouterLink to="/dashboard" :class="navLinkClass">Dashboard</RouterLink>

          <!-- Links para empresa -->
          <template v-if="user?.role === 'empresa'">
            <RouterLink to="/influencers"    :class="navLinkClass">🔍 Buscar</RouterLink>
            <RouterLink to="/chats"          :class="navLinkClass">Chats</RouterLink>
            <RouterLink to="/contratos"      :class="navLinkClass">Contratos</RouterLink>
            <RouterLink to="/perfil/empresa" :class="navLinkClass">Mi perfil</RouterLink>
          </template>

          <!-- Links para influencer -->
          <template v-else-if="user?.role === 'influencer'">
            <RouterLink to="/chats"              :class="navLinkClass">Chats</RouterLink>
            <RouterLink to="/contratos"          :class="navLinkClass">Contratos</RouterLink>
            <RouterLink to="/perfil/influencer"  :class="navLinkClass">Mi perfil</RouterLink>
          </template>

          <!-- Link exclusivo admin -->
          <RouterLink v-if="isAdmin" to="/admin" :class="navLinkClass">
            ⚙️ Admin
          </RouterLink>
        </nav>
      </div>

      <div class="flex items-center gap-4">
        <!-- Balance de créditos (solo empresa) -->
        <template v-if="authStore.isEmpresa && balance">
          <RouterLink to="/dashboard" class="flex items-center gap-2 text-sm">
            <span :class="isLow ? 'text-coral font-semibold' : 'text-slate/80'">
              {{ isLow ? '⚠️' : '💰' }} {{ balance.balance_creditos.toFixed(2) }} cr.
            </span>
          </RouterLink>
        </template>

        <div class="flex items-center gap-2">
          <span class="text-sm text-slate/60 hidden sm:block">{{ user?.email }}</span>
          <span class="badge-info">{{ user?.role }}</span>
          <button @click="logout" class="text-slate/50 hover:text-coral text-sm ml-2 transition-colors">
            Salir
          </button>
        </div>
      </div>
    </header>

    <!-- Alerta email no verificado -->
    <div v-if="emailUnverified" class="bg-amber-50 border-b border-amber-200 px-6 py-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-amber-800 text-sm font-medium">
          📧 Verifica tu correo electrónico para activar todas las funciones de la plataforma.
        </p>
        <div class="flex items-center gap-3">
          <span v-if="resendDone && !devVerifyUrl" class="text-green-700 text-xs font-medium">¡Enviado! Revisa tu bandeja.</span>
          <a v-if="devVerifyUrl" :href="devVerifyUrl" class="text-xs text-violet underline font-medium">
            [dev] Verificar ahora →
          </a>
          <button v-if="!resendDone" @click="resendVerification" :disabled="resendLoading"
            class="text-xs text-amber-700 border border-amber-400 rounded px-2 py-1 hover:bg-amber-100 transition-colors">
            {{ resendLoading ? 'Enviando…' : 'Reenviar correo' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Alerta saldo bajo (claude.md §5.1) -->
    <div v-if="isLow" class="bg-coral/10 border-b border-coral/30 px-6 py-2 flex items-center justify-between">
      <p class="text-coral text-sm font-medium">
        ⚠️ Saldo bajo el umbral mínimo ({{ balance?.deficit.toFixed(2) }} cr. de déficit).
        Los chats están en <strong>solo lectura</strong>.
      </p>
      <RouterLink to="/dashboard" class="text-sm underline text-coral font-semibold">Recargar créditos →</RouterLink>
    </div>

    <main class="flex-1 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
      <slot />
    </main>
  </div>
</template>
