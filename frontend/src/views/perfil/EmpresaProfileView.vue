<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useProfileStore } from '@/stores/profile'

const store   = useProfileStore()
const editing = ref(false)
const showBriefForm = ref(false)

// Formulario de edición de perfil
const form = ref({ nombre_comercial: '', sitio_web: '', umbral_creditos: 5 })

// Formulario de brief
const briefForm = ref({
  titulo_campana: '', objetivo_principal: '', tono_de_voz: '',
  puntos_clave_si: '', restricciones_no: '', recursos_esteticos: '',
})
const editingBrief = ref<number | null>(null)
const deletingBrief = ref<number | null>(null)
const savingBrief = ref(false)

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
}

function startEditBrief(b: any) {
  editingBrief.value = b.id
  briefForm.value = { ...b }
}

function resetBriefForm() {
  briefForm.value = { titulo_campana: '', objetivo_principal: '', tono_de_voz: '', puntos_clave_si: '', restricciones_no: '', recursos_esteticos: '' }
  showBriefForm.value = false
  editingBrief.value  = null
}

async function saveBrief() {
  savingBrief.value = true
  try {
    if (editingBrief.value) {
      await store.updateBrief(editingBrief.value, briefForm.value)
    } else {
      await store.createBrief(briefForm.value)
    }
    resetBriefForm()
  } finally { savingBrief.value = false }
}

