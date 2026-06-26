<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '@/api/auth'

const email       = ref('')
const loading     = ref(false)
const sent        = ref(false)
const error       = ref('')
const devResetUrl = ref<string | null>(null)
const smtpError   = ref<string | null>(null)

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    const res = await authApi.forgotPassword(email.value)
    devResetUrl.value = res?.dev_reset_url ?? null
    smtpError.value   = (res as any)?.smtp_error ?? null
    sent.value = true
  } catch {
    error.value = 'Ocurrió un error. Inténtalo de nuevo.'
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
        <!-- Estado: enviado -->
        <template v-if="sent">
          <div class="text-center py-4">
            <div class="text-5xl mb-4">📬</div>
            <h2 class="text-xl font-display font-semibold text-navy mb-2">Revisa tu correo</h2>
            <p class="text-navy/60 text-sm">
              Si existe una cuenta con <strong>{{ email }}</strong>, recibirás un enlace para
              restablecer tu contraseña. El enlace expira en 1 hora.
            </p>
            <p class="text-navy/40 text-xs mt-3">¿No llegó? Revisa la carpeta de spam.</p>

            <!-- Solo visible en desarrollo -->
            <div v-if="devResetUrl" class="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
              <p class="text-xs font-semibold text-amber-700 mb-1">
                {{ smtpError ? '❌ Error SMTP — usa el enlace directo' : '⚠️ Modo desarrollo' }}
              </p>
              <p v-if="smtpError" class="text-xs text-red-600 mb-2 font-mono">{{ smtpError }}</p>
              <p class="text-xs text-amber-600 mb-2">Enlace para restablecer tu contraseña:</p>
              <a :href="devResetUrl" class="text-xs text-violet break-all underline">{{ devResetUrl }}</a>
            </div>
          </div>
        </template>

        <!-- Estado: formulario -->
        <template v-else>
          <h2 class="text-xl font-display font-semibold text-navy mb-2">Recuperar contraseña</h2>
          <p class="text-navy/50 text-sm mb-6">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>

          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label class="label">Correo electrónico</label>
              <InputText v-model="email" type="email" placeholder="tu@correo.com" fluid required />
            </div>

            <div v-if="error" class="bg-coral/10 text-coral text-sm p-3 rounded-lg">{{ error }}</div>

            <button type="submit" class="btn-primary w-full" :disabled="loading">
              {{ loading ? 'Enviando…' : 'Enviar enlace' }}
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
