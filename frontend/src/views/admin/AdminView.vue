<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()

// Settings
const editingKey   = ref<string | null>(null)
const editingValue = ref('')
const savingKey    = ref<string | null>(null)

// Users
const togglingId = ref<number | null>(null)

// Incumplimientos
const resolvingId    = ref<number | null>(null)
const resolucionText = ref<Record<number, string>>({})
function toggleResolve(id: number) {
  if (resolucionText.value[id] !== undefined) { delete resolucionText.value[id] }
  else { resolucionText.value[id] = '' }
}
async function submitResolve(id: number) {
  if (!resolucionText.value[id]?.trim()) return
  resolvingId.value = id
  try {
    await adminStore.resolveIncumplimiento(id, resolucionText.value[id])
    delete resolucionText.value[id]
  } finally { resolvingId.value = null }
}

onMounted(() => adminStore.fetchAll())

function startEdit(key: string, currentValue: string) {
  editingKey.value   = key
  editingValue.value = currentValue
}

async function saveSetting(key: string) {
  savingKey.value = key
  try { await adminStore.updateSetting(key, editingValue.value) }
  finally { savingKey.value = null; editingKey.value = null }
}

async function toggleUser(id: number, current: boolean) {
  togglingId.value = id
  try { await adminStore.toggleUserStatus(id, !current) }
  finally { togglingId.value = null }
}