async function deleteBrief(id: number) {
  deletingBrief.value = id
  try { await store.removeBrief(id) }
  finally { deletingBrief.value = null }
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Mi Perfil — Empresa</h1>
        <p class="text-navy/50 text-sm mt-1">Gestiona los datos de tu marca y tus briefs de campaña</p>
      </div>

      <!-- Perfil empresa -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-display font-semibold text-navy">Datos de la empresa</h2>
          <button v-if="!editing" @click="editing = true" class="btn-secondary text-sm">
            ✏️ Editar
          </button>
        </div>

        <div v-if="store.loading" class="text-navy/40 text-sm py-4">Cargando…</div>

        <template v-else-if="!editing && store.empresaProfile">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="label">Nombre comercial</dt>
              <dd class="font-semibold text-navy">{{ store.empresaProfile.nombre_comercial }}</dd>
            </div>
            <div>
              <dt class="label">Sitio web</dt>
              <dd>
                <a v-if="store.empresaProfile.sitio_web" :href="store.empresaProfile.sitio_web"
                  target="_blank" class="text-violet underline">
                  {{ store.empresaProfile.sitio_web }}
                </a>
                <span v-else class="text-navy/40 italic">No configurado</span>
              </dd>
            </div>
            <div>
              <dt class="label">Balance de créditos</dt>
              <dd class="font-bold text-lg" :class="Number(store.empresaProfile.balance_creditos) > Number(store.empresaProfile.umbral_creditos) ? 'text-navy' : 'text-coral'">
                {{ Number(store.empresaProfile.balance_creditos).toFixed(2) }} cr.
              </dd>
            </div>
            <div>
              <dt class="label">Umbral mínimo</dt>
              <dd class="font-semibold">{{ Number(store.empresaProfile.umbral_creditos).toFixed(2) }} cr.</dd>
            </div>
          </dl>
        </template>

        <!-- Formulario de edición -->
        <form v-else-if="editing" @submit.prevent="saveProfile" class="space-y-4">
          <div class="field">
            <label class="label">Nombre comercial</label>
            <input v-model="form.nombre_comercial" class="input" required />
          </div>
          <div class="field">
            <label class="label">Sitio web</label>
            <input v-model="form.sitio_web" type="url" class="input" placeholder="https://…" />
          </div>
          <div class="field">
            <label class="label">Umbral de créditos (solo lectura por debajo)</label>
            <input v-model.number="form.umbral_creditos" type="number" min="0" step="0.5" class="input" />
          </div>
          <div class="flex gap-2">
            <button type="submit" :disabled="store.saving" class="btn-primary text-sm">
              {{ store.saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
            <button type="button" @click="editing = false" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </form>
      </div>

      <!-- Campaign Briefs §6.1 -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-display font-semibold text-navy">Briefs de campaña</h2>
            <p class="text-xs text-navy/40 mt-0.5">Reutilizables para adjuntar en chats con influencers</p>
          </div>
          <button @click="showBriefForm = true; editingBrief = null; resetBriefForm(); showBriefForm = true"
            class="btn-primary text-sm">+ Nuevo brief</button>
        </div>

        <!-- Formulario de brief -->
        <div v-if="showBriefForm || editingBrief" class="border border-violet/20 rounded-xl p-4 mb-4 bg-violet/5 space-y-3">
          <p class="font-semibold text-navy text-sm">{{ editingBrief ? 'Editar brief' : 'Nuevo brief de campaña' }}</p>
          <div class="field">
            <label class="label">Título de la campaña *</label>
            <input v-model="briefForm.titulo_campana" class="input" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label class="label">Objetivo principal</label>
              <input v-model="briefForm.objetivo_principal" class="input" placeholder="Aumentar awareness…" />
            </div>
            <div class="field">
              <label class="label">Tono de voz</label>
              <input v-model="briefForm.tono_de_voz" class="input" placeholder="Juvenil, aspiracional…" />
            </div>
          </div>
          <div class="field">
            <label class="label">✅ Do's (puntos clave a incluir)</label>
            <textarea v-model="briefForm.puntos_clave_si" class="input" rows="2" placeholder="Mostrar producto en uso natural…" />
          </div>
          <div class="field">
            <label class="label">❌ Don'ts (restricciones)</label>
            <textarea v-model="briefForm.restricciones_no" class="input" rows="2" placeholder="No mencionar competencia…" />
          </div>
          <div class="field">
            <label class="label">Recursos estéticos / referencias</label>
            <input v-model="briefForm.recursos_esteticos" class="input" placeholder="Link a Figma, paleta de colores…" />
          </div>
          <div class="flex gap-2">
            <button @click="saveBrief" :disabled="savingBrief || !briefForm.titulo_campana" class="btn-primary text-sm">
              {{ savingBrief ? 'Guardando…' : (editingBrief ? 'Actualizar' : 'Crear brief') }}
            </button>
            <button @click="resetBriefForm" class="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>

        <!-- Lista de briefs -->
        <div v-if="store.briefs.length === 0 && !showBriefForm" class="text-center py-8 text-navy/40 text-sm">
          No tienes briefs aún. Crea uno para adjuntarlo en chats con influencers.
        </div>
        <div v-else class="divide-y divide-navy/5">
          <div v-for="b in store.briefs" :key="b.id" class="py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-navy text-sm">{{ b.titulo_campana }}</p>
                <div class="flex flex-wrap gap-2 mt-1">
                  <span v-if="b.tono_de_voz" class="badge-info">🎤 {{ b.tono_de_voz }}</span>
                  <span v-if="b.objetivo_principal" class="badge-muted text-xs truncate max-w-xs">{{ b.objetivo_principal }}</span>
                </div>
                <div class="mt-2 space-y-0.5 text-xs text-navy/50">
                  <p v-if="b.puntos_clave_si">✅ {{ b.puntos_clave_si }}</p>
                  <p v-if="b.restricciones_no">❌ {{ b.restricciones_no }}</p>
                </div>
              </div>
              <div class="flex gap-2 shrink-0">
                <button @click="startEditBrief(b)" class="text-violet text-xs hover:underline">Editar</button>
                <button @click="deleteBrief(b.id)" :disabled="deletingBrief === b.id"
                  class="text-coral text-xs hover:underline disabled:opacity-50">
                  {{ deletingBrief === b.id ? '…' : 'Eliminar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
