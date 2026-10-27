<script setup lang="ts">
import { viewPath } from '@/router/paths'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import StarRating from '@/components/StarRating.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
import { influencerApi } from '@/api/profiles'
import { PAISES, DEPARTAMENTOS_SV, formatUbicacion } from '@/constants/ubicaciones'
import { RUBROS_INFLUENCER, rubroNombre } from '@/constants/rubros'

const router = useRouter()

const PAGE_SIZE = 20

const results     = ref<any[]>([])
const total       = ref(0)
const loading     = ref(false)
const loadingMore = ref(false)
const page        = ref(1)

const filters = ref({
  red_social:      '',
  ubicacion:       '',
  departamento:    '',
  rubro:           '',
  min_seguidores:  0,
  max_tarifa:      '',
  solo_disponibles: true,
  orden:           'tarifa' as 'tarifa' | 'seguidores' | 'calificacion' | 'recientes',
})

const REDES = ['TikTok', 'Instagram', 'YouTube', 'Facebook']

const ORDENES = [
  { value: 'tarifa',       label: 'Menor tarifa' },
  { value: 'seguidores',   label: 'Más seguidores' },
  { value: 'calificacion', label: 'Mejor calificados' },
  { value: 'recientes',    label: 'Más recientes' },
] as const

const hayMas = computed(() => results.value.length < total.value)

function buildParams(p: number) {
  const params: any = { page: p, limit: PAGE_SIZE, orden: filters.value.orden }
  if (filters.value.red_social)     params.red_social     = filters.value.red_social
  if (filters.value.ubicacion)      params.ubicacion      = formatUbicacion(filters.value.ubicacion, filters.value.departamento)
  if (filters.value.rubro)          params.rubro          = filters.value.rubro
  if (filters.value.min_seguidores) params.min_seguidores = filters.value.min_seguidores
  if (filters.value.max_tarifa)     params.max_tarifa     = Number(filters.value.max_tarifa)
  if (!filters.value.solo_disponibles) params.disponible  = false
  return params
}

/** Nueva búsqueda: vuelve a la página 1. Las calificaciones ya vienen en la respuesta. */
async function search() {
  loading.value = true
  page.value    = 1
  try {
    const data = await influencerApi.search(buildParams(1))
    results.value = data.data
    total.value   = data.total
  } finally { loading.value = false }
}

/** "Cargar más": pide la página siguiente y la agrega a la lista. */
async function loadMore() {
  if (loadingMore.value || !hayMas.value) return
  loadingMore.value = true
  try {
    const next = page.value + 1
    const data = await influencerApi.search(buildParams(next))
    const ids = new Set(results.value.map(r => r.id))
    results.value.push(...data.data.filter((r: any) => !ids.has(r.id)))
    total.value = data.total
    page.value  = next
  } finally { loadingMore.value = false }
}

onMounted(search)

