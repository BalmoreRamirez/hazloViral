<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import BriefDetails from '@/components/BriefDetails.vue'
import Dialog from 'primevue/dialog'
import { formatDate } from '@/utils/date'
import { useProfileStore, type BriefArchivo, type CampaignBrief } from '@/stores/profile'
import { campaignsApi, type CampaignBriefPayload } from '@/api/campaigns'
import { PLATAFORMAS_BRIEF, DERECHOS_USO, formatPresupuesto } from '@/constants/brief'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const store = useProfileStore()
const toast = useToast()
const confirm = useConfirm()
const showBriefForm = ref(false)
const savingBrief = ref(false)
const uploading = ref(false)
const deletingBrief = ref<number | null>(null)
const editingBrief = ref<number | null>(null)
const briefError = ref('')
const loadingBriefs = ref(true)
const loadError = ref('')
const detailVisible = ref(false)
const selectedBriefId = ref<number | null>(null)
const selectedBrief = computed(() => store.briefs.find((brief) => brief.id === selectedBriefId.value) ?? null)

function showDetail(brief: CampaignBrief) {
  selectedBriefId.value = brief.id
  detailVisible.value = true
}


async function loadBriefs() {
  loadingBriefs.value = true
  loadError.value = ''
  try { await store.loadBriefs() }
  catch (err) { loadError.value = apiError(err) }
  finally { loadingBriefs.value = false }
}
onMounted(loadBriefs)

