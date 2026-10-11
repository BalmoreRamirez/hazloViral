<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import AvatarUpload from '@/components/AvatarUpload.vue'
import CoverBanner from '@/components/CoverBanner.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
import BriefDetails from '@/components/BriefDetails.vue'
import { useProfileStore, type BriefArchivo, type CampaignBrief, type EmpresaProfile } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { campaignsApi, type CampaignBriefPayload } from '@/api/campaigns'
import { RUBROS, rubroLabel } from '@/constants/rubros'
import { PAISES, DEPARTAMENTOS_SV, parseUbicacion, formatUbicacion } from '@/constants/ubicaciones'
import { PLATAFORMAS_BRIEF, DERECHOS_USO } from '@/constants/brief'
import { useVuelidate } from '@vuelidate/core'
import { required, email, url, helpers } from '@vuelidate/validators'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
// Button, InputText, Textarea, Tag, Divider, Toast, ConfirmDialog
// están registrados globalmente en main.ts — no requieren import local

const store     = useProfileStore()
const authStore = useAuthStore()
const toast     = useToast()
const confirm   = useConfirm()

const editing       = ref(false)
const showBriefForm = ref(false)
const savingBrief   = ref(false)
const uploading     = ref(false)
const deletingBrief = ref<number | null>(null)
const editingBrief  = ref<number | null>(null)
const briefError    = ref('')
const profileError  = ref('')

const TIPOS_ID = ['DUI', 'PASAPORTE']

const CHECKLIST_LABELS: Record<string, string> = {
  email_verificado: 'Correo electrónico verificado',
  logo:             'Logo de la marca (foto de perfil)',
  nit:              'NIT de la empresa',
  representante:    'Nombre y documento del representante legal',
  telefono:         'Teléfono de contacto',
  presencia_online: 'Sitio web, Instagram o TikTok de la marca',
}

const p = computed(() => store.empresaProfile)

const pendientes = computed(() =>
  Object.entries(p.value?.verification_checklist ?? {}).filter(([, ok]) => !ok).map(([k]) => CHECKLIST_LABELS[k] ?? k),
)

const ubicacionTexto = computed(() => {
  if (!p.value) return ''
  return [p.value.direccion, p.value.pais].filter(Boolean).join(' · ')
})

// ─── Formulario de perfil ─────────────────────────────────────────────────────
function emptyForm() {
  return {
    nombre_comercial: '', razon_social: '', nit: '', nrc: '', telefono: '', email_facturacion: '',
    descripcion: '', sitio_web: '', instagram_url: '', tiktok_url: '',
    pais: '', departamento: '', direccion: '', rubro: '',
    representante_nombre: '', representante_tipo_identificacion: 'DUI', representante_numero_identificacion: '',
  }
}
const form = ref(emptyForm())

function fillForm(e: EmpresaProfile) {
  const ub = parseUbicacion(e.pais)
  form.value = {
    nombre_comercial:  e.nombre_comercial,
    razon_social:      e.razon_social ?? '',
    nit:               e.nit ?? '',
    nrc:               e.nrc ?? '',
    telefono:          e.telefono ?? '',
    email_facturacion: e.email_facturacion ?? '',
    descripcion:       e.descripcion ?? '',
    sitio_web:         e.sitio_web ?? '',
    instagram_url:     e.instagram_url ?? '',
    tiktok_url:        e.tiktok_url ?? '',
    pais:              ub.pais,
    departamento:      ub.departamento,
    direccion:         e.direccion ?? '',
    rubro:             e.rubro ?? '',
    representante_nombre:                e.representante_nombre ?? '',
    representante_tipo_identificacion:   e.representante_tipo_identificacion ?? 'DUI',
    representante_numero_identificacion: e.representante_numero_identificacion ?? '',
  }
}

// ─── Validación (mismo patrón que el perfil de influencer) ────────────────────
const urlValida = helpers.withMessage('URL inválida — debe empezar con https://', url)

