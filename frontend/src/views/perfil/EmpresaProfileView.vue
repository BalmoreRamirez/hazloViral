<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useProfileStore } from '@/stores/profile'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
// Button, InputText, Textarea, Tag, InputNumber, Divider, Toast, ConfirmDialog
// están registrados globalmente en main.ts — no requieren import local

const store   = useProfileStore()
const toast   = useToast()
const confirm = useConfirm()

const editing       = ref(false)
const showBriefForm = ref(false)
const savingBrief   = ref(false)
const deletingBrief = ref<number | null>(null)
const editingBrief  = ref<number | null>(null)

const form = ref({ nombre_comercial: '', sitio_web: '', umbral_creditos: 5 })

const briefForm = ref({
  titulo_campana: '', objetivo_principal: '', tono_de_voz: '',
  puntos_clave_si: '', restricciones_no: '', recursos_esteticos: '',
})

onMounted(async () => {
  await Promise.all([store.loadEmpresaProfile(), store.loadBriefs()])
  if (store.empresaProfile) {
    form.value.nombre_comercial = store.empresaProfile.nombre_comercial
    form.value.sitio_web        = store.empresaProfile.sitio_web ?? ''
    form.value.umbral_creditos  = Number(store.empresaProfile.umbral_creditos)
  }
})

async function saveProfile() {
  await store.updateEmpresaProfile(form.value)
  editing.value = false
  toast.add({ severity: 'success', summary: 'Perfil actualizado', life: 3000 })
}

function openNewBrief() {
  editingBrief.value = null
  briefForm.value    = { titulo_campana: '', objetivo_principal: '', tono_de_voz: '', puntos_clave_si: '', restricciones_no: '', recursos_esteticos: '' }
  showBriefForm.value = true
}

function startEditBrief(b: any) {
  editingBrief.value  = b.id
  briefForm.value     = { ...b }
  showBriefForm.value = true
}

function resetBriefForm() {
  briefForm.value     = { titulo_campana: '', objetivo_principal: '', tono_de_voz: '', puntos_clave_si: '', restricciones_no: '', recursos_esteticos: '' }
  showBriefForm.value = false
  editingBrief.value  = null
}

