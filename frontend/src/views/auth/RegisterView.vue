<script setup lang="ts">
import RequiredMark from '@/components/RequiredMark.vue'
import { calculateAge } from '@/utils/date'
import { viewPath } from '@/router/paths'
import BrandName from '@/components/BrandName.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVuelidate } from '@vuelidate/core'
import { required, email, helpers } from '@vuelidate/validators'
import { DEPARTAMENTOS_SV } from '@/constants/ubicaciones'
import { RUBROS } from '@/constants/rubros'

const router    = useRouter()
const authStore = useAuthStore()
const role      = ref<'empresa' | 'influencer'>('empresa')
const error        = ref('')
const loading      = ref(false)
const registered   = ref(false)
const step = ref(1)
const advancing = ref(false)
const showPassword = ref(false)
const stepHeading = ref<HTMLElement | null>(null)
const steps = computed(() => ['Tu cuenta', role.value === 'empresa' ? 'Tu empresa' : 'Tu perfil', 'Verificación'])
async function focusStep() {
  await nextTick()
  stepHeading.value?.focus()
}
async function nextStep() {
  if (loading.value || advancing.value || step.value >= 3) return
  advancing.value = true
  try {
    const keys = step.value === 1 ? ['email_', 'password'] : role.value === 'empresa'
      ? ['nombre_comercial', 'sitio_web', 'telefono'] : ['username', 'nombre_artistico']
    const results = await Promise.all(keys.map(key => v$.value[key]?.$validate()))
    if (results.some(result => result === false)) return
    error.value = ''
    step.value++
    await focusStep()
  } finally { advancing.value = false }
}

async function handleSubmit() {
  if (loading.value) return
  if (step.value < 3) await nextStep()
  else await submit()
}

// Campos comunes
const email_       = ref(''); const password    = ref('')
const departamento = ref(''); const direccion   = ref('')
const rubro        = ref('')
// Empresa
const nombre_comercial = ref(''); const sitio_web = ref('')
const telefono      = ref('')
const rep_nombre    = ref('')
const rep_tipo_id   = ref<'DUI' | 'PASAPORTE'>('DUI')
const rep_numero_id = ref('')
const razon_social  = ref(''); const nit = ref(''); const nrc = ref('')
// Influencer
const username         = ref('')
const nombre_artistico = ref(''); const bio = ref('')
const tarifa_base      = ref(0);  const fecha_nacimiento = ref('')
const tipo_identificacion   = ref<'DUI' | 'PASAPORTE'>('DUI')
const numero_identificacion = ref('')

const RUBROS_LIST = RUBROS
// Tutor (menores)
const tutor_nombre       = ref(''); const tutor_documento_id = ref('')
const tutor_email        = ref(''); const tutor_autorizacion = ref(false)

const TIPOS_ID = ['DUI', 'PASAPORTE'] as const

// Valida formato DUI salvadoreño: 8 dígitos, guión, 1 dígito (XXXXXXXX-X)
const duiValido = helpers.withMessage(
  'DUI inválido — formato: 00000000-0',
  (v: string) => /^\d{8}-\d$/.test(v),
)

// ── Máscaras de entrada ───────────────────────────────────────────────────────
function applyDuiMask(e: Event): string {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 9)
  const fmt = digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits
  el.value = fmt
  return fmt
}

function applyPasaporteMask(e: Event): string {
  const el = e.target as HTMLInputElement
  const clean = el.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20)
  el.value = clean
  return clean
}

function onNumeroIdInput(e: Event) {
  numero_identificacion.value = tipo_identificacion.value === 'DUI'
    ? applyDuiMask(e) : applyPasaporteMask(e)
}

function onRepNumeroIdInput(e: Event) {
  rep_numero_id.value = rep_tipo_id.value === 'DUI'
    ? applyDuiMask(e) : applyPasaporteMask(e)
}