function clearFilters() {
  filters.value = { red_social: '', ubicacion: '', departamento: '', rubro: '', min_seguidores: 0, max_tarifa: '', solo_disponibles: true, orden: 'tarifa' }
  search()
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const REDES_ICON: Record<string, string> = {
  TikTok: 'pi-tiktok', Instagram: 'pi-instagram', YouTube: 'pi-youtube', Facebook: 'pi-facebook',
}
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-display font-bold text-navy">Buscar influencers</h1>
          <p class="text-ink-muted text-sm mt-1">{{ total }} influencer{{ total !== 1 ? 's' : '' }} encontrados</p>
        </div>
        <div class="field">
          <label class="label" for="orden">Ordenar por</label>
          <select id="orden" v-model="filters.orden" class="input" @change="search">
            <option v-for="o in ORDENES" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="field">
            <label class="label">Red social</label>
            <select v-model="filters.red_social" class="input" @change="search">
              <option value="">Todas</option>
              <option v-for="r in REDES" :key="r">{{ r }}</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Ubicación</label>
            <Select v-model="filters.ubicacion" :options="PAISES" filter
              placeholder="Todos los países" showClear class="w-full"
              @change="filters.departamento = ''; search()" />
          </div>
          <div v-if="filters.ubicacion === 'El Salvador'" class="field">
            <label class="label">Departamento</label>
            <select v-model="filters.departamento" class="input" @change="search">
              <option value="">Todos</option>
              <option v-for="d in DEPARTAMENTOS_SV" :key="d">{{ d }}</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Rubro</label>
            <select v-model="filters.rubro" class="input" @change="search">
              <option value="">Todos</option>
              <option v-for="r in RUBROS_INFLUENCER" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Mín. seguidores</label>
            <input v-model.number="filters.min_seguidores" type="number" min="0" class="input" @keyup.enter="search" />
          </div>
          <div class="field">
            <label class="label">Tarifa máx. (USD)</label>
            <input v-model="filters.max_tarifa" type="number" min="0" class="input" @keyup.enter="search" />
          </div>
        </div>
        <div class="flex items-center justify-between mt-3">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input v-model="filters.solo_disponibles" type="checkbox" class="rounded accent-violet" @change="search" />
            <span class="text-sm font-medium text-ink-muted">Solo disponibles</span>
          </label>
          <div class="flex gap-2">
            <button @click="search" :disabled="loading" class="btn-primary text-sm inline-flex items-center gap-1.5">
              <i v-if="!loading" class="pi pi-search" aria-hidden="true" />
              {{ loading ? 'Buscando…' : 'Buscar' }}
            </button>
            <button @click="clearFilters" class="btn-ghost text-sm">Limpiar</button>
          </div>
        </div>
      </div>

      <!-- Resultados -->
      <div v-if="loading" class="text-center py-12 text-ink-muted">Buscando influencers…</div>

      <div v-else-if="results.length === 0" class="card text-center py-10">
        <p class="text-ink-muted text-sm">No se encontraron influencers con esos filtros.</p>
        <button @click="clearFilters" class="text-violet text-sm underline mt-2">Limpiar filtros</button>
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="inf in results" :key="inf.id"
            @click="router.push(viewPath(`/influencers/${inf.id}`))"
            class="card cursor-pointer hover:shadow-md transition-shadow flex flex-col">
            <!-- Foto + nombre + @username -->
            <div class="flex items-center gap-3 mb-3">
              <img v-if="inf.user?.avatar_url" :src="inf.user.avatar_url" :alt="inf.nombre_artistico"
                class="w-12 h-12 rounded-full object-cover shrink-0 border border-border" />
              <div v-else class="w-12 h-12 rounded-full bg-violet/20 flex items-center justify-center text-lg font-bold text-violet shrink-0">
                {{ inf.nombre_artistico?.[0]?.toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="font-display font-semibold text-navy truncate">{{ inf.nombre_artistico }}</p>
                  <VerifiedBadge v-if="inf.is_verified" size="sm" />
                </div>
                <p v-if="inf.username" class="text-xs text-violet font-medium truncate">@{{ inf.username }}</p>
                <p class="text-xs text-ink-muted truncate">{{ inf.ubicacion || 'Sin ubicación' }}</p>
              </div>
            </div>

            <!-- Rubros: el principal primero, con estrella -->
            <div v-if="inf.rubros?.length" class="flex flex-wrap gap-1.5 mb-3">
              <span v-for="(r, i) in inf.rubros.slice(0, 3)" :key="r" class="badge-muted text-xs">
                <i v-if="i === 0" class="pi pi-star-fill text-violet" aria-hidden="true" />{{ rubroNombre(r) }}
              </span>
              <span v-if="inf.rubros.length > 3" class="badge-muted text-xs">+{{ inf.rubros.length - 3 }}</span>
            </div>

            <!-- Bio -->
            <p v-if="inf.bio" class="text-xs text-ink-muted mb-3 line-clamp-2">{{ inf.bio }}</p>

            <!-- Tarifa + calificación -->
            <div class="flex items-center justify-between mb-3 mt-auto">
              <span class="badge-info inline-flex items-center gap-1.5">
                <i class="pi pi-dollar" aria-hidden="true" />
                {{ Number(inf.tarifa_base) > 0 ? `$${Number(inf.tarifa_base).toFixed(0)} USD` : 'A convenir' }}
              </span>
              <div class="flex items-center gap-1.5">
                <template v-if="inf.rating?.total">
                  <StarRating :model-value="Math.round(inf.rating.promedio ?? 0)" readonly size="sm" />
                  <span class="text-xs text-ink-muted">({{ inf.rating.total }})</span>
                </template>
                <span v-else :class="inf.disponibilidad ? 'badge-active' : 'badge-muted'" class="text-xs"
                  :title="inf.disponibilidad ? 'Disponible' : 'No disponible'">
                  <i :class="['pi', inf.disponibilidad ? 'pi-check-circle' : 'pi-lock']" aria-hidden="true" />
                </span>
              </div>
            </div>

            <!-- Métricas -->
            <div v-if="inf.metrics?.length" class="space-y-1.5">
              <div v-for="m in inf.metrics.slice(0, 3)" :key="m.id"
                class="flex items-center justify-between text-xs bg-slate rounded-lg px-2 py-1">
                <span class="inline-flex items-center gap-1.5 min-w-0 truncate"><i :class="['pi', REDES_ICON[m.red_social] ?? 'pi-mobile']" aria-hidden="true" /> {{ m.red_social }} · {{ m.username }}</span>
                <div class="flex gap-1.5 shrink-0">
                  <span class="badge-info text-xs">{{ formatFollowers(m.seguidores) }}</span>
                  <span v-if="Number(m.engagement_rate) > 0" class="badge-active text-xs">{{ m.engagement_rate }}%</span>
                </div>
              </div>
              <p v-if="inf.metrics.length > 3" class="text-xs text-ink-muted text-center">
                +{{ inf.metrics.length - 3 }} redes más
              </p>
            </div>
            <p v-else class="text-xs text-ink-muted italic">Sin métricas cargadas</p>
          </div>
        </div>

        <!-- Paginación -->
        <div class="flex flex-col items-center gap-2 pt-2">
          <p class="text-xs text-ink-muted">Mostrando {{ results.length }} de {{ total }}</p>
          <button v-if="hayMas" @click="loadMore" :disabled="loadingMore" class="btn-ghost text-sm inline-flex items-center gap-1.5">
            <i :class="['pi', loadingMore ? 'pi-spin pi-spinner' : 'pi-angle-down']" aria-hidden="true" />
            {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
          </button>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