async function saveBrief() {
  if (!briefForm.value.titulo_campana) return
  savingBrief.value = true
  try {
    if (editingBrief.value) {
      await store.updateBrief(editingBrief.value, briefForm.value)
      toast.add({ severity: 'success', summary: 'Brief actualizado', life: 3000 })
    } else {
      await store.createBrief(briefForm.value)
      toast.add({ severity: 'success', summary: 'Brief creado', life: 3000 })
    }
    resetBriefForm()
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
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Mi Perfil — Empresa</h1>
        <p class="text-sm mt-1 text-navy-lighter">Gestiona los datos de tu marca y tus briefs de campaña</p>
      </div>

      <!-- ── Datos de la empresa ───────────────────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-display font-semibold text-navy text-lg">🏢 Datos de la empresa</h2>
          <Button v-if="!editing" @click="editing = true"
            label="Editar" icon="pi pi-pencil" severity="secondary" size="small" outlined />
        </div>

        <div v-if="store.loading" class="py-6 text-center text-navy/40 text-sm">
          <i class="pi pi-spin pi-spinner mr-2" />Cargando…
        </div>

        <!-- Vista de datos -->
        <dl v-else-if="!editing && store.empresaProfile" class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div>
            <dt class="label">Nombre comercial</dt>
            <dd class="font-semibold text-navy mt-1">{{ store.empresaProfile.nombre_comercial }}</dd>
          </div>
          <div>
            <dt class="label">Sitio web</dt>
            <dd class="mt-1">
              <a v-if="store.empresaProfile.sitio_web" :href="store.empresaProfile.sitio_web"
                target="_blank" class="text-violet underline hover:text-violet/80 transition-colors">
                {{ store.empresaProfile.sitio_web }}
              </a>
              <span v-else class="text-navy/40 italic">No configurado</span>
            </dd>
          </div>
          <div>
            <dt class="label">Balance de créditos</dt>
            <dd class="font-bold text-2xl mt-1"
              :class="Number(store.empresaProfile.balance_creditos) > Number(store.empresaProfile.umbral_creditos) ? 'text-violet' : 'text-coral'">
              {{ Number(store.empresaProfile.balance_creditos).toFixed(2) }}
              <span class="text-sm font-normal text-navy/40"> créditos</span>
            </dd>
          </div>
          <div>
            <dt class="label">Umbral mínimo (solo lectura)</dt>
            <dd class="font-semibold text-navy mt-1">{{ Number(store.empresaProfile.umbral_creditos).toFixed(2) }} cr.</dd>
          </div>
        </dl>

        <!-- Formulario de edición -->
        <form v-else-if="editing" @submit.prevent="saveProfile" class="space-y-4">
          <div class="field">
            <label class="label">Nombre comercial</label>
            <InputText v-model="form.nombre_comercial" class="w-full" required />
          </div>
          <div class="field">
            <label class="label">Sitio web</label>
            <InputText v-model="form.sitio_web" type="url" class="w-full" placeholder="https://…" />
          </div>
          <div class="field">
            <label class="label">Umbral de créditos</label>
            <InputNumber v-model="form.umbral_creditos" class="w-full" :min="0" :step="0.5"
              :minFractionDigits="2" :maxFractionDigits="2" suffix=" cr." fluid />
          </div>
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
          <Button @click="openNewBrief"
            label="Nuevo brief" icon="pi pi-plus" size="small" />
        </div>

        <!-- Formulario de brief -->
        <div v-if="showBriefForm"
          class="border border-violet/20 rounded-xl p-5 my-4 space-y-4 bg-violet/5">
          <p class="font-semibold text-navy">
            {{ editingBrief ? '✏️ Editar brief' : '➕ Nuevo brief de campaña' }}
          </p>
          <div class="field">
            <label class="label">Título de la campaña</label>
            <InputText v-model="briefForm.titulo_campana" class="w-full" placeholder="Lanzamiento Producto X…" required />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="field">
              <label class="label">Objetivo principal</label>
              <InputText v-model="briefForm.objetivo_principal" class="w-full" placeholder="Aumentar awareness…" />
            </div>
            <div class="field">
              <label class="label">Tono de voz</label>
              <InputText v-model="briefForm.tono_de_voz" class="w-full" placeholder="Juvenil, aspiracional…" />
            </div>
          </div>
          <div class="field">
            <label class="label">✅ Do's — puntos clave a incluir</label>
            <Textarea v-model="briefForm.puntos_clave_si" class="w-full" rows="2"
              placeholder="Mostrar el producto en uso natural…" autoResize />
          </div>
          <div class="field">
            <label class="label">❌ Don'ts — restricciones</label>
            <Textarea v-model="briefForm.restricciones_no" class="w-full" rows="2"
              placeholder="No mencionar a la competencia…" autoResize />
          </div>
          <div class="field">
            <label class="label">Recursos estéticos / referencias</label>
            <InputText v-model="briefForm.recursos_esteticos" class="w-full"
              placeholder="Link a Figma, moodboard, paleta de colores…" />
          </div>
          <div class="flex gap-2 pt-1">
            <Button @click="saveBrief" :loading="savingBrief" :disabled="!briefForm.titulo_campana"
              :label="editingBrief ? 'Actualizar brief' : 'Crear brief'"
              :icon="editingBrief ? 'pi pi-check' : 'pi pi-plus'" size="small" />
            <Button @click="resetBriefForm" label="Cancelar" icon="pi pi-times"
              severity="secondary" outlined size="small" />
          </div>
        </div>

        <Divider v-if="showBriefForm && store.briefs.length > 0" />

        <!-- Estado vacío -->
        <div v-if="store.briefs.length === 0 && !showBriefForm"
          class="text-center py-10">
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
              <!-- Contenido del brief -->
              <div class="flex-1 min-w-0 space-y-2">
                <p class="font-semibold text-navy leading-snug">{{ b.titulo_campana }}</p>

                <div class="flex flex-wrap gap-2">
                  <Tag v-if="b.tono_de_voz" :value="'🎤 ' + b.tono_de_voz"
                    severity="info" rounded style="font-size:0.7rem" />
                  <Tag v-if="b.objetivo_principal"
                    :value="b.objetivo_principal.length > 40 ? b.objetivo_principal.slice(0,40)+'…' : b.objetivo_principal"
                    severity="secondary" rounded style="font-size:0.7rem" />
                </div>

                <div class="space-y-0.5 text-xs text-navy-lighter">
                  <p v-if="b.puntos_clave_si">
                    <span class="font-medium text-green-600">✅</span> {{ b.puntos_clave_si }}
                  </p>
                  <p v-if="b.restricciones_no">
                    <span class="font-medium text-coral">❌</span> {{ b.restricciones_no }}
                  </p>
                  <p v-if="b.recursos_esteticos">
                    <span class="font-medium text-violet">🎨</span> {{ b.recursos_esteticos }}
                  </p>
                </div>
              </div>

              <!-- Acciones -->
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