const esMenor = computed(() => {
  if (!fecha_nacimiento.value) return false
  return calculateAge(fecha_nacimiento.value) < 18
})

// ── Seguridad de contraseña ───────────────────────────────────────────────────
const PWD_RULES = [
  { key: 'len',     label: 'Entre 8 y 128 caracteres',  test: (v: string) => v.length >= 8 && v.length <= 128 },
  { key: 'upper',   label: 'Al menos una mayúscula',     test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lower',   label: 'Al menos una minúscula',     test: (v: string) => /[a-z]/.test(v) },
  { key: 'number',  label: 'Al menos un número',         test: (v: string) => /\d/.test(v) },
  { key: 'special', label: 'Al menos un carácter especial (!@#$…)', test: (v: string) => /[^A-Za-z\d]/.test(v) },
]
const pwdStrength = computed(() => PWD_RULES.map(r => ({ ...r, ok: r.test(password.value) })))
const pwdValid    = computed(() => pwdStrength.value.every(r => r.ok))

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
      required:  helpers.withMessage('La contraseña es obligatoria', required),
      segura:    helpers.withMessage('La contraseña no cumple los requisitos de seguridad', () => !password.value || pwdValid.value),
    },
  }

  if (role.value === 'empresa') {
    return {
      ...base,
      nombre_comercial: { required: helpers.withMessage('El nombre comercial es obligatorio', required) },
      sitio_web:        { urlValida },
      telefono: {
        required: helpers.withMessage('El teléfono de contacto es obligatorio', required),
        formato:  helpers.withMessage('Teléfono inválido — ej. +503 7000-0000', helpers.regex(/^\+?[\d\s-]{8,20}$/)),
      },
      rep_nombre: { required: helpers.withMessage('El nombre del representante legal es obligatorio', required) },
      nit: { formato: helpers.withMessage('NIT inválido — formato: 0000-000000-000-0', helpers.regex(/^(\d{4}-?\d{6}-?\d{3}-?\d|\d{8}-?\d)$/)) },
      nrc: { formato: helpers.withMessage('NRC inválido — formato: 000000-0', helpers.regex(/^\d{1,7}-?\d$/)) },
      rep_numero_id: {
        required: helpers.withMessage('El número de documento es obligatorio', required),
        ...(rep_tipo_id.value === 'DUI' ? { duiValido } : {}),
      },
    }
  }

  const inf = {
    ...base,
    username: {
      required: helpers.withMessage('El username es obligatorio', required),
      formato:  helpers.withMessage('Solo letras, números y guiones bajos (3–30 caracteres)', helpers.regex(/^[a-zA-Z0-9_]{3,30}$/)),
    },
    nombre_artistico:  { required: helpers.withMessage('El nombre artístico es obligatorio', required) },
    fecha_nacimiento:  { required: helpers.withMessage('La fecha de nacimiento es obligatoria', required) },
    numero_identificacion: {
      required: helpers.withMessage('El número de documento es obligatorio', required),
      ...(tipo_identificacion.value === 'DUI' ? { duiValido } : {}),
    },
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
  nombre_comercial, sitio_web, rep_numero_id, telefono, rep_nombre, nit, nrc,
  username, nombre_artistico, fecha_nacimiento, numero_identificacion,
  tutor_nombre, tutor_documento_id, tutor_email, tutor_autorizacion,
})

