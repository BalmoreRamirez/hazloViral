<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const route  = useRoute()
const router = useRouter()

const token       = ref('')
const newPassword = ref('')
const confirm     = ref('')
const loading     = ref(false)
const success     = ref(false)
const error       = ref('')

onMounted(() => {
  token.value = (route.query.token as string) ?? ''
  if (!token.value) error.value = 'Enlace inválido. Solicita uno nuevo.'
})

async function submit() {
  error.value = ''
  if (newPassword.value !== confirm.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  loading.value = true
  try {
    await authApi.resetPassword(token.value, newPassword.value)
    success.value = true
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'El enlace no es válido o ha expirado.'
  } finally {
    loading.value = false
  }
}
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

      <div class="card">
        <!-- Estado: contraseña restablecida -->
        <template v-if="success">
          <div class="text-center py-4">
            <div class="text-5xl mb-4">✅</div>
            <h2 class="text-xl font-display font-semibold text-navy mb-2">¡Contraseña restablecida!</h2>
            <p class="text-navy/60 text-sm mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <button class="btn-primary w-full" @click="router.push('/login')">Ir al login</button>
          </div>
        </template>

        <!-- Estado: formulario -->
        <template v-else>
          <h2 class="text-xl font-display font-semibold text-navy mb-2">Nueva contraseña</h2>
          <p class="text-navy/50 text-sm mb-6">Elige una contraseña segura de al menos 8 caracteres.</p>

          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label class="label">Nueva contraseña</label>
              <Password v-model="newPassword" toggleMask fluid :feedback="true"
                promptLabel="Ingresa tu nueva contraseña"
                weakLabel="Débil" mediumLabel="Media" strongLabel="Fuerte" />
            </div>
            <div>
              <label class="label">Confirmar contraseña</label>
              <Password v-model="confirm" toggleMask fluid :feedback="false" />
            </div>

            <div v-if="error" class="bg-coral/10 text-coral text-sm p-3 rounded-lg">{{ error }}</div>

            <button type="submit" class="btn-primary w-full" :disabled="loading || !token">
              {{ loading ? 'Guardando…' : 'Restablecer contraseña' }}
            </button>
          </form>
        </template>

        <p class="text-center text-sm text-navy/50 mt-5">
          <RouterLink to="/login" class="text-violet font-semibold">← Volver al login</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