const profileRules = computed(() => ({
  nombre_comercial: { required: helpers.withMessage('El nombre comercial es obligatorio', required) },
  rubro:            { required: helpers.withMessage('Elige el rubro de tu marca', required) },
  pais:             { required: helpers.withMessage('El país es obligatorio', required) },
  telefono: {
    required: helpers.withMessage('El teléfono de contacto es obligatorio', required),
    formato:  helpers.withMessage('Teléfono inválido — ej. +503 7000-0000', helpers.regex(/^\+?[\d\s-]{8,20}$/)),
  },
  email_facturacion: { email: helpers.withMessage('Correo de facturación inválido', email) },
  nit: { formato: helpers.withMessage('NIT inválido — formato: 0000-000000-000-0', helpers.regex(/^(\d{4}-?\d{6}-?\d{3}-?\d|\d{8}-?\d)$/)) },
  nrc: { formato: helpers.withMessage('NRC inválido — formato: 000000-0', helpers.regex(/^\d{1,7}-?\d$/)) },
  sitio_web:     { urlValida },
  instagram_url: { urlValida },
  tiktok_url:    { urlValida },
  representante_nombre: { required: helpers.withMessage('El nombre del representante legal es obligatorio', required) },
  representante_numero_identificacion: {
    required: helpers.withMessage('El número de documento es obligatorio', required),
    ...(form.value.representante_tipo_identificacion === 'DUI'
      ? { dui: helpers.withMessage('DUI inválido — formato: 00000000-0', helpers.regex(/^\d{8}-\d$/)) }
      : {}),
  },
}))

const pv$ = useVuelidate(profileRules, form)

function startEdit() {
  if (p.value) fillForm(p.value)
  profileError.value = ''
  pv$.value.$reset()
  editing.value = true
}

function apiError(err: any): string {
  const msg = err?.response?.data?.message
  return Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Ocurrió un error. Intenta de nuevo.')
}

async function saveProfile() {
  if (!(await pv$.value.$validate())) return
  profileError.value = ''
  const { departamento, pais, ...rest } = form.value
  try {
    await store.updateEmpresaProfile({ ...rest, pais: pais ? formatUbicacion(pais, departamento) : '' })
    editing.value = false
    toast.add({ severity: 'success', summary: 'Perfil actualizado', life: 3000 })
  } catch (err) {
    profileError.value = apiError(err)
  }
}

onMounted(async () => {
  await Promise.all([store.loadEmpresaProfile(), store.loadBriefs()])
})

// ─── Briefs ───────────────────────────────────────────────────────────────────
function emptyBrief() {
  return {
    titulo_campana: '', objetivo_principal: '', plataformas: [] as string[], tono_de_voz: '',
    puntos_clave_si: '', restricciones_no: '', recursos_esteticos: '',
    presupuesto_min: null as number | null, presupuesto_max: null as number | null,
    publico_objetivo: '', fecha_inicio: '', fecha_fin: '', formatos: '', hashtags_menciones: '',
    derechos_uso: 'organico', exclusividad_dias: 0 as number | null, exclusividad_detalle: '',
    requiere_disclosure: true, archivos: [] as BriefArchivo[],
  }
}
const briefForm = ref(emptyBrief())

const briefRules = computed(() => ({
  titulo_campana:     { required: helpers.withMessage('El título de la campaña es obligatorio', required) },
  objetivo_principal: { required: helpers.withMessage('El objetivo principal es obligatorio', required) },
  plataformas: {
    alMenosUna: helpers.withMessage('Selecciona al menos una plataforma', (v: string[]) => v.length > 0),
  },
  fecha_fin: {
    despuesDeInicio: helpers.withMessage('La fecha de fin no puede ser anterior a la de inicio',
      (v: string) => !v || !briefForm.value.fecha_inicio || v >= briefForm.value.fecha_inicio),
  },
  presupuesto_max: {
    mayorQueMin: helpers.withMessage('El máximo no puede ser menor que el mínimo',
      (v: number | null) => v == null || briefForm.value.presupuesto_min == null || Number(v) >= Number(briefForm.value.presupuesto_min)),
  },
  exclusividad_dias: {
    rango: helpers.withMessage('Entre 0 y 365 días', (v: number | null) => v == null || (Number(v) >= 0 && Number(v) <= 365)),
  },
}))

const bv$ = useVuelidate(briefRules, briefForm)

function openNewBrief() {
  editingBrief.value  = null
  briefForm.value     = emptyBrief()
  briefError.value    = ''
  bv$.value.$reset()
  showBriefForm.value = true
}