// Resetear validación al cambiar de rol
watch(role, () => { v$.value.$reset(); step.value = 1; error.value = '' })

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit() {
  if (loading.value) return
  loading.value = true
  await nextTick() // Apply role/age-dependent rules before validating the submission.
  const valid = await v$.value.$validate()
  if (!valid) {
    const accountError = v$.value.email_.$error || v$.value.password.$error
    if (accountError) step.value = 1
    else if (role.value === 'empresa' ? v$.value.nombre_comercial?.$error || v$.value.sitio_web?.$error || v$.value.telefono?.$error : v$.value.username?.$error || v$.value.nombre_artistico?.$error) step.value = 2
    await focusStep()
    loading.value = false
    return
  }

  error.value = ''; loading.value = true
  try {
    if (role.value === 'empresa') {
      await authStore.registerEmpresa({
        email: email_.value, password: password.value,
        nombre_comercial: nombre_comercial.value,
        sitio_web:  sitio_web.value  || undefined,
        pais:       departamento.value ? `${departamento.value}, El Salvador` : 'El Salvador',
        direccion:  direccion.value  || undefined,
        rubro:      rubro.value      || undefined,
        telefono:     telefono.value,
        razon_social: razon_social.value || undefined,
        nit:          nit.value          || undefined,
        nrc:          nrc.value          || undefined,
        representante_nombre:                rep_nombre.value,
        representante_tipo_identificacion:   rep_tipo_id.value,
        representante_numero_identificacion: rep_numero_id.value,
      })
    } else {
      await authStore.registerInfluencer({
        email: email_.value, password: password.value,
        username: username.value,
        nombre_artistico: nombre_artistico.value,
        bio:        bio.value       || undefined,
        ubicacion:  departamento.value ? `${departamento.value}, El Salvador` : 'El Salvador',
        direccion:  direccion.value || undefined,
        rubro:      rubro.value     || undefined,
        tarifa_base: tarifa_base.value || undefined,
        fecha_nacimiento: fecha_nacimiento.value,
        tipo_identificacion:   tipo_identificacion.value,
        numero_identificacion: numero_identificacion.value,
        ...(esMenor.value ? {
          tutor_nombre: tutor_nombre.value,
          tutor_documento_id: tutor_documento_id.value,
          tutor_email: tutor_email.value,
          tutor_autorizacion: tutor_autorizacion.value,
        } : {}),
      })
    }
    registered.value = true
  } catch (e: any) {
    const msg = e.response?.data?.message
    error.value = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al registrarse.')
  } finally { loading.value = false }
}
</script>

