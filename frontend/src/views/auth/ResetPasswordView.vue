<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const PWD_RULES = [
  { key: 'len',     label: 'Entre 8 y 128 caracteres',           test: (v: string) => v.length >= 8 && v.length <= 128 },
  { key: 'upper',   label: 'Al menos una mayúscula',              test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lower',   label: 'Al menos una minúscula',              test: (v: string) => /[a-z]/.test(v) },
  { key: 'number',  label: 'Al menos un número',                  test: (v: string) => /\d/.test(v) },
  { key: 'special', label: 'Al menos un carácter especial (!@#$…)', test: (v: string) => /[^A-Za-z\d]/.test(v) },
]
const pwdStrength = computed(() => PWD_RULES.map(r => ({ ...r, ok: r.test(newPassword.value) })))
const pwdValid    = computed(() => pwdStrength.value.every(r => r.ok))

onMounted(() => {
  token.value = (route.query.token as string) ?? ''
  if (!token.value) error.value = 'Enlace inválido. Solicita uno nuevo.'
})

async function submit() {
  error.value = ''
  if (!pwdValid.value) {
    error.value = 'La contraseña no cumple los requisitos de seguridad.'
    return
  }
  if (newPassword.value !== confirm.value) {
    error.value = 'Las contraseñas no coinciden.'
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
          <p class="text-navy/50 text-sm mb-6">Elige una contraseña que cumpla todos los requisitos.</p>

          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label class="label">Nueva contraseña</label>
              <Password v-model="newPassword" toggleMask fluid :feedback="false"
                promptLabel="Ingresa tu nueva contraseña" maxlength="128" />
              <!-- Checklist de seguridad -->
              <div v-if="newPassword" class="mt-2 space-y-1">
                <p v-for="r in pwdStrength" :key="r.key"
                  :class="['text-xs flex items-center gap-1.5', r.ok ? 'text-green-600' : 'text-navy/40']">
                  <span class="font-bold">{{ r.ok ? '✓' : '○' }}</span> {{ r.label }}
                </p>
              </div>
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
