<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const authStore = useAuthStore()
const role      = ref<'empresa' | 'influencer'>('empresa')
const error     = ref('')
const loading   = ref(false)

// Campos comunes
const email    = ref(''); const password = ref('')
// Empresa
const nombre_comercial = ref(''); const sitio_web = ref('')
// Influencer
const nombre_artistico = ref(''); const bio = ref('')
const ubicacion = ref(''); const tarifa_base = ref(0)
const fecha_nacimiento = ref('')
// Tutor (menores)
const tutor_nombre = ref(''); const tutor_documento_id = ref('')
const tutor_email  = ref(''); const tutor_autorizacion = ref(false)

const esMenor = computed(() => {
  if (!fecha_nacimiento.value) return false
  const birth = new Date(fecha_nacimiento.value)
  const age18 = new Date(); age18.setFullYear(age18.getFullYear() - 18)
  return birth > age18
})

async function submit() {
  error.value = ''; loading.value = true
  try {
    if (role.value === 'empresa') {
      await authStore.registerEmpresa({
        email: email.value, password: password.value,
        nombre_comercial: nombre_comercial.value,
        sitio_web: sitio_web.value || undefined,
      })
    } else {
      await authStore.registerInfluencer({
        email: email.value, password: password.value,
        nombre_artistico: nombre_artistico.value,
        bio: bio.value || undefined, ubicacion: ubicacion.value || undefined,
        tarifa_base: tarifa_base.value || undefined,
        fecha_nacimiento: fecha_nacimiento.value,
        ...(esMenor.value ? {
          tutor_nombre: tutor_nombre.value, tutor_documento_id: tutor_documento_id.value,
          tutor_email: tutor_email.value, tutor_autorizacion: tutor_autorizacion.value,
        } : {}),
      })
    }
    router.push('/dashboard')
  } catch (e: any) {
    const msg = e.response?.data?.message
    error.value = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al registrarse.')
  } finally { loading.value = false }
}
</script>

<template>
  <div class="min-h-screen bg-navy flex items-center justify-center p-4">
    <div class="w-full max-w-lg">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-display font-bold text-white mb-1">hazloViral</h1>
        <p class="text-slate/60">Crea tu cuenta</p>
      </div>

      <div class="card">
        <!-- Selector de rol -->
        <div class="flex rounded-lg border border-navy/15 p-1 mb-6 gap-1">
          <button v-for="r in ['empresa','influencer']" :key="r"
            @click="role = r as any"
            :class="['flex-1 py-2 rounded-md text-sm font-semibold transition-all', role === r ? 'bg-violet text-white shadow' : 'text-navy/50 hover:text-navy']">
            {{ r === 'empresa' ? '🏢 Soy una Marca' : '⭐ Soy Influencer' }}
          </button>
        </div>

        <form @submit.prevent="submit" class="space-y-4">
          <!-- Comunes -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Email</label>
              <input v-model="email" type="email" class="input" required />
            </div>
            <div>
              <label class="label">Contraseña</label>
              <input v-model="password" type="password" class="input" minlength="8" required />
            </div>
          </div>

          <!-- Empresa -->
          <template v-if="role === 'empresa'">
            <div>
              <label class="label">Nombre comercial</label>
              <input v-model="nombre_comercial" class="input" required />
            </div>
            <div>
              <label class="label">Sitio web (opcional)</label>
              <input v-model="sitio_web" type="url" class="input" placeholder="https://" />
            </div>
            <div class="bg-violet/10 rounded-lg p-3 text-sm text-violet">
              🎁 Recibirás <strong>$10.00 en créditos</strong> al completar el registro.
            </div>
          </template>

          <!-- Influencer -->
          <template v-else>
            <div>
              <label class="label">Nombre artístico</label>
              <input v-model="nombre_artistico" class="input" required />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Ubicación</label>
                <input v-model="ubicacion" class="input" placeholder="Bogotá, Colombia" />
              </div>
              <div>
                <label class="label">Tarifa base (USD)</label>
                <input v-model.number="tarifa_base" type="number" min="0" class="input" />
              </div>
            </div>
            <div>
              <label class="label">Fecha de nacimiento</label>
              <input v-model="fecha_nacimiento" type="date" class="input" required />
            </div>
            <div>
              <label class="label">Bio (opcional)</label>
              <textarea v-model="bio" class="input" rows="2" />
            </div>

            <!-- Tutor si es menor -->
            <template v-if="esMenor">
              <div class="bg-coral/10 border border-coral/30 rounded-lg p-3 text-sm text-coral">
                ⚠️ Eres menor de 18 años. Se requieren los datos de tu tutor legal.
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Nombre del tutor</label>
                  <input v-model="tutor_nombre" class="input" required />
                </div>
                <div>
                  <label class="label">Documento ID del tutor</label>
                  <input v-model="tutor_documento_id" class="input" required />
                </div>
              </div>
              <div>
                <label class="label">Email del tutor</label>
                <input v-model="tutor_email" type="email" class="input" required />
              </div>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="tutor_autorizacion" type="checkbox" class="rounded" required />
                <span>El tutor legal autoriza la cuenta y co-titularidad financiera.</span>
              </label>
            </template>
          </template>

          <div v-if="error" class="bg-coral/10 text-coral text-sm p-3 rounded-lg">{{ error }}</div>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="text-center text-sm text-navy/50 mt-4">
          ¿Ya tienes cuenta?
          <RouterLink to="/login" class="text-violet font-semibold">Iniciar sesión</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