<template>
  <div class="min-h-screen bg-slate">
    <header class="bg-navy border-b border-white/10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 min-h-20 py-4 flex items-center justify-between gap-4">
        <RouterLink to="/login" class="text-2xl shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4" aria-label="InfluSmart — Iniciar sesión"><BrandName /></RouterLink>
        <nav aria-label="Acceso a tu cuenta" class="flex items-center gap-4">
          <span class="hidden sm:block text-sm text-white/75">¿Ya tienes una cuenta?</span>
          <RouterLink to="/login" class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white whitespace-nowrap transition-colors ui-hover-inverse focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
            Iniciar sesión<i class="pi pi-arrow-right text-xs" aria-hidden="true" />
          </RouterLink>
        </nav>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <section v-if="registered" class="card max-w-lg mx-auto text-center p-8 space-y-4">
        <span class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-tint text-success"><i class="pi pi-check text-2xl" aria-hidden="true" /></span>
        <h1 class="font-display text-2xl font-bold text-navy">Tu cuenta está creada</h1>
        <p class="text-sm text-ink-muted">Revisa el correo de verificación en <strong class="text-navy break-all">{{ email_ }}</strong>. Si no lo encuentras, revisa spam o solicita otro desde tu cuenta.</p>
        <p class="text-xs text-ink-muted">El enlace de verificación expira en 24 horas.</p>
        <button type="button" class="btn-primary w-full" @click="router.push(viewPath('/dashboard'))">Ir a mi inicio</button>
      </section>
      <div v-else class="grid lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.8fr)] gap-8 lg:gap-12 items-start">
        <aside class="lg:sticky lg:top-8 space-y-6">
          <div><p class="text-xs text-violet font-semibold uppercase tracking-wider">Empieza en InfluSmart</p><h1 class="font-display text-3xl sm:text-4xl font-bold text-navy mt-3 leading-tight">{{ role === 'empresa' ? 'Tu próxima colaboración empieza aquí.' : 'Conecta tu talento con nuevas marcas.' }}</h1><p class="text-sm text-ink-muted mt-4 leading-relaxed">{{ role === 'empresa' ? 'Prepara campañas, encuentra creadores y gestiona tus acuerdos en un solo lugar.' : 'Presenta tu perfil, negocia propuestas y sigue tus colaboraciones desde un solo lugar.' }}</p></div>
          <ul class="space-y-4 text-sm text-ink-muted hidden lg:block"><li class="flex items-start gap-3"><i class="pi pi-user text-violet mt-1" aria-hidden="true" />Elige el perfil que corresponde a tu actividad.</li><li class="flex items-start gap-3"><i class="pi pi-lock text-violet mt-1" aria-hidden="true" />Tus datos de identidad se usan para los procesos de verificación.</li><li class="flex items-start gap-3"><i class="pi pi-envelope text-violet mt-1" aria-hidden="true" />Verifica tu correo para activar las funciones de tu cuenta.</li></ul>
          <div v-if="role === 'empresa'" class="rounded-xl border border-violet/20 bg-violet-tint p-4 text-sm text-navy inline-flex gap-3"><i class="pi pi-gift text-violet mt-1" aria-hidden="true" /><p>Recibe <strong>$10.00 en créditos</strong> al completar el registro de tu empresa.</p></div>
        </aside>
        <section class="card p-5 sm:p-8 min-w-0">
          <fieldset :disabled="loading || advancing" class="mb-6"><legend class="font-semibold text-navy text-sm mb-3">¿Cómo usarás InfluSmart?</legend><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><label v-for="option in [{ value: 'empresa', title: 'Empresa / marca', description: 'Quiero contratar creadores', icon: 'pi-building' }, { value: 'influencer', title: 'Influencer', description: 'Quiero colaborar con marcas', icon: 'pi-star' }]" :key="option.value" class="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors" :class="role === option.value ? 'border-violet bg-violet-tint' : 'border-border ui-hover'"><input v-model="role" type="radio" name="register-role" :value="option.value" class="accent-violet" /><span class="flex-1"><span class="block text-sm font-semibold text-navy">{{ option.title }}</span><span class="block text-xs text-ink-muted mt-1">{{ option.description }}</span></span><i :class="['pi text-violet', option.icon]" aria-hidden="true" /></label></div></fieldset>
          <ol class="grid grid-cols-3 gap-2 border-y border-border py-4 mb-6" aria-label="Pasos del registro"><li v-for="(label, index) in steps" :key="label" :aria-current="step === index + 1 ? 'step' : undefined" class="flex items-center gap-2 text-xs sm:text-sm" :class="step === index + 1 ? 'text-violet font-semibold' : 'text-ink-muted'"><span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs" :class="step >= index + 1 ? 'bg-violet text-white' : 'bg-slate-dark text-navy'">{{ index + 1 }}</span>{{ label }}</li></ol>
          <h2 ref="stepHeading" tabindex="-1" class="font-display text-xl font-semibold text-navy outline-none">{{ steps[step - 1] }}</h2>
          <p class="text-xs text-ink-muted mt-2 mb-5">{{ step === 1 ? 'Usa un correo al que tengas acceso y una contraseña segura.' : step === 2 ? 'Cuéntanos cómo quieres presentarte en la plataforma.' : 'Completa tus datos de identidad. Los campos opcionales están indicados.' }}</p>
          <p class="text-xs text-ink-muted mb-4"><span class="text-coral-text font-semibold">*</span> Campo obligatorio. Los campos opcionales se indican en su etiqueta.</p>
          <form @submit.prevent="handleSubmit" novalidate class="space-y-5">
            <fieldset :disabled="loading || advancing" class="space-y-4"><legend class="sr-only">Datos del registro</legend>
              <div v-show="step === 1" class="space-y-4">
          <!-- ── Campos comunes ─────────────────────────────────────────────── -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label" for="register-email-">Email<RequiredMark /></label>
              <input id="register-email-"
                v-model="email_" type="email" autocomplete="email" inputmode="email" autocapitalize="none" required
                :class="['input', { '!border-coral': v$.email_.$error }]"
                @blur="v$.email_.$touch()" />
              <p v-if="v$.email_.$error" class="text-coral-text text-xs mt-1">
                {{ v$.email_.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label" for="register-password">Contraseña<RequiredMark /></label>
              <input id="register-password"
                v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required maxlength="128"
                :class="['input', { '!border-coral': v$.password.$error }]"
                @blur="v$.password.$touch()" />
              <button type="button" class="text-xs text-violet font-semibold mt-2 inline-flex items-center gap-2" :aria-pressed="showPassword" @click="showPassword = !showPassword"><i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" aria-hidden="true" />{{ showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña' }}</button>
              <!-- Checklist de seguridad -->
              <div v-if="password" class="mt-2 space-y-1">
                <p v-for="r in pwdStrength" :key="r.key"
                  :class="['text-xs flex items-center gap-1.5', r.ok ? 'text-success' : 'text-ink-muted']">
                  <i :class="r.ok ? 'pi pi-check-circle' : 'pi pi-circle'" aria-hidden="true" /> {{ r.label }}
                </p>
              </div>
              <p v-if="v$.password.$error" class="text-coral-text text-xs mt-1">
                {{ v$.password.$errors[0]?.$message }}
              </p>
            </div>
          </div>


              </div>
              <div v-show="step === 2" class="space-y-4">
                <template v-if="role === 'empresa'">
            <div>
              <label class="label" for="register-nombre-comercial">Nombre comercial<RequiredMark /></label>
              <input id="register-nombre-comercial"
                v-model="nombre_comercial" required
                :class="['input', { '!border-coral': v$.nombre_comercial?.$error }]"
                @blur="v$.nombre_comercial?.$touch()" />
              <p v-if="v$.nombre_comercial?.$error" class="text-coral-text text-xs mt-1">
                {{ v$.nombre_comercial.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label" for="register-sitio-web">Sitio web (opcional)</label>
              <input id="register-sitio-web"
                v-model="sitio_web" type="url" placeholder="https://"
                :class="['input', { '!border-coral': v$.sitio_web?.$error }]"
                @blur="v$.sitio_web?.$touch()" />
              <p v-if="v$.sitio_web?.$error" class="text-coral-text text-xs mt-1">
                {{ v$.sitio_web.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label" for="register-rubro">Rubro / industria (opcional)</label>
              <select id="register-rubro" v-model="rubro" class="input">
                <option value="">— Selecciona tu rubro —</option>
                <option v-for="r in RUBROS_LIST" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">País</label>
                <div class="input flex items-center gap-2 bg-slate/60 cursor-default select-none text-ink-muted">
                  <i class="pi pi-map-marker" aria-hidden="true" /> <span class="font-medium text-navy/80">El Salvador</span>
                </div>
              </div>
              <div>
                <label class="label" for="register-departamento">Departamento</label>
                <select id="register-departamento" v-model="departamento" class="input">
                  <option value="">— Selecciona —</option>
                  <option v-for="d in DEPARTAMENTOS_SV" :key="d">{{ d }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="label" for="register-direccion">Dirección (opcional)</label>
              <input id="register-direccion" v-model="direccion" class="input" placeholder="Colonia, calle, municipio…" />
            </div>
            <div>
              <label class="label" for="register-telefono">Teléfono / WhatsApp de contacto<RequiredMark /></label>
              <input id="register-telefono"
                v-model="telefono" type="tel" required placeholder="+503 7000-0000"
                :class="['input', { '!border-coral': v$.telefono?.$error }]"
                @blur="v$.telefono?.$touch()" />
              <p v-if="v$.telefono?.$error" class="text-coral-text text-xs mt-1">
                {{ v$.telefono.$errors[0]?.$message }}
              </p>
            </div>

                </template>
                <template v-else>
            <div>
              <label class="label" for="register-username">Username <span class="text-ink-muted font-normal text-xs">— así te encontrarán las empresas</span><RequiredMark /></label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-medium select-none">@</span>
                <input
                  id="register-username" v-model="username" required autocomplete="username" autocapitalize="none" placeholder="mario_blue"
                  :class="['input pl-7 w-full', { '!border-coral': v$.username?.$error }]"
                  @blur="v$.username?.$touch()" />
              </div>
              <p v-if="v$.username?.$error" class="text-coral-text text-xs mt-1">
                {{ v$.username.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label" for="register-nombre-artistico">Nombre artístico<RequiredMark /></label>
              <input id="register-nombre-artistico"
                v-model="nombre_artistico" required
                :class="['input', { '!border-coral': v$.nombre_artistico?.$error }]"
                @blur="v$.nombre_artistico?.$touch()" />
              <p v-if="v$.nombre_artistico?.$error" class="text-coral-text text-xs mt-1">
                {{ v$.nombre_artistico.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label" for="register-rubro">Rubro / nicho (opcional)</label>
              <select id="register-rubro" v-model="rubro" class="input">
                <option value="">— Selecciona tu rubro —</option>
                <option v-for="r in RUBROS_LIST" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">País</label>
                <div class="input flex items-center gap-2 bg-slate/60 cursor-default select-none text-ink-muted">
                  <i class="pi pi-map-marker" aria-hidden="true" /> <span class="font-medium text-navy/80">El Salvador</span>
                </div>
              </div>
              <div>
                <label class="label" for="register-departamento">Departamento</label>
                <select id="register-departamento" v-model="departamento" class="input">
                  <option value="">— Selecciona —</option>
                  <option v-for="d in DEPARTAMENTOS_SV" :key="d">{{ d }}</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label" for="register-tarifa-base">Tarifa base (USD)</label>
                <input id="register-tarifa-base" v-model.number="tarifa_base" type="number" min="0" class="input" />
              </div>
              <div>
                <label class="label" for="register-direccion">Dirección (opcional)</label>
                <input id="register-direccion" v-model="direccion" class="input" placeholder="Colonia, calle…" />
              </div>
            </div>
            <div>
              <label class="label" for="register-bio">Bio (opcional)</label>
              <textarea id="register-bio" v-model="bio" class="input" rows="2" />
            </div>


                </template>
              </div>
              <div v-show="step === 3" class="space-y-4">
                <template v-if="role === 'empresa'">
            <!-- Representante legal -->
            <div>
              <label class="label" for="register-rep-nombre">Nombre del representante legal<RequiredMark /></label>
              <input id="register-rep-nombre"
                v-model="rep_nombre" required placeholder="Nombre Apellido"
                :class="['input', { '!border-coral': v$.rep_nombre?.$error }]"
                @blur="v$.rep_nombre?.$touch()" />
              <p v-if="v$.rep_nombre?.$error" class="text-coral-text text-xs mt-1">
                {{ v$.rep_nombre.$errors[0]?.$message }}
              </p>
            </div>
            <div>
              <label class="label">Documento de identidad del representante<RequiredMark /></label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex rounded-lg border border-navy/15 p-1 gap-1">
                  <button v-for="t in TIPOS_ID" :key="t" type="button" :aria-pressed="rep_tipo_id === t"
                    @click="rep_tipo_id = t; rep_numero_id = ''; v$.rep_numero_id?.$reset()"
                    :class="['flex-1 py-1.5 rounded-md text-xs font-semibold transition-all',
                      rep_tipo_id === t ? 'bg-violet text-white shadow' : 'text-ink-muted ui-hover']">
                    {{ t }}
                  </button>
                </div>
                <div>
                  <input
                    aria-label="Número de documento del representante" :value="rep_numero_id"
                    :placeholder="rep_tipo_id === 'DUI' ? '00000000-0' : 'A00000000'"
                    :maxlength="rep_tipo_id === 'DUI' ? 10 : 20"
                    :class="['input', { '!border-coral': v$.rep_numero_id?.$error }]"
                    @input="onRepNumeroIdInput"
                    @blur="v$.rep_numero_id?.$touch()" />
                  <p v-if="v$.rep_numero_id?.$error" class="text-coral-text text-xs mt-1">
                    {{ v$.rep_numero_id.$errors[0]?.$message }}
                  </p>
                </div>
              </div>
            </div>
            <!-- Datos fiscales (opcionales en el registro, necesarios para la insignia de marca verificada) -->
            <details :open="!!(v$.nit?.$error || v$.nrc?.$error)" class="rounded-lg border border-border p-4">
              <summary class="text-sm font-medium text-navy cursor-pointer">
                Datos fiscales <span class="text-ink-muted font-normal">— opcional ahora, necesario para facturar y verificar tu marca</span>
              </summary>
              <div class="space-y-3 mt-3">
                <div>
                  <label class="label" for="register-razon-social">Razón social</label>
                  <input id="register-razon-social" v-model="razon_social" class="input" placeholder="Mi Marca S.A. de C.V." />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="label" for="register-nit">NIT</label>
                    <input id="register-nit" v-model="nit" placeholder="0614-010190-101-1"
                      :class="['input', { '!border-coral': v$.nit?.$error }]" @blur="v$.nit?.$touch()" />
                    <p v-if="v$.nit?.$error" class="text-coral-text text-xs mt-1">{{ v$.nit.$errors[0]?.$message }}</p>
                  </div>
                  <div>
                    <label class="label" for="register-nrc">NRC</label>
                    <input id="register-nrc" v-model="nrc" placeholder="123456-7"
                      :class="['input', { '!border-coral': v$.nrc?.$error }]" @blur="v$.nrc?.$touch()" />
                    <p v-if="v$.nrc?.$error" class="text-coral-text text-xs mt-1">{{ v$.nrc.$errors[0]?.$message }}</p>
                  </div>
                </div>
              </div>
            </details>


                </template>
                <template v-else>
            <div>
              <label class="label" for="register-fecha-nacimiento">Fecha de nacimiento<RequiredMark /></label>
              <input id="register-fecha-nacimiento"
                v-model="fecha_nacimiento" type="date" required
                :class="['input', { '!border-coral': v$.fecha_nacimiento?.$error }]"
                @blur="v$.fecha_nacimiento?.$touch()" />
              <p v-if="v$.fecha_nacimiento?.$error" class="text-coral-text text-xs mt-1">
                {{ v$.fecha_nacimiento.$errors[0]?.$message }}
              </p>
            </div>
            <!-- Documento de identidad -->
            <div>
              <label class="label">Documento de identidad<RequiredMark /></label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex rounded-lg border border-navy/15 p-1 gap-1">
                  <button v-for="t in TIPOS_ID" :key="t" type="button" :aria-pressed="tipo_identificacion === t"
                    @click="tipo_identificacion = t; numero_identificacion = ''; v$.numero_identificacion?.$reset()"
                    :class="['flex-1 py-1.5 rounded-md text-xs font-semibold transition-all',
                      tipo_identificacion === t ? 'bg-violet text-white shadow' : 'text-ink-muted ui-hover']">
                    {{ t }}
                  </button>
                </div>
                <div>
                  <input
                    aria-label="Número de documento de identidad" :value="numero_identificacion"
                    :placeholder="tipo_identificacion === 'DUI' ? '00000000-0' : 'A00000000'"
                    :maxlength="tipo_identificacion === 'DUI' ? 10 : 20"
                    :class="['input', { '!border-coral': v$.numero_identificacion?.$error }]"
                    @input="onNumeroIdInput"
                    @blur="v$.numero_identificacion?.$touch()" />
                  <p v-if="v$.numero_identificacion?.$error" class="text-coral-text text-xs mt-1">
                    {{ v$.numero_identificacion.$errors[0]?.$message }}
                  </p>
                </div>
              </div>
            </div>
            <!-- Tutor si es menor -->
            <template v-if="esMenor">
              <div class="bg-coral/10 border border-coral/30 rounded-lg p-3 text-sm text-coral-text">
                <i class="pi pi-exclamation-triangle mr-1.5" aria-hidden="true" />Eres menor de 18 años. Se requieren los datos de tu tutor legal.
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label" for="register-tutor-nombre">Nombre del tutor<RequiredMark /></label>
                  <input id="register-tutor-nombre"
                    v-model="tutor_nombre" required
                    :class="['input', { '!border-coral': v$.tutor_nombre?.$error }]"
                    @blur="v$.tutor_nombre?.$touch()" />
                  <p v-if="v$.tutor_nombre?.$error" class="text-coral-text text-xs mt-1">
                    {{ v$.tutor_nombre.$errors[0]?.$message }}
                  </p>
                </div>
                <div>
                  <label class="label" for="register-tutor-documento-id">Documento ID del tutor<RequiredMark /></label>
                  <input id="register-tutor-documento-id"
                    v-model="tutor_documento_id" required
                    :class="['input', { '!border-coral': v$.tutor_documento_id?.$error }]"
                    @blur="v$.tutor_documento_id?.$touch()" />
                  <p v-if="v$.tutor_documento_id?.$error" class="text-coral-text text-xs mt-1">
                    {{ v$.tutor_documento_id.$errors[0]?.$message }}
                  </p>
                </div>
              </div>
              <div>
                <label class="label" for="register-tutor-email">Email del tutor<RequiredMark /></label>
                <input id="register-tutor-email"
                  v-model="tutor_email" type="email" required
                  :class="['input', { '!border-coral': v$.tutor_email?.$error }]"
                  @blur="v$.tutor_email?.$touch()" />
                <p v-if="v$.tutor_email?.$error" class="text-coral-text text-xs mt-1">
                  {{ v$.tutor_email.$errors[0]?.$message }}
                </p>
              </div>
              <div>
                <label class="flex items-start gap-2 text-sm cursor-pointer"
                  :class="{ 'text-coral-text': v$.tutor_autorizacion?.$error }">
                  <input
                    v-model="tutor_autorizacion" type="checkbox" required
                    class="mt-0.5 rounded"
                    @change="v$.tutor_autorizacion?.$touch()" />
                  <span>El tutor legal autoriza la cuenta y co-titularidad financiera.<RequiredMark /></span>
                </label>
                <p v-if="v$.tutor_autorizacion?.$error" class="text-coral-text text-xs mt-1">
                  {{ v$.tutor_autorizacion.$errors[0]?.$message }}
                </p>
              </div>
            </template>

                </template>
              </div>
            </fieldset>
            <div v-if="error" role="alert" class="rounded-xl bg-coral-tint text-coral-text text-sm p-4">{{ error }}</div>
            <div class="flex flex-col-reverse sm:flex-row gap-3 border-t border-border pt-5">
              <button v-if="step > 1" type="button" :disabled="loading || advancing" class="btn-secondary" @click="step--; focusStep()">Atrás</button>
              <button type="submit" :disabled="loading || advancing" class="btn-primary sm:ml-auto inline-flex items-center justify-center gap-2"><i v-if="loading" class="pi pi-spin pi-spinner" aria-hidden="true" />{{ loading ? 'Creando cuenta…' : step < 3 ? 'Continuar' : 'Crear mi cuenta' }}<i v-if="!loading && step < 3" class="pi pi-arrow-right" aria-hidden="true" /></button>
            </div>
          </form>
        </section>
      </div>
    </main>
  </div>
</template>
