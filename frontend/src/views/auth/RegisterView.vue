<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength, helpers } from '@vuelidate/validators'

const router    = useRouter()
const authStore = useAuthStore()
const role      = ref<'empresa' | 'influencer'>('empresa')
const error     = ref('')
const loading   = ref(false)

// Campos comunes
const email_    = ref(''); const password = ref('')
const pais      = ref(''); const direccion = ref('')
// Empresa
const nombre_comercial = ref(''); const sitio_web = ref('')
// Influencer
const nombre_artistico = ref(''); const bio = ref('')
const tarifa_base      = ref(0);  const fecha_nacimiento = ref('')
// Tutor (menores)
const tutor_nombre       = ref(''); const tutor_documento_id = ref('')
const tutor_email        = ref(''); const tutor_autorizacion = ref(false)

const paises = [
  'Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba',
  'Ecuador','El Salvador','España','Estados Unidos','Guatemala','Honduras',
  'México','Nicaragua','Panamá','Paraguay','Perú','Puerto Rico',
  'República Dominicana','Uruguay','Venezuela','Otro',
]

const esMenor = computed(() => {
  if (!fecha_nacimiento.value) return false
  const birth  = new Date(fecha_nacimiento.value)
  const age18  = new Date(); age18.setFullYear(age18.getFullYear() - 18)
  return birth > age18
})

// ── Validadores custom ────────────────────────────────────────────────────────
const urlValida = helpers.withMessage(
  'Debe ser una URL válida (https://...)',
  (v: string) => !v || /^https?:\/\/.+/.test(v),
)
const debeAceptar = helpers.withMessage(
  'El tutor debe autorizar la cuenta',
  (v: boolean) => v === true,
)

// ── Reglas dinámicas por rol ──────────────────────────────────────────────────
const rules = computed(() => {
  const base = {
    email_: {
      required: helpers.withMessage('El email es obligatorio', required),
      email:    helpers.withMessage('Formato de email inválido', email),
    },
    password: {
      required:   helpers.withMessage('La contraseña es obligatoria', required),
      minLength:  helpers.withMessage('Mínimo 8 caracteres', minLength(8)),
    },
  }

  if (role.value === 'empresa') {
    return {
      ...base,
      nombre_comercial: { required: helpers.withMessage('El nombre comercial es obligatorio', required) },
      sitio_web:        { urlValida },
    }
  }

  const inf = {
    ...base,
    nombre_artistico:  { required: helpers.withMessage('El nombre artístico es obligatorio', required) },
    fecha_nacimiento:  { required: helpers.withMessage('La fecha de nacimiento es obligatoria', required) },
  }

  if (!esMenor.value) return inf

  return {
    ...inf,
    tutor_nombre:       { required: helpers.withMessage('El nombre del tutor es obligatorio', required) },
    tutor_documento_id: { required: helpers.withMessage('El documento del tutor es obligatorio', required) },
    tutor_email: {
      required: helpers.withMessage('El email del tutor es obligatorio', required),
      email:    helpers.withMessage('Formato de email del tutor inválido', email),
    },
    tutor_autorizacion: { debeAceptar },
  }
})

const v$ = useVuelidate(rules, {
  email_, password,
  nombre_comercial, sitio_web,
  nombre_artistico, fecha_nacimiento,
  tutor_nombre, tutor_documento_id, tutor_email, tutor_autorizacion,
})

