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
        <h1 class="text-4xl font-display font-bold text-white mb-1">hazloViral</h1>
        <p class="text-slate/60">Conecta marcas con influencers en Latam</p>
      </div>

      <div class="card">
        <h2 class="text-xl font-display font-semibold text-navy mb-6">Iniciar sesión</h2>

        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="label">Correo electrónico</label>
            <input v-model="email" type="email" class="input" placeholder="tu@empresa.com" required />
          </div>
          <div>
            <label class="label">Contraseña</label>
            <input v-model="password" type="password" class="input" placeholder="••••••••" required />
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