const ROLE_BADGE: Record<string, string> = { admin: 'bg-violet/20 text-violet', empresa: 'bg-navy/10 text-navy', influencer: 'bg-green-100 text-green-700' }
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Panel de Administración</h1>
        <p class="text-navy/50 text-sm mt-1">Control global de la plataforma hazloViral</p>
      </div>

      <!-- Stats -->
      <div v-if="adminStore.stats" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div v-for="(val, key) in adminStore.stats" :key="key" class="card text-center py-4">
          <p class="text-2xl font-bold"
            :class="key === 'incumplimientos' && val > 0 ? 'text-coral' : 'text-violet'">{{ val }}</p>
          <p class="text-xs text-navy/50 mt-1 capitalize">{{ key }}</p>
        </div>
      </div>

      <!-- Settings -->
      <div class="card">
        <h2 class="font-display font-semibold text-navy mb-4 flex items-center gap-2">
          ⚙️ Parámetros económicos
          <span class="text-xs badge-info">global_settings</span>
        </h2>
        <div v-if="adminStore.loading" class="text-center py-6 text-navy/40">Cargando…</div>
        <div v-else class="divide-y divide-navy/5">
          <div v-for="s in adminStore.settings" :key="s.key"
            class="py-3 flex items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="font-mono text-sm font-semibold text-navy">{{ s.key }}</p>
              <p class="text-xs text-navy/40 truncate">{{ s.description }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <template v-if="editingKey === s.key">
                <input v-model="editingValue" class="input w-28 text-sm py-1" @keyup.enter="saveSetting(s.key)" />
                <button @click="saveSetting(s.key)" :disabled="savingKey === s.key"
                  class="btn-primary text-xs px-3 py-1.5">
                  {{ savingKey === s.key ? '…' : 'Guardar' }}
                </button>
                <button @click="editingKey = null" class="btn-ghost text-xs px-3 py-1.5">✕</button>
              </template>
              <template v-else>
                <span class="font-semibold text-navy">{{ s.value }}</span>
                <button @click="startEdit(s.key, s.value)"
                  class="text-violet text-xs hover:underline">Editar</button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Incumplimientos -->
      <div class="card">
        <h2 class="font-display font-semibold text-navy mb-4 flex items-center gap-2">
          🚫 Contratos en incumplimiento
          <span v-if="adminStore.incumplimientos.filter(i => !i.resuelto_por_admin).length"
            class="text-xs bg-coral/20 text-coral px-2 py-0.5 rounded-full font-bold">
            {{ adminStore.incumplimientos.filter(i => !i.resuelto_por_admin).length }} sin resolver
          </span>
        </h2>
        <div v-if="!adminStore.incumplimientos.length" class="text-navy/40 text-sm text-center py-4">
          No hay contratos en incumplimiento.
        </div>
        <div v-else class="divide-y divide-navy/5 space-y-0">
          <div v-for="inc in adminStore.incumplimientos" :key="inc.id" class="py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="font-semibold text-sm text-navy">Contrato #{{ inc.id }}</span>
                  <span class="text-xs text-navy/40">
                    {{ inc.empresa?.nombre_comercial ?? '—' }} → {{ inc.influencer?.nombre_artistico ?? '—' }}
                  </span>
                  <span class="badge-info text-xs">${{ Number(inc.monto_total).toFixed(2) }} USD</span>
                  <span v-if="inc.resuelto_por_admin" class="badge-active text-xs">✅ Resuelto</span>
                  <span v-else class="text-xs bg-coral/10 text-coral px-1.5 py-0.5 rounded font-medium">⏳ Pendiente</span>
                </div>
                <p class="text-sm text-navy/70 mb-1"><span class="font-medium">Motivo:</span> {{ inc.motivo_incumplimiento }}</p>
                <p v-if="inc.resolucion_admin" class="text-sm text-green-700 bg-green-50 rounded px-2 py-1 mt-1">
                  <span class="font-medium">Resolución admin:</span> {{ inc.resolucion_admin }}
                </p>
              </div>
              <button v-if="!inc.resuelto_por_admin"
                @click="toggleResolve(inc.id)"
                class="btn-ghost text-xs shrink-0">
                {{ resolucionText[inc.id] !== undefined ? 'Cancelar' : 'Resolver' }}
              </button>
            </div>
            <!-- Panel de resolución -->
            <div v-if="resolucionText[inc.id] !== undefined" class="mt-3 border border-violet/20 rounded-lg p-3 bg-violet/5 space-y-2">
              <p class="text-xs font-semibold text-violet">Nota de resolución (mínimo 10 caracteres)</p>
              <textarea v-model="resolucionText[inc.id]" class="input text-sm" rows="2"
                placeholder="Ej: Se determinó que el influencer incumplió el acuerdo. Se procede con devolución parcial al anunciante…" />
              <div class="flex gap-2">
                <button @click="submitResolve(inc.id)"
                  :disabled="resolvingId === inc.id || !resolucionText[inc.id]?.trim() || (resolucionText[inc.id]?.length ?? 0) < 10"
                  class="btn-primary text-xs">
                  {{ resolvingId === inc.id ? 'Guardando…' : 'Confirmar resolución' }}
                </button>
                <button @click="toggleResolve(inc.id)" class="btn-ghost text-xs">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Users -->
      <div class="card">
        <h2 class="font-display font-semibold text-navy mb-4">👥 Gestión de usuarios</h2>
        <div class="divide-y divide-navy/5">
          <div v-for="u in adminStore.users" :key="u.id"
            class="py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center text-xs font-bold text-violet shrink-0">
                {{ u.email[0]?.toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-navy truncate">{{ u.email }}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span :class="['text-xs px-1.5 py-0.5 rounded font-medium', ROLE_BADGE[u.role]]">
                    {{ u.role }}
                  </span>
                  <span v-if="u.profile?.nombre_comercial" class="text-xs text-navy/40">{{ u.profile.nombre_comercial }}</span>
                  <span v-else-if="u.profile?.nombre_artistico" class="text-xs text-navy/40">{{ u.profile.nombre_artistico }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span :class="u.is_active ? 'badge-active' : 'badge-muted'">
                {{ u.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <button v-if="u.role !== 'admin'"
                @click="toggleUser(u.id, u.is_active)"
                :disabled="togglingId === u.id"
                :class="['text-xs font-semibold transition-colors', u.is_active ? 'text-coral hover:text-coral/70' : 'text-violet hover:text-violet/70']">
                {{ togglingId === u.id ? '…' : u.is_active ? 'Desactivar' : 'Activar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
