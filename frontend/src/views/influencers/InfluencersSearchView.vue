<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { influencerApi } from '@/api/profiles'

const router = useRouter()

const results    = ref<any[]>([])
const total      = ref(0)
const loading    = ref(false)
const page       = ref(1)

const filters = ref({
  red_social:    '',
  ubicacion:     '',
  min_seguidores: 0,
  max_tarifa:    '',
})

const REDES = ['', 'TikTok', 'Instagram', 'YouTube', 'Twitter', 'Facebook', 'Twitch']

async function search() {
  loading.value = true
  page.value    = 1
  try {
    const params: any = { page: 1, limit: 20 }
    if (filters.value.red_social)     params.red_social     = filters.value.red_social
    if (filters.value.ubicacion)      params.ubicacion      = filters.value.ubicacion
    if (filters.value.min_seguidores) params.min_seguidores = filters.value.min_seguidores
    if (filters.value.max_tarifa)     params.max_tarifa     = Number(filters.value.max_tarifa)
    const data = await influencerApi.search(params)
    results.value = data.data
    total.value   = data.total
  } finally { loading.value = false }
}

onMounted(search)

function clearFilters() {
  filters.value = { red_social: '', ubicacion: '', min_seguidores: 0, max_tarifa: '' }
  search()
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const REDES_ICON: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Twitter: '𝕏',
  Facebook: '👤', Twitch: '🎮', LinkedIn: '💼',
}
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div>
        <h1 class="text-2xl font-display font-bold text-navy">Buscar influencers</h1>
        <p class="text-navy/50 text-sm mt-1">{{ total }} influencer{{ total !== 1 ? 's' : '' }} disponibles</p>
      </div>

      <!-- Filtros -->
      <div class="card">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="field">
            <label class="label">Red social</label>
            <select v-model="filters.red_social" class="input" @change="search">
              <option value="">Todas</option>
              <option v-for="r in REDES.slice(1)" :key="r">{{ r }}</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Ubicación</label>
            <input v-model="filters.ubicacion" class="input" placeholder="Bogotá…" @keyup.enter="search" />
          </div>
          <div class="field">
            <label class="label">Min. seguidores</label>
            <input v-model.number="filters.min_seguidores" type="number" min="0" class="input" @keyup.enter="search" />
          </div>
          <div class="field">
            <label class="label">Tarifa máx. (USD)</label>
            <input v-model="filters.max_tarifa" type="number" min="0" class="input" @keyup.enter="search" />
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="search" :disabled="loading" class="btn-primary text-sm">
            {{ loading ? 'Buscando…' : '🔍 Buscar' }}
          </button>
          <button @click="clearFilters" class="btn-ghost text-sm">Limpiar</button>
        </div>
      </div>

      <!-- Resultados -->
      <div v-if="loading" class="text-center py-12 text-navy/40">Buscando influencers…</div>

      <div v-else-if="results.length === 0" class="card text-center py-10">
        <p class="text-navy/40 text-sm">No se encontraron influencers con esos filtros.</p>
        <button @click="clearFilters" class="text-violet text-sm underline mt-2">Limpiar filtros</button>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="inf in results" :key="inf.id"
          @click="router.push(`/influencers/${inf.id}`)"
          class="card cursor-pointer hover:shadow-md transition-shadow">
          <!-- Avatar + nombre -->
          <div class="flex items-center gap-3 mb-3">
            <div class="w-11 h-11 rounded-full bg-violet/20 flex items-center justify-center text-lg font-bold text-violet shrink-0">
              {{ inf.nombre_artistico?.[0]?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="font-display font-semibold text-navy truncate">{{ inf.nombre_artistico }}</p>
              <p class="text-xs text-navy/50">{{ inf.ubicacion || 'Sin ubicación' }}</p>
            </div>
          </div>

          <!-- Bio -->
          <p v-if="inf.bio" class="text-xs text-navy/60 mb-3 line-clamp-2">{{ inf.bio }}</p>

          <!-- Tarifa -->
          <div class="flex items-center justify-between mb-3">
            <span class="badge-info">💰 ${{ Number(inf.tarifa_base).toFixed(0) }} USD</span>
            <span class="badge-active text-xs">✅ Disponible</span>
          </div>

          <!-- Métricas -->
          <div v-if="inf.metrics?.length" class="space-y-1.5">
            <div v-for="m in inf.metrics.slice(0, 3)" :key="m.id"
              class="flex items-center justify-between text-xs bg-slate rounded-lg px-2 py-1">
              <span>{{ REDES_ICON[m.red_social] ?? '📱' }} {{ m.red_social }} · {{ m.username }}</span>
              <div class="flex gap-1.5">
                <span class="badge-info text-xs">{{ formatFollowers(m.seguidores) }}</span>
                <span class="badge-active text-xs">{{ m.engagement_rate }}%</span>
              </div>
            </div>
            <p v-if="inf.metrics.length > 3" class="text-xs text-navy/40 text-center">
              +{{ inf.metrics.length - 3 }} redes más
            </p>
          </div>
          <p v-else class="text-xs text-navy/40 italic">Sin métricas cargadas</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
