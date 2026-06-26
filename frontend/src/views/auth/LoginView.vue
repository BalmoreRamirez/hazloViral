<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const authStore = useAuthStore()
const email     = ref('')
const password  = ref('')
const error     = ref('')
const loading   = ref(false)

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'Credenciales incorrectas.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-navy flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <!-- Brand logo -->
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
        <p class="text-slate/60">Conecta marcas con influencers en Latam</p>
      </div>

      <div class="card">
        <h2 class="text-xl font-display font-semibold text-navy mb-6">Iniciar sesión</h2>

        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="label">Correo electrónico</label>
            <InputText v-model="email" placeholder="tu@correo.com" fluid required />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="label mb-0">Contraseña</label>
              <RouterLink to="/forgot-password" class="text-xs text-violet hover:underline">
                ¿Olvidaste tu contraseña?
              </RouterLink>
            </div>
            <Password v-model="password" toggleMask fluid :feedback="false" />
          </div>

          <div v-if="error" class="bg-coral/10 text-coral text-sm p-3 rounded-lg">{{ error }}</div>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            {{ loading ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="text-center text-sm text-navy/50 mt-4">
          ¿No tienes cuenta?
          <RouterLink to="/register" class="text-violet font-semibold">Regístrate</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
