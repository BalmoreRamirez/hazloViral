<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()

// Settings
const editingKey   = ref<string | null>(null)
const editingValue = ref('')
const savingKey    = ref<string | null>(null)

// Disputes
const resolving       = ref<number | null>(null)
const disputeDecision = ref<'empresa' | 'influencer' | 'split'>('influencer')
const disputeNota     = ref('')
const showResolve     = ref<number | null>(null)

// Users
const togglingId = ref<number | null>(null)

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

async function resolve(id: number) {
  if (!disputeNota.value) return
  resolving.value = id
  try {
    await adminStore.resolveDispute(id, disputeDecision.value, disputeNota.value)
    showResolve.value = null
    disputeNota.value = ''
  } catch (e: any) { alert(e.response?.data?.message ?? 'Error') }
  finally { resolving.value = null }
}

async function toggleUser(id: number, current: boolean) {
  togglingId.value = id
  try { await adminStore.toggleUserStatus(id, !current) }
  finally { togglingId.value = null }
}

const DECISION_LABEL = { empresa: '↩️ Devolver a empresa', influencer: '✅ Pagar a influencer', split: '⚖️ Dividir mitad' }
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
          <p class="text-2xl font-bold" :class="key === 'disputas' && val > 0 ? 'text-coral' : 'text-violet'">{{ val }}</p>
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

      <!-- Disputes -->
      <div class="card">
        <h2 class="font-display font-semibold text-navy mb-4 flex items-center gap-2">
          ⚠️ Contratos en disputa
          <span v-if="adminStore.disputes.length > 0" class="badge-warning">{{ adminStore.disputes.length }}</span>
        </h2>
        <div v-if="adminStore.disputes.length === 0" class="text-center py-6 text-navy/40 text-sm">
          No hay disputas activas. ✅
        </div>
        <div v-else class="space-y-4">
          <div v-for="d in adminStore.disputes" :key="d.id" class="border border-coral/20 rounded-xl p-4 space-y-3">
            <div class="flex items-start justify-between">
              <div>
                <p class="font-semibold text-navy">{{ d.empresa?.nombre_comercial ?? 'Empresa' }} → {{ d.influencer?.nombre_artistico ?? 'Influencer' }} — ${{ d.monto_total }} USD</p>
                <p class="text-xs text-navy/40 mt-0.5">{{ new Date(d.created_at).toLocaleDateString() }}</p>
              </div>
              <span class="badge-warning">⚠️ En disputa</span>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-slate rounded-lg p-3">
                <p class="text-xs text-navy/50 mb-1">Empresa</p>
                <p class="font-medium">{{ d.empresa?.nombre_comercial ?? 'Sin nombre' }}</p>
                <p class="text-xs text-navy/40">{{ d.empresa?.user?.email }}</p>
              </div>
              <div class="bg-slate rounded-lg p-3">
                <p class="text-xs text-navy/50 mb-1">Influencer</p>
                <p class="font-medium">{{ d.influencer?.nombre_artistico ?? 'Sin nombre' }}</p>
                <p class="text-xs text-navy/40">{{ d.influencer?.user?.email }}</p>
              </div>
            </div>

            <!-- Formulario de resolución -->
            <div v-if="showResolve === d.id" class="border border-navy/10 rounded-lg p-3 space-y-3 bg-white">
              <p class="text-sm font-semibold text-navy">Resolución del árbitro</p>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="(label, key) in DECISION_LABEL" :key="key"
                  @click="disputeDecision = key as any"
                  :class="['text-xs py-2 px-3 rounded-lg border transition-all font-medium',
                    disputeDecision === key ? 'bg-violet text-white border-violet' : 'border-navy/20 text-navy/60 hover:border-violet/40']">
                  {{ label }}
                </button>
              </div>
              <div>
                <label class="label">Nota del árbitro (obligatoria)</label>
                <textarea v-model="disputeNota" class="input" rows="2" required
                  placeholder="El influencer entregó el trabajo según las especificaciones…" />
              </div>
              <div class="flex gap-2">
                <button @click="resolve(d.id)" :disabled="resolving === d.id || !disputeNota"
                  class="btn-primary text-sm">
                  {{ resolving === d.id ? 'Resolviendo…' : 'Confirmar resolución' }}
                </button>
                <button @click="showResolve = null; disputeNota = ''" class="btn-ghost text-sm">Cancelar</button>
              </div>
            </div>
            <button v-else @click="showResolve = d.id; disputeDecision = 'influencer'"
              class="btn-danger text-sm w-full">
              ⚖️ Resolver disputa
            </button>
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