function startEditBrief(b: CampaignBrief) {
  editingBrief.value = b.id
  briefError.value   = ''
  bv$.value.$reset()
  briefForm.value = {
    titulo_campana:      b.titulo_campana,
    objetivo_principal:  b.objetivo_principal ?? '',
    plataformas:         [...(b.plataformas ?? [])],
    tono_de_voz:         b.tono_de_voz ?? '',
    puntos_clave_si:     b.puntos_clave_si ?? '',
    restricciones_no:    b.restricciones_no ?? '',
    recursos_esteticos:  b.recursos_esteticos ?? '',
    presupuesto_min:     b.presupuesto_min != null ? Number(b.presupuesto_min) : null,
    presupuesto_max:     b.presupuesto_max != null ? Number(b.presupuesto_max) : null,
    publico_objetivo:    b.publico_objetivo ?? '',
    fecha_inicio:        b.fecha_inicio ?? '',
    fecha_fin:           b.fecha_fin ?? '',
    formatos:            b.formatos ?? '',
    hashtags_menciones:  b.hashtags_menciones ?? '',
    derechos_uso:        b.derechos_uso ?? 'organico',
    exclusividad_dias:   b.exclusividad_dias ?? 0,
    exclusividad_detalle: b.exclusividad_detalle ?? '',
    requiere_disclosure: b.requiere_disclosure ?? true,
    archivos:            [...(b.archivos ?? [])],
  }
  showBriefForm.value = true
}

function resetBriefForm() {
  briefForm.value     = emptyBrief()
  showBriefForm.value = false
  editingBrief.value  = null
  briefError.value    = ''
  bv$.value.$reset()
}

function togglePlataforma(pl: string) {
  const list = briefForm.value.plataformas
  const idx = list.indexOf(pl)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(pl)
}

async function onArchivos(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) return
  uploading.value = true
  try {
    for (const f of files) briefForm.value.archivos.push(await campaignsApi.uploadArchivo(f))
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo subir el archivo', detail: apiError(err), life: 5000 })
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function removeArchivo(idx: number) {
  briefForm.value.archivos.splice(idx, 1)
}

/** Normaliza el formulario: números vacíos → null, fechas vacías → null */
function briefPayload(): CampaignBriefPayload {
  const f = briefForm.value
  const num = (v: number | null) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))
  return {
    ...f,
    presupuesto_min:   num(f.presupuesto_min),
    presupuesto_max:   num(f.presupuesto_max),
    exclusividad_dias: num(f.exclusividad_dias) ?? 0,
    fecha_inicio:      f.fecha_inicio || null,
    fecha_fin:         f.fecha_fin || null,
  }
}

async function saveBrief() {
  if (!(await bv$.value.$validate())) return
  savingBrief.value = true
  briefError.value  = ''
  try {
    if (editingBrief.value) {
      await store.updateBrief(editingBrief.value, briefPayload() as any)
      toast.add({ severity: 'success', summary: 'Brief actualizado', life: 3000 })
    } else {
      await store.createBrief(briefPayload() as any)
      toast.add({ severity: 'success', summary: 'Brief creado', life: 3000 })
    }
    resetBriefForm()
  } catch (err) {
    briefError.value = apiError(err)
  } finally { savingBrief.value = false }
}