function apiError(err: any): string {
  const msg = err?.response?.data?.message
  return Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Ocurrió un error. Intenta de nuevo.')
}

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
  if (savingBrief.value || uploading.value) return
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
      } catch (err) {
        toast.add({ severity: 'error', summary: 'No se pudo eliminar el brief', detail: apiError(err), life: 5000 })
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
      <!-- ── Campaign Briefs §6.1 ─────────────────────────────────────────── -->
      <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div>
            <h1 class="font-display font-semibold text-navy text-2xl inline-flex items-center gap-2"><i class="pi pi-clipboard" aria-hidden="true" /> Briefs de campaña</h1>
            <p class="text-xs mt-0.5 text-ink-muted">Reutilizables para adjuntar en chats con influencers</p>
          </div>
          <Button @click="openNewBrief" label="Nuevo brief" icon="pi pi-plus" size="small" :disabled="loadingBriefs || !!loadError" />
        </div>

        <p v-if="loadingBriefs" class="py-8 text-center text-ink-muted" role="status">Cargando briefs…</p>
        <div v-else-if="loadError" class="py-6 space-y-3" role="alert">
          <p class="text-coral-text">{{ loadError }}</p>
          <Button @click="loadBriefs" label="Reintentar" severity="secondary" outlined />
        </div>
        <!-- Estado vacío -->
        <div v-if="!loadingBriefs && !loadError && store.briefs.length === 0 && !showBriefForm" class="text-center py-10">
          <i class="pi pi-file-edit text-4xl mb-3 block text-violet-light" />
          <p class="font-semibold text-navy">Aún no tienes briefs</p>
          <p class="text-sm mt-1 text-ink-muted">Crea uno para adjuntarlo en chats con influencers</p>
          <Button @click="openNewBrief" label="Crear primer brief" icon="pi pi-plus"
            class="mt-4" size="small" severity="secondary" outlined />
        </div>

        <!-- Tabla de briefs -->
        <div v-if="!loadingBriefs && !loadError && store.briefs.length" class="overflow-x-auto mt-4">
          <table class="w-full min-w-[800px] text-sm text-left">
            <caption class="sr-only">Briefs de campaña de tu empresa</caption>
            <thead class="bg-slate border-b border-border-strong text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" class="px-4 py-3">Campaña</th>
                <th scope="col" class="px-4 py-3">Plataformas</th>
                <th scope="col" class="px-4 py-3">Presupuesto</th>
                <th scope="col" class="px-4 py-3">Calendario</th>
                <th scope="col" class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="b in store.briefs" :key="b.id" class="hover:bg-slate/60 align-top">
                <th scope="row" class="px-4 py-4 font-semibold text-navy">
                  <span class="block max-w-xs break-words">{{ b.titulo_campana }}</span>
                  <span class="block text-xs font-normal text-ink-muted mt-1">Creado el {{ formatDate(b.created_at) }}</span>
                </th>
                <td class="px-4 py-4">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="platform in b.plataformas" :key="platform" class="px-2 py-0.5 rounded-full bg-violet/10 text-violet text-xs">{{ platform }}</span>
                    <span v-if="!b.plataformas?.length" class="text-ink-muted">Sin especificar</span>
                  </div>
                </td>
                <td class="px-4 py-4 text-navy">{{ formatPresupuesto(b.presupuesto_min, b.presupuesto_max) || 'Sin definir' }}</td>
                <td class="px-4 py-4 text-ink-muted whitespace-nowrap">
                  <p>Desde: {{ b.fecha_inicio ? formatDate(b.fecha_inicio) : 'Sin definir' }}</p>
                  <p class="mt-1">Hasta: {{ b.fecha_fin ? formatDate(b.fecha_fin) : 'Sin definir' }}</p>
                </td>
                <td class="px-4 py-4">
                  <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                    <Button @click="showDetail(b)" icon="pi pi-eye" v-tooltip.top="'Ver detalle'" size="small" severity="secondary" text rounded
                      :aria-label="`Ver detalle de ${b.titulo_campana}`" />
                    <Button @click="startEditBrief(b)" icon="pi pi-pencil" v-tooltip.top="'Editar brief'"
                      :aria-label="`Editar ${b.titulo_campana}`" size="small" severity="secondary" text rounded />
                    <Button @click="confirmDelete(b.id, b.titulo_campana)" icon="pi pi-trash" v-tooltip.top="'Eliminar'"
                      :aria-label="`Eliminar ${b.titulo_campana}`" :loading="deletingBrief === b.id" size="small" severity="danger" text rounded />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <Dialog v-model:visible="showBriefForm" modal block-scroll
      :header="editingBrief ? 'Editar brief de campaña' : 'Nuevo brief de campaña'"
      :style="{ width: '64rem', maxWidth: 'calc(100vw - 2rem)', maxHeight: '90dvh' }"
      :content-style="{ overflowY: 'auto', minHeight: '0' }"
      :closable="!savingBrief && !uploading" :close-on-escape="!savingBrief && !uploading"
      @hide="resetBriefForm">
      <p class="text-sm text-ink-muted mb-5">Define la campaña, los entregables y las condiciones. Título, objetivo y al menos una plataforma son obligatorios.</p>
      <form id="campaign-brief-form" class="space-y-5" @submit.prevent="saveBrief">
          <!-- 1. La campaña -->
          <section class="rounded-xl border border-border bg-slate/50 p-4 sm:p-5 space-y-4">
            <h3 class="font-display font-semibold text-navy">1. La campaña</h3>
            <div class="field">
              <label class="label" for="brief-titulo-campana">Título de la campaña</label>
              <input id="brief-titulo-campana" v-model="briefForm.titulo_campana" required maxlength="255" placeholder="Lanzamiento Producto X…"
                :class="['input', { '!border-coral': bv$.titulo_campana.$error }]" />
              <p v-if="bv$.titulo_campana.$error" class="text-coral-text text-xs mt-1">
                {{ bv$.titulo_campana.$errors[0]?.$message }}
              </p>
            </div>
            <div class="field">
              <label class="label" for="brief-objetivo-principal">Objetivo principal</label>
              <textarea id="brief-objetivo-principal" v-model="briefForm.objetivo_principal" rows="2" required
                placeholder="Aumentar reconocimiento de marca, generar ventas con código de descuento…"
                :class="['input', { '!border-coral': bv$.objetivo_principal.$error }]" />
              <p v-if="bv$.objetivo_principal.$error" class="text-coral-text text-xs mt-1">
                {{ bv$.objetivo_principal.$errors[0]?.$message }}
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label" for="brief-publico-objetivo">Público objetivo</label>
                <input id="brief-publico-objetivo" v-model="briefForm.publico_objetivo" class="input" placeholder="Mujeres 18–30, El Salvador, interés en moda" />
              </div>
              <div class="field">
                <label class="label" for="brief-tono-de-voz">Tono de voz</label>
                <input id="brief-tono-de-voz" v-model="briefForm.tono_de_voz" class="input" maxlength="100" placeholder="Juvenil, aspiracional…" />
              </div>
            </div>
          </section>

          <!-- 2. Entregables y calendario -->
          <section class="rounded-xl border border-border bg-slate/50 p-4 sm:p-5 space-y-4">
            <h3 class="font-display font-semibold text-navy">2. Entregables y calendario</h3>
            <div class="field">
              <label class="label">Plataformas <span class="text-coral-text">*</span></label>
              <div class="flex flex-wrap gap-2 rounded-lg" :class="{ 'ring-1 ring-coral p-1': bv$.plataformas.$error }">
                <button v-for="pl in PLATAFORMAS_BRIEF" :key="pl" type="button" :aria-pressed="briefForm.plataformas.includes(pl)" @click="togglePlataforma(pl)"
                  class="px-3 py-1.5 rounded-full text-sm border transition-colors"
                  :class="briefForm.plataformas.includes(pl)
                    ? 'bg-violet text-white border-violet'
                    : 'bg-white text-ink-muted border-navy/15 hover:border-violet/40'">
                  {{ pl }}
                </button>
              </div>
              <p v-if="bv$.plataformas.$error" class="text-coral-text text-xs mt-1">
                {{ bv$.plataformas.$errors[0]?.$message }}
              </p>
            </div>
            <div class="field">
              <label class="label" for="brief-formatos">Formatos y cantidad</label>
              <input id="brief-formatos" v-model="briefForm.formatos" class="input" placeholder="1 Reel de 30s + 3 Stories con link" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label" for="brief-fecha-inicio">Fecha de inicio</label>
                <input id="brief-fecha-inicio" v-model="briefForm.fecha_inicio" type="date" class="input" />
              </div>
              <div class="field">
                <label class="label" for="brief-fecha-fin">Fecha de fin</label>
                <input id="brief-fecha-fin" v-model="briefForm.fecha_fin" type="date" :min="briefForm.fecha_inicio || undefined"
                  :class="['input', { '!border-coral': bv$.fecha_fin.$error }]" />
                <p v-if="bv$.fecha_fin.$error" class="text-coral-text text-xs mt-1">
                  {{ bv$.fecha_fin.$errors[0]?.$message }}
                </p>
              </div>
            </div>
          </section>

          <!-- 3. Contenido -->
          <section class="rounded-xl border border-border bg-slate/50 p-4 sm:p-5 space-y-4">
            <h3 class="font-display font-semibold text-navy">3. Contenido</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="field">
              <label class="label" for="brief-puntos-clave-si"><i class="pi pi-check-circle text-success mr-1.5" aria-hidden="true" />¿Qué debe incluir el contenido?</label>
              <textarea id="brief-puntos-clave-si" v-model="briefForm.puntos_clave_si" class="input" rows="2" placeholder="Mostrar el producto en uso natural…" />
            </div>
            <div class="field">
              <label class="label" for="brief-restricciones-no"><i class="pi pi-times-circle text-coral-text mr-1.5" aria-hidden="true" />¿Qué debe evitar el contenido?</label>
              <textarea id="brief-restricciones-no" v-model="briefForm.restricciones_no" class="input" rows="2" placeholder="No mencionar a la competencia…" />
            </div>
            </div>
            <div class="field">
              <label class="label" for="brief-hashtags-menciones">Hashtags, menciones y links</label>
              <input id="brief-hashtags-menciones" v-model="briefForm.hashtags_menciones" class="input" placeholder="#MiMarca @mimarca · link en bio · código MIMARCA10" />
            </div>
            <label class="flex items-center gap-2 text-sm text-navy cursor-pointer">
              <input v-model="briefForm.requiere_disclosure" type="checkbox" class="accent-violet" />
              Exigir que el contenido se identifique como publicidad (#publi / #ad)
            </label>
          </section>

          <!-- 4. Condiciones comerciales -->
          <section class="rounded-xl border border-border bg-slate/50 p-4 sm:p-5 space-y-4">
            <h3 class="font-display font-semibold text-navy">4. Presupuesto y condiciones</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label" for="brief-presupuesto-min">Presupuesto mínimo (USD)</label>
                <input id="brief-presupuesto-min" v-model.number="briefForm.presupuesto_min" type="number" min="0" step="10" class="input" placeholder="100" />
              </div>
              <div class="field">
                <label class="label" for="brief-presupuesto-max">Presupuesto máximo (USD)</label>
                <input id="brief-presupuesto-max" v-model.number="briefForm.presupuesto_max" type="number" min="0" step="10" placeholder="500"
                  :class="['input', { '!border-coral': bv$.presupuesto_max.$error }]" />
                <p v-if="bv$.presupuesto_max.$error" class="text-coral-text text-xs mt-1">
                  {{ bv$.presupuesto_max.$errors[0]?.$message }}
                </p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label class="label" for="brief-derechos-uso">Derechos de uso del contenido</label>
                <select id="brief-derechos-uso" v-model="briefForm.derechos_uso" class="input">
                  <option v-for="d in DERECHOS_USO" :key="d.value" :value="d.value">{{ d.label }}</option>
                </select>
              </div>
              <div class="field">
                <label class="label" for="brief-exclusividad-dias">Exclusividad (días sin trabajar con la competencia)</label>
                <input id="brief-exclusividad-dias" v-model.number="briefForm.exclusividad_dias" type="number" min="0" max="365" placeholder="0 = sin exclusividad"
                  :class="['input', { '!border-coral': bv$.exclusividad_dias.$error }]" />
                <p v-if="bv$.exclusividad_dias.$error" class="text-coral-text text-xs mt-1">
                  {{ bv$.exclusividad_dias.$errors[0]?.$message }}
                </p>
              </div>
            </div>
            <div v-if="Number(briefForm.exclusividad_dias) > 0" class="field">
              <label class="label" for="brief-exclusividad-detalle">Marcas o categorías excluidas</label>
              <input id="brief-exclusividad-detalle" v-model="briefForm.exclusividad_detalle" class="input" placeholder="Otras marcas de bebidas energéticas" />
            </div>
          </section>

          <!-- 5. Recursos -->
          <section class="rounded-xl border border-border bg-slate/50 p-4 sm:p-5 space-y-4">
            <h3 class="font-display font-semibold text-navy">5. Recursos de marca</h3>
            <div class="field">
              <label class="label" for="brief-recursos-esteticos">Referencias / links</label>
              <input id="brief-recursos-esteticos" v-model="briefForm.recursos_esteticos" class="input" placeholder="Link a Figma, moodboard, paleta de colores…" />
            </div>
            <div class="field">
              <label class="label">Archivos <span class="text-ink-muted font-normal text-xs">— logos, guía de marca, moodboard (imágenes, PDF o ZIP)</span></label>
              <div class="flex flex-wrap items-center gap-2">
                <div v-for="(f, idx) in briefForm.archivos" :key="f.url"
                  class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border border-border bg-white text-xs">
                  <i :class="f.tipo_archivo === 'documento' ? 'pi pi-file' : 'pi pi-image'" class="text-violet" />
                  <span class="max-w-[160px] truncate">{{ f.nombre }}</span>
                  <button type="button" @click="removeArchivo(idx)" class="text-ink-muted hover:text-coral-text px-1" title="Quitar">
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

      </form>
      <template #footer>
        <div class="w-full border-t border-border pt-4 space-y-3">
          <p v-if="bv$.$error" role="alert" class="text-coral-text text-sm">Revisa los campos marcados en rojo.</p>
          <p v-if="briefError" role="alert" class="text-coral-text text-sm">{{ briefError }}</p>
          <div class="flex flex-wrap justify-end gap-2">
            <Button type="button" @click="resetBriefForm" label="Cancelar" icon="pi pi-times"
              :disabled="savingBrief || uploading" severity="secondary" outlined />
            <Button type="submit" form="campaign-brief-form" :loading="savingBrief" :disabled="uploading"
              :label="editingBrief ? 'Guardar cambios' : 'Crear brief'" icon="pi pi-check" />
          </div>
        </div>
      </template>
    </Dialog>
    <Dialog v-model:visible="detailVisible" modal header="Detalle del brief de campaña"
      :style="{ width: '48rem', maxWidth: 'calc(100vw - 2rem)' }" dismissable-mask>
      <div v-if="selectedBrief" class="space-y-5">
        <div>
          <h2 class="font-display text-xl font-bold text-navy break-words">{{ selectedBrief.titulo_campana }}</h2>
          <p class="text-xs text-ink-muted mt-1">Brief #{{ selectedBrief.id }} · Creado el {{ formatDate(selectedBrief.created_at) }}</p>
        </div>
        <div class="whitespace-pre-wrap break-words"><BriefDetails :brief="selectedBrief" /></div>
        <dl class="border-t border-border pt-4 text-sm space-y-3">
          <div><dt class="font-semibold text-navy">Identificación como publicidad</dt>
            <dd class="text-ink-muted">{{ selectedBrief.requiere_disclosure ? 'Obligatoria (#publi / #ad)' : 'No requerida en este brief' }}</dd>
          </div>
          <div v-if="!selectedBrief.archivos?.length"><dt class="font-semibold text-navy">Archivos adjuntos</dt><dd class="text-ink-muted">Sin archivos adjuntos.</dd></div>
        </dl>
      </div>
      <p v-else class="text-ink-muted">Este brief ya no está disponible.</p>
      <template #footer>
        <Button label="Cerrar" severity="secondary" outlined @click="detailVisible = false" />
      </template>
    </Dialog>
  </AppLayout>
</template>
