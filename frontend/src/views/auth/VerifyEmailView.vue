<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

const route   = useRoute()
const router  = useRouter()
const auth    = useAuthStore()

const status  = ref<'loading' | 'ok' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  const token = (route.query.token as string) ?? ''
  if (!token) { status.value = 'error'; message.value = 'Enlace inválido.'; return }

  try {
    await authApi.verifyEmail(token)
    status.value = 'ok'
    await auth.refreshUser()
  } catch (e: any) {
    status.value  = 'error'
    message.value = e.response?.data?.message ?? 'El enlace no es válido o ha expirado.'
  }
})
</script>

<template>
  <div class="min-h-screen bg-navy flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-4">
          <div class="relative">
            <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet to-coral opacity-40 blur-xl scale-110"></div>
            <div class="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet to-coral flex items-center justify-center shadow-lg shadow-violet/30">
              <svg viewBox="0 0 32 32" class="w-11 h-11" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3 L9 18 L15.5 18 L13 29 L23 14 L16.5 14 Z" fill="white" fill-opacity="0.95"/>
              </svg>
            </div>
          </div>
        </div>
        <h1 class="text-4xl font-display font-bold text-white mb-1">hazloViral</h1>
      </div>

      <div class="card text-center py-6">
        <!-- Cargando -->
        <template v-if="status === 'loading'">
          <div class="text-4xl mb-4 animate-pulse">📧</div>
          <p class="text-navy/60">Verificando tu correo…</p>
        </template>

        <!-- Éxito -->
        <template v-else-if="status === 'ok'">
          <div class="text-5xl mb-4">✅</div>
          <h2 class="text-xl font-display font-semibold text-navy mb-2">¡Correo verificado!</h2>
          <p class="text-navy/60 text-sm mb-6">Tu cuenta está activa y lista para usar.</p>
          <button class="btn-primary w-full" @click="router.push(auth.isAuthenticated ? '/dashboard' : '/login')">
            {{ auth.isAuthenticated ? 'Ir al dashboard' : 'Iniciar sesión' }}
          </button>
        </template>

        <!-- Error -->
        <template v-else>
          <div class="text-5xl mb-4">❌</div>
          <h2 class="text-xl font-display font-semibold text-navy mb-2">No se pudo verificar</h2>
          <p class="text-navy/60 text-sm mb-6">{{ message }}</p>
          <div class="space-y-2">
            <button v-if="auth.isAuthenticated" class="btn-primary w-full"
              @click="router.push('/dashboard')">
              Ir al dashboard
            </button>
            <RouterLink to="/login" class="block text-sm text-violet text-center underline">
              Iniciar sesión
            </RouterLink>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