function confirmDelete(id: number, titulo: string) {
  confirm.require({
    message: `¿Eliminar el brief "${titulo}"? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-trash',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      deletingBrief.value = id
      try {
        await store.removeBrief(id)
        toast.add({ severity: 'warn', summary: 'Brief eliminado', life: 3000 })
      } finally { deletingBrief.value = null }
    },
  })
}
</script>

<template>
  <AppLayout>
    <Toast position="top-right" />
    <ConfirmDialog />

    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-display font-bold text-navy">Mi Perfil — Empresa</h1>
          <p class="text-sm mt-1 text-navy-lighter">Gestiona los datos de tu marca y tus briefs de campaña</p>
        </div>
        <RouterLink v-if="p" :to="`/empresas/${p.id}`"
          class="text-sm font-semibold text-violet hover:text-violet/80">
          <i class="pi pi-eye mr-1" />Ver mi perfil público
        </RouterLink>
      </div>

      <CoverBanner :rubro="p?.rubro" :nombre="p?.nombre_comercial" />

      <!-- ── Verificación de marca ─────────────────────────────────────────── -->
      <div v-if="p" class="card border"
        :class="p.is_verified ? 'bg-violet/5 border-violet/20' : 'bg-amber-50 border-amber-200'">
        <div class="flex items-start gap-3">
          <VerifiedBadge v-if="p.is_verified" size="md" />
          <i v-else class="pi pi-shield text-amber-600 text-xl mt-0.5" />
          <div class="flex-1">
            <p class="font-semibold text-navy">
              {{ p.is_verified ? 'Marca verificada' : 'Completa tu perfil para obtener la insignia de marca verificada' }}
            </p>
            <p class="text-xs text-navy/50 mt-0.5">
              {{ p.is_verified
                ? 'Los influencers ven la insignia en tu perfil público y en el chat. Genera confianza y mejora la tasa de respuesta.'
                : 'Los influencers responden más rápido a marcas verificadas. Te falta:' }}
            </p>
            <ul v-if="!p.is_verified" class="mt-2 space-y-1 text-sm">
              <li v-for="item in pendientes" :key="item" class="flex items-center gap-2 text-navy/70">
                <i class="pi pi-circle text-[0.5rem] text-amber-600" />{{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- ── Datos de la empresa ───────────────────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-4">
            <AvatarUpload
              :name="p?.nombre_comercial ?? authStore.user?.email ?? ''"
              size="lg"
              editable
              @updated="toast.add({ severity: 'success', summary: 'Logo actualizado', life: 3000 }); store.loadEmpresaProfile()"
            />
            <div>
              <h2 class="font-display font-semibold text-navy text-lg flex items-center gap-2">
                🏢 Datos de la empresa
                <VerifiedBadge v-if="p?.is_verified" size="sm" />
              </h2>
              <p class="text-xs text-navy/40">Haz clic en la imagen para subir el logo de tu marca</p>
            </div>
          </div>
          <Button v-if="!editing" @click="startEdit"
            label="Editar" icon="pi pi-pencil" severity="secondary" size="small" outlined />
        </div>

        <div v-if="store.loading" class="py-6 text-center text-navy/40 text-sm">
          <i class="pi pi-spin pi-spinner mr-2" />Cargando…
        </div>

        <!-- Vista de datos -->
        <div v-else-if="!editing && p" class="space-y-6 text-sm">
          <!-- Marca -->
          <section>
            <h3 class="section-title">Marca</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="label">Nombre comercial</dt>
                <dd class="font-semibold text-navy">{{ p.nombre_comercial }}</dd>
              </div>
              <div>
                <dt class="label">Rubro</dt>
                <dd class="text-navy">{{ p.rubro ? rubroLabel(p.rubro) : '—' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="label">Descripción</dt>
                <dd v-if="p.descripcion" class="text-navy whitespace-pre-line">{{ p.descripcion }}</dd>
                <dd v-else class="text-navy/40 italic">Cuéntale a los influencers quién es tu marca</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="label">Ubicación</dt>
                <dd class="text-navy">{{ ubicacionTexto || '—' }}</dd>
              </div>
            </dl>
          </section>

          <!-- Presencia online -->
          <section class="border-t border-navy/8 pt-4">
            <h3 class="section-title">Presencia online</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div v-for="link in [
                { label: 'Sitio web', url: p.sitio_web },
                { label: 'Instagram', url: p.instagram_url },
                { label: 'TikTok', url: p.tiktok_url },
              ]" :key="link.label" class="min-w-0">
                <dt class="label">{{ link.label }}</dt>
                <dd>
                  <a v-if="link.url" :href="link.url" target="_blank" rel="noopener"
                    class="text-violet underline hover:text-violet/80 break-all">{{ link.url }}</a>
                  <span v-else class="text-navy/40 italic">No configurado</span>
                </dd>
              </div>
            </dl>
          </section>

          <!-- Contacto y facturación -->
          <section class="border-t border-navy/8 pt-4">
            <h3 class="section-title">Contacto y facturación <span class="font-normal text-navy/40">— privado, no visible para influencers</span></h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="label">Teléfono / WhatsApp</dt>
                <dd class="text-navy">{{ p.telefono || '—' }}</dd>
              </div>
              <div>
                <dt class="label">Correo de facturación</dt>
                <dd class="text-navy break-all">{{ p.email_facturacion || authStore.user?.email }}</dd>
              </div>
              <div>
                <dt class="label">Razón social</dt>
                <dd class="text-navy">{{ p.razon_social || '—' }}</dd>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <dt class="label">NIT</dt>
                  <dd class="text-navy">{{ p.nit || '—' }}</dd>
                </div>
                <div>
                  <dt class="label">NRC</dt>
                  <dd class="text-navy">{{ p.nrc || '—' }}</dd>
                </div>
              </div>
            </dl>
          </section>

          <!-- Representante legal -->
          <section class="border-t border-navy/8 pt-4">
            <h3 class="section-title">Representante legal</h3>
            <template v-if="p.representante_nombre">
              <p class="font-semibold text-navy">{{ p.representante_nombre }}</p>
              <p class="text-navy/50 mt-0.5">
                {{ p.representante_tipo_identificacion }}: {{ p.representante_numero_identificacion }}
              </p>
            </template>
            <p v-else class="text-amber-700 text-xs font-medium">Agrega el nombre del representante legal para firmar contratos.</p>
          </section>

          <!-- Créditos -->
          <section class="border-t border-navy/8 pt-4">
            <h3 class="section-title">Saldo</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt class="label">Saldo disponible</dt>
                <dd class="font-bold text-2xl"
                  :class="Number(p.balance_creditos) > Number(p.umbral_creditos) ? 'text-violet' : 'text-coral'">
                  ${{ Number(p.balance_creditos).toFixed(2) }}
                  <span class="text-sm font-normal text-navy/40"> USD</span>
                </dd>
              </div>
              <div>
                <dt class="label">Saldo mínimo para chatear</dt>
                <dd class="font-semibold text-navy">${{ Number(p.umbral_creditos).toFixed(2) }} USD</dd>
                <dd class="text-xs text-navy/40 mt-0.5">Definido por la plataforma. Por debajo de este monto tus chats pasan a solo lectura.</dd>
              </div>
            </dl>
          </section>
        </div>

        <!-- Formulario de edición -->
        <form v-else-if="editing" @submit.prevent="saveProfile" novalidate class="space-y-6">
          <section class="space-y-4">
            <h3 class="section-title">Marca</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label">Nombre comercial</label>
                <input v-model="form.nombre_comercial" required maxlength="255"
                  :class="['input', { '!border-coral': pv$.nombre_comercial.$error }]" />
                <p v-if="pv$.nombre_comercial.$error" class="text-coral text-xs mt-1">
                  {{ pv$.nombre_comercial.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field">
                <label class="label">Rubro / industria</label>
                <select v-model="form.rubro" required
                  :class="['input', { '!border-coral': pv$.rubro.$error }]">
                  <option value="">— Selecciona —</option>
                  <option v-for="r in RUBROS" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
                <p v-if="pv$.rubro.$error" class="text-coral text-xs mt-1">
                  {{ pv$.rubro.$errors[0]?.$message }}
                </p>
              </div>
            </div>
            <div class="field">
              <label class="label">Descripción de la marca <span class="text-navy/40 font-normal text-xs">— visible en tu perfil público</span></label>
              <textarea v-model="form.descripcion" class="input" rows="3" maxlength="1000"
                placeholder="Qué vende tu marca, a quién le habla y qué tipo de colaboraciones buscas…" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="field">
                <label class="label">País</label>
                <select v-model="form.pais" required @change="form.departamento = ''"
                  :class="['input', { '!border-coral': pv$.pais.$error }]">
                  <option value="">— Selecciona —</option>
                  <option v-for="pa in PAISES" :key="pa" :value="pa">{{ pa }}</option>
                </select>
                <p v-if="pv$.pais.$error" class="text-coral text-xs mt-1">
                  {{ pv$.pais.$errors[0]?.$message }}
                </p>
              </div>
              <div v-if="form.pais === 'El Salvador'" class="field">
                <label class="label">Departamento</label>
                <select v-model="form.departamento" class="input">
                  <option value="">— Selecciona —</option>
                  <option v-for="d in DEPARTAMENTOS_SV" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="field" :class="form.pais === 'El Salvador' ? '' : 'sm:col-span-2'">
                <label class="label">Dirección</label>
                <input v-model="form.direccion" class="input" maxlength="255" placeholder="Colonia, calle, municipio…" />
              </div>
            </div>
          </section>

          <section class="space-y-4 border-t border-navy/8 pt-4">
            <h3 class="section-title">Presencia online</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div v-for="f in ([
                { key: 'sitio_web',     label: 'Sitio web', placeholder: 'https://…' },
                { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/tumarca' },
                { key: 'tiktok_url',    label: 'TikTok',    placeholder: 'https://tiktok.com/@tumarca' },
              ] as const)" :key="f.key" class="field">
                <label class="label">{{ f.label }}</label>
                <input v-model="form[f.key]" type="url" :placeholder="f.placeholder"
                  :class="['input', { '!border-coral': pv$[f.key].$error }]" />
                <p v-if="pv$[f.key].$error" class="text-coral text-xs mt-1">
                  {{ pv$[f.key].$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <section class="space-y-4 border-t border-navy/8 pt-4">
            <h3 class="section-title">Contacto y facturación</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label">Teléfono / WhatsApp</label>
                <input v-model="form.telefono" type="tel" required placeholder="+503 7000-0000"
                  :class="['input', { '!border-coral': pv$.telefono.$error }]" />
                <p v-if="pv$.telefono.$error" class="text-coral text-xs mt-1">
                  {{ pv$.telefono.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field">
                <label class="label">Correo de facturación <span class="text-navy/40 font-normal text-xs">— si es distinto a tu correo de acceso</span></label>
                <input v-model="form.email_facturacion" type="email" placeholder="facturacion@tumarca.com"
                  :class="['input', { '!border-coral': pv$.email_facturacion.$error }]" />
                <p v-if="pv$.email_facturacion.$error" class="text-coral text-xs mt-1">
                  {{ pv$.email_facturacion.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field sm:col-span-2">
                <label class="label">Razón social</label>
                <input v-model="form.razon_social" class="input" maxlength="255" placeholder="Nombre legal, ej. Mi Marca S.A. de C.V." />
              </div>
              <div class="field">
                <label class="label">NIT</label>
                <input v-model="form.nit" placeholder="0614-010190-101-1"
                  :class="['input', { '!border-coral': pv$.nit.$error }]" />
                <p v-if="pv$.nit.$error" class="text-coral text-xs mt-1">
                  {{ pv$.nit.$errors[0]?.$message }}
                </p>
              </div>
              <div class="field">
                <label class="label">NRC <span class="text-navy/40 font-normal text-xs">— para crédito fiscal</span></label>
                <input v-model="form.nrc" placeholder="123456-7"
                  :class="['input', { '!border-coral': pv$.nrc.$error }]" />
                <p v-if="pv$.nrc.$error" class="text-coral text-xs mt-1">
                  {{ pv$.nrc.$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <section class="space-y-4 border-t border-navy/8 pt-4">
            <h3 class="section-title">Representante legal</h3>
            <div class="field">
              <label class="label">Nombre completo del representante</label>
              <input v-model="form.representante_nombre" required placeholder="Nombre Apellido"
                :class="['input', { '!border-coral': pv$.representante_nombre.$error }]" />
              <p v-if="pv$.representante_nombre.$error" class="text-coral text-xs mt-1">
                {{ pv$.representante_nombre.$errors[0]?.$message }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="field">
                <label class="label">Tipo de identificación</label>
                <select v-model="form.representante_tipo_identificacion" class="input"
                  @change="pv$.representante_numero_identificacion.$reset()">
                  <option v-for="t in TIPOS_ID" :key="t">{{ t }}</option>
                </select>
              </div>
              <div class="field">
                <label class="label">Número de identificación</label>
                <input v-model="form.representante_numero_identificacion" required
                  :placeholder="form.representante_tipo_identificacion === 'DUI' ? '00000000-0' : 'A00000000'"
                  :class="['input', { '!border-coral': pv$.representante_numero_identificacion.$error }]" />
                <p v-if="pv$.representante_numero_identificacion.$error" class="text-coral text-xs mt-1">
                  {{ pv$.representante_numero_identificacion.$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <p v-if="pv$.$error" class="text-coral text-sm">Revisa los campos marcados en rojo.</p>
          <p v-else-if="profileError" class="text-coral text-sm">{{ profileError }}</p>
          <div class="flex gap-2 pt-1">
            <Button type="submit" :loading="store.saving" label="Guardar cambios" icon="pi pi-check" size="small" />
            <Button type="button" @click="editing = false" label="Cancelar" icon="pi pi-times" severity="secondary" outlined size="small" />
          </div>
        </form>
      </div>

      <!-- ── Campaign Briefs §6.1 ─────────────────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <div>
            <h2 class="font-display font-semibold text-navy text-lg">📋 Briefs de campaña</h2>
            <p class="text-xs mt-0.5 text-navy/40">Reutilizables para adjuntar en chats con influencers</p>
          </div>
          <Button @click="openNewBrief" label="Nuevo brief" icon="pi pi-plus" size="small" />
        </div>

        <!-- Formulario de brief -->
        <div v-if="showBriefForm" class="border border-violet/20 rounded-xl p-5 my-4 space-y-5 bg-violet/5">
          <p class="font-semibold text-navy">
            {{ editingBrief ? '✏️ Editar brief' : '➕ Nuevo brief de campaña' }}
          </p>

          <!-- 1. La campaña -->
          <section class="space-y-4">
            <h3 class="section-title">1. La campaña</h3>
            <div class="field">
              <label class="label">Título de la campaña</label>
              <input v-model="briefForm.titulo_campana" required maxlength="255" placeholder="Lanzamiento Producto X…"
                :class="['input', { '!border-coral': bv$.titulo_campana.$error }]" />
              <p v-if="bv$.titulo_campana.$error" class="text-coral text-xs mt-1">
                {{ bv$.titulo_campana.$errors[0]?.$message }}
              </p>
            </div>
            <div class="field">
              <label class="label">Objetivo principal</label>
              <textarea v-model="briefForm.objetivo_principal" rows="2" required
                placeholder="Aumentar reconocimiento de marca, generar ventas con código de descuento…"
                :class="['input', { '!border-coral': bv$.objetivo_principal.$error }]" />
              <p v-if="bv$.objetivo_principal.$error" class="text-coral text-xs mt-1">
                {{ bv$.objetivo_principal.$errors[0]?.$message }}
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label">Público objetivo</label>
                <input v-model="briefForm.publico_objetivo" class="input" placeholder="Mujeres 18–30, El Salvador, interés en moda" />
              </div>
              <div class="field">
                <label class="label">Tono de voz</label>
                <input v-model="briefForm.tono_de_voz" class="input" maxlength="100" placeholder="Juvenil, aspiracional…" />
              </div>
            </div>
          </section>

          <!-- 2. Entregables y calendario -->
          <section class="space-y-4 border-t border-violet/10 pt-4">
            <h3 class="section-title">2. Entregables y calendario</h3>
            <div class="field">
              <label class="label">Plataformas <span class="text-coral">*</span></label>
              <div class="flex flex-wrap gap-2 rounded-lg" :class="{ 'ring-1 ring-coral p-1': bv$.plataformas.$error }">
                <button v-for="pl in PLATAFORMAS_BRIEF" :key="pl" type="button" @click="togglePlataforma(pl)"
                  class="px-3 py-1.5 rounded-full text-sm border transition-colors"
                  :class="briefForm.plataformas.includes(pl)
                    ? 'bg-violet text-white border-violet'
                    : 'bg-white text-navy/70 border-navy/15 hover:border-violet/40'">
                  {{ pl }}
                </button>
              </div>
              <p v-if="bv$.plataformas.$error" class="text-coral text-xs mt-1">
                {{ bv$.plataformas.$errors[0]?.$message }}
              </p>
            </div>
            <div class="field">
              <label class="label">Formatos y cantidad</label>
              <input v-model="briefForm.formatos" class="input" placeholder="1 Reel de 30s + 3 Stories con link" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="field">
                <label class="label">Fecha de inicio</label>
                <input v-model="briefForm.fecha_inicio" type="date" class="input" />
              </div>
              <div class="field">
                <label class="label">Fecha de fin</label>
                <input v-model="briefForm.fecha_fin" type="date" :min="briefForm.fecha_inicio || undefined"
                  :class="['input', { '!border-coral': bv$.fecha_fin.$error }]" />
                <p v-if="bv$.fecha_fin.$error" class="text-coral text-xs mt-1">
                  {{ bv$.fecha_fin.$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <!-- 3. Contenido -->
          <section class="space-y-4 border-t border-violet/10 pt-4">
            <h3 class="section-title">3. Contenido</h3>
            <div class="field">
              <label class="label">✅ ¿Qué debe incluir el contenido?</label>
              <textarea v-model="briefForm.puntos_clave_si" class="input" rows="2" placeholder="Mostrar el producto en uso natural…" />
            </div>
            <div class="field">
              <label class="label">❌ ¿Qué debe evitar el contenido?</label>
              <textarea v-model="briefForm.restricciones_no" class="input" rows="2" placeholder="No mencionar a la competencia…" />
            </div>
            <div class="field">
              <label class="label">Hashtags, menciones y links</label>
              <input v-model="briefForm.hashtags_menciones" class="input" placeholder="#MiMarca @mimarca · link en bio · código MIMARCA10" />
            </div>
            <label class="flex items-center gap-2 text-sm text-navy cursor-pointer">
              <input v-model="briefForm.requiere_disclosure" type="checkbox" class="accent-violet" />
              Exigir que el contenido se identifique como publicidad (#publi / #ad)
            </label>
          </section>

          <!-- 4. Condiciones comerciales -->
          <section class="space-y-4 border-t border-violet/10 pt-4">
            <h3 class="section-title">4. Presupuesto y condiciones</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="field">
                <label class="label">Presupuesto mínimo (USD)</label>
                <input v-model.number="briefForm.presupuesto_min" type="number" min="0" step="10" class="input" placeholder="100" />
              </div>
              <div class="field">
                <label class="label">Presupuesto máximo (USD)</label>
                <input v-model.number="briefForm.presupuesto_max" type="number" min="0" step="10" placeholder="500"
                  :class="['input', { '!border-coral': bv$.presupuesto_max.$error }]" />
                <p v-if="bv$.presupuesto_max.$error" class="text-coral text-xs mt-1">
                  {{ bv$.presupuesto_max.$errors[0]?.$message }}
                </p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label">Derechos de uso del contenido</label>
                <select v-model="briefForm.derechos_uso" class="input">
                  <option v-for="d in DERECHOS_USO" :key="d.value" :value="d.value">{{ d.label }}</option>
                </select>
              </div>
              <div class="field">
                <label class="label">Exclusividad (días sin trabajar con la competencia)</label>
                <input v-model.number="briefForm.exclusividad_dias" type="number" min="0" max="365" placeholder="0 = sin exclusividad"
                  :class="['input', { '!border-coral': bv$.exclusividad_dias.$error }]" />
                <p v-if="bv$.exclusividad_dias.$error" class="text-coral text-xs mt-1">
                  {{ bv$.exclusividad_dias.$errors[0]?.$message }}
                </p>
              </div>
            </div>
            <div v-if="Number(briefForm.exclusividad_dias) > 0" class="field">
              <label class="label">Marcas o categorías excluidas</label>
              <input v-model="briefForm.exclusividad_detalle" class="input" placeholder="Otras marcas de bebidas energéticas" />
            </div>
          </section>

          <!-- 5. Recursos -->
          <section class="space-y-4 border-t border-violet/10 pt-4">
            <h3 class="section-title">5. Recursos de marca</h3>
            <div class="field">
              <label class="label">Referencias / links</label>
              <input v-model="briefForm.recursos_esteticos" class="input" placeholder="Link a Figma, moodboard, paleta de colores…" />
            </div>
            <div class="field">
              <label class="label">Archivos <span class="text-navy/40 font-normal text-xs">— logos, guía de marca, moodboard (imágenes, PDF o ZIP)</span></label>
              <div class="flex flex-wrap items-center gap-2">
                <div v-for="(f, idx) in briefForm.archivos" :key="f.url"
                  class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border border-navy/10 bg-white text-xs">
                  <i :class="f.tipo_archivo === 'documento' ? 'pi pi-file' : 'pi pi-image'" class="text-violet" />
                  <span class="max-w-[160px] truncate">{{ f.nombre }}</span>
                  <button type="button" @click="removeArchivo(idx)" class="text-navy/40 hover:text-coral px-1" title="Quitar">
                    <i class="pi pi-times text-[0.65rem]" />
                  </button>
                </div>
                <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-violet/40 text-violet text-xs font-medium cursor-pointer hover:bg-violet/5">
                  <i :class="uploading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" />
                  {{ uploading ? 'Subiendo…' : 'Adjuntar archivos' }}
                  <input type="file" multiple class="hidden" :disabled="uploading"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,application/zip,.zip"
                    @change="onArchivos" />
                </label>
              </div>
            </div>
          </section>

          <p v-if="bv$.$error" class="text-coral text-sm">Revisa los campos marcados en rojo.</p>
          <p v-else-if="briefError" class="text-coral text-sm">{{ briefError }}</p>
          <div class="flex gap-2 pt-1">
            <Button @click="saveBrief" :loading="savingBrief" :disabled="uploading"
              :label="editingBrief ? 'Actualizar brief' : 'Crear brief'"
              :icon="editingBrief ? 'pi pi-check' : 'pi pi-plus'" size="small" />
            <Button @click="resetBriefForm" label="Cancelar" icon="pi pi-times"
              severity="secondary" outlined size="small" />
          </div>
        </div>

        <Divider v-if="showBriefForm && store.briefs.length > 0" />

        <!-- Estado vacío -->
        <div v-if="store.briefs.length === 0 && !showBriefForm" class="text-center py-10">
          <i class="pi pi-file-edit text-4xl mb-3 block text-violet-light" />
          <p class="font-semibold text-navy">Aún no tienes briefs</p>
          <p class="text-sm mt-1 text-navy/40">Crea uno para adjuntarlo en chats con influencers</p>
          <Button @click="openNewBrief" label="Crear primer brief" icon="pi pi-plus"
            class="mt-4" size="small" severity="secondary" outlined />
        </div>

        <!-- Lista de briefs -->
        <div v-else class="space-y-1">
          <div v-for="(b, idx) in store.briefs" :key="b.id">
            <Divider v-if="idx > 0" class="my-0" />
            <div class="py-4 flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0 space-y-2">
                <p class="font-semibold text-navy leading-snug">{{ b.titulo_campana }}</p>
                <BriefDetails :brief="b" />
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <Button @click="startEditBrief(b)"
                  icon="pi pi-pencil" v-tooltip.top="'Editar brief'"
                  size="small" severity="secondary" text rounded />
                <Button @click="confirmDelete(b.id, b.titulo_campana)"
                  icon="pi pi-trash" v-tooltip.top="'Eliminar'"
                  :loading="deletingBrief === b.id"
                  size="small" severity="danger" text rounded />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