// Resetear validación al cambiar de rol
watch(role, () => v$.value.$reset())

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  error.value = ''; loading.value = true
  try {
    if (role.value === 'empresa') {
      await authStore.registerEmpresa({
        email: email_.value, password: password.value,
        nombre_comercial: nombre_comercial.value,
        sitio_web:  sitio_web.value  || undefined,
        pais:       pais.value       || undefined,
        direccion:  direccion.value  || undefined,
      })
    } else {
      await authStore.registerInfluencer({
        email: email_.value, password: password.value,
        nombre_artistico: nombre_artistico.value,
        bio:        bio.value       || undefined,
        ubicacion:  pais.value      || undefined,
        direccion:  direccion.value || undefined,
        tarifa_base: tarifa_base.value || undefined,
        fecha_nacimiento: fecha_nacimiento.value,
        ...(esMenor.value ? {
          tutor_nombre: tutor_nombre.value,
          tutor_documento_id: tutor_documento_id.value,
          tutor_email: tutor_email.value,
          tutor_autorizacion: tutor_autorizacion.value,
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
            type="button"
            @click="role = r as any"
            :class="['flex-1 py-2 rounded-md text-sm font-semibold transition-all',
              role === r ? 'bg-violet text-white shadow' : 'text-navy/50 hover:text-navy']">
            {{ r === 'empresa' ? '🏢 Soy una Marca' : '⭐ Soy Influencer' }}
          </button>
        </div>

        <form @submit.prevent="submit" novalidate class="space-y-4">

          <!-- ── Campos comunes ─────────────────────────────────────────────── -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Email</label>
              <input
                v-model="email_" type="email" required
                :class="['input', { '!border-coral': v$.email_.$error }]"
                @blur="v$.email_.$touch()" />
              <p v-if="v$.email_.$error" class="text-coral text-xs mt-1">
                {{ v$.email_.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label">Contraseña</label>
              <input
                v-model="password" type="password" required
                :class="['input', { '!border-coral': v$.password.$error }]"
                @blur="v$.password.$touch()" />
              <p v-if="v$.password.$error" class="text-coral text-xs mt-1">
                {{ v$.password.$errors[0]?.$message }}
              </p>
            </div>
          </div>

          <!-- ── Empresa ────────────────────────────────────────────────────── -->
          <template v-if="role === 'empresa'">
            <div>
              <label class="label">Nombre comercial</label>
              <input
                v-model="nombre_comercial" required
                :class="['input', { '!border-coral': v$.nombre_comercial?.$error }]"
                @blur="v$.nombre_comercial?.$touch()" />
              <p v-if="v$.nombre_comercial?.$error" class="text-coral text-xs mt-1">
                {{ v$.nombre_comercial.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label">Sitio web (opcional)</label>
              <input
                v-model="sitio_web" type="url" placeholder="https://"
                :class="['input', { '!border-coral': v$.sitio_web?.$error }]"
                @blur="v$.sitio_web?.$touch()" />
              <p v-if="v$.sitio_web?.$error" class="text-coral text-xs mt-1">
                {{ v$.sitio_web.$errors[0]?.$message }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">País</label>
                <Select v-model="pais" :options="paises" filter
                  placeholder="Selecciona un país" class="w-full" />
              </div>
              <div>
                <label class="label">Dirección (opcional)</label>
                <input v-model="direccion" class="input" placeholder="Calle, ciudad…" />
              </div>
            </div>
            <div class="bg-violet/10 rounded-lg p-3 text-sm text-violet">
              🎁 Recibirás <strong>$10.00 en créditos</strong> al completar el registro.
            </div>
          </template>

          <!-- ── Influencer ─────────────────────────────────────────────────── -->
          <template v-else>
            <div>
              <label class="label">Nombre artístico</label>
              <input
                v-model="nombre_artistico" required
                :class="['input', { '!border-coral': v$.nombre_artistico?.$error }]"
                @blur="v$.nombre_artistico?.$touch()" />
              <p v-if="v$.nombre_artistico?.$error" class="text-coral text-xs mt-1">
                {{ v$.nombre_artistico.$errors[0]?.$message }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">País</label>
                <Select v-model="pais" :options="paises" filter
                  placeholder="Selecciona un país" class="w-full" />
              </div>
              <div>
                <label class="label">Tarifa base (USD)</label>
                <input v-model.number="tarifa_base" type="number" min="0" class="input" />
              </div>
            </div>
            <div>
              <label class="label">Dirección (opcional)</label>
              <input v-model="direccion" class="input" placeholder="Calle, ciudad…" />
            </div>
            <div>
              <label class="label">Fecha de nacimiento</label>
              <input
                v-model="fecha_nacimiento" type="date" required
                :class="['input', { '!border-coral': v$.fecha_nacimiento?.$error }]"
                @blur="v$.fecha_nacimiento?.$touch()" />
              <p v-if="v$.fecha_nacimiento?.$error" class="text-coral text-xs mt-1">
                {{ v$.fecha_nacimiento.$errors[0]?.$message }}
              </p>
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
                  <input
                    v-model="tutor_nombre" required
                    :class="['input', { '!border-coral': v$.tutor_nombre?.$error }]"
                    @blur="v$.tutor_nombre?.$touch()" />
                  <p v-if="v$.tutor_nombre?.$error" class="text-coral text-xs mt-1">
                    {{ v$.tutor_nombre.$errors[0]?.$message }}
                  </p>
                </div>
                <div>
                  <label class="label">Documento ID del tutor</label>
                  <input
                    v-model="tutor_documento_id" required
                    :class="['input', { '!border-coral': v$.tutor_documento_id?.$error }]"
                    @blur="v$.tutor_documento_id?.$touch()" />
                  <p v-if="v$.tutor_documento_id?.$error" class="text-coral text-xs mt-1">
                    {{ v$.tutor_documento_id.$errors[0]?.$message }}
                  </p>
                </div>
              </div>
              <div>
                <label class="label">Email del tutor</label>
                <input
                  v-model="tutor_email" type="email" required
                  :class="['input', { '!border-coral': v$.tutor_email?.$error }]"
                  @blur="v$.tutor_email?.$touch()" />
                <p v-if="v$.tutor_email?.$error" class="text-coral text-xs mt-1">
                  {{ v$.tutor_email.$errors[0]?.$message }}
                </p>
              </div>
              <div>
                <label class="flex items-start gap-2 text-sm cursor-pointer"
                  :class="{ 'text-coral': v$.tutor_autorizacion?.$error }">
                  <input
                    v-model="tutor_autorizacion" type="checkbox" required
                    class="mt-0.5 rounded"
                    @change="v$.tutor_autorizacion?.$touch()" />
                  <span>El tutor legal autoriza la cuenta y co-titularidad financiera.</span>
                </label>
                <p v-if="v$.tutor_autorizacion?.$error" class="text-coral text-xs mt-1">
                  {{ v$.tutor_autorizacion.$errors[0]?.$message }}
                </p>
              </div>
            </template>
          </template>

          <!-- Error de servidor -->
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
