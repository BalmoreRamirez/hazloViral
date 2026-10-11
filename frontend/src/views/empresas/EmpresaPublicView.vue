<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import StarRating from '@/components/StarRating.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
import { empresaApi, type EmpresaPublicProfile } from '@/api/profiles'
import { empresaRatingsApi, type RatingSummary, type EmpresaRatingItem } from '@/api/ratings'
import { useAuthStore } from '@/stores/auth'
import { rubroLabel } from '@/constants/rubros'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

const profile  = ref<EmpresaPublicProfile | null>(null)
const loading  = ref(true)
const notFound = ref(false)

const summary        = ref<RatingSummary | null>(null)
const reviews        = ref<EmpresaRatingItem[]>([])
const puedeCalificar = ref(false)
const ratingForm     = ref({ estrellas: 0, comentario: '' })
const savingRating   = ref(false)
const ratingError    = ref('')
const ratingDone     = ref(false)

const empresaId = computed(() => Number(route.params.id))

const links = computed(() => {
  const p = profile.value
  if (!p) return []
  return [
    { label: 'Sitio web', icon: 'pi pi-globe',     url: p.sitio_web },
    { label: 'Instagram', icon: 'pi pi-instagram', url: p.instagram_url },
    { label: 'TikTok',    icon: 'pi pi-video',     url: p.tiktok_url },
  ].filter(l => l.url)
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-SV', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function loadRatings() {
  ;[summary.value, reviews.value] = await Promise.all([
    empresaRatingsApi.getSummary(empresaId.value),
    empresaRatingsApi.getAll(empresaId.value),
  ])
}

onMounted(async () => {
  try {
    profile.value = await empresaApi.getPublic(empresaId.value)
    await loadRatings()
    if (authStore.user?.role === 'influencer') {
      const mine = await empresaRatingsApi.getMine(empresaId.value)
      puedeCalificar.value = mine.puede_calificar
      if (mine.rating) {
        ratingForm.value.estrellas  = mine.rating.estrellas
        ratingForm.value.comentario = mine.rating.comentario ?? ''
      }
    }
  } catch {
    notFound.value = true
  } finally { loading.value = false }
})

async function submitRating() {
  if (ratingForm.value.estrellas === 0) return
  savingRating.value = true
  ratingError.value  = ''
  try {
    await empresaRatingsApi.upsert(empresaId.value, {
      estrellas:  ratingForm.value.estrellas,
      comentario: ratingForm.value.comentario.trim() || undefined,
    })
    await loadRatings()
    ratingDone.value = true
  } catch (e: any) {
    ratingError.value = e.response?.data?.message ?? 'Error al guardar la calificación.'
  } finally { savingRating.value = false }
}
</script>

<template>
  <AppLayout>
    <div v-if="loading" class="text-center py-16 text-navy/40">Cargando perfil…</div>
    <div v-else-if="notFound || !profile" class="text-center py-16 text-navy/40">Marca no encontrada.</div>

    <div v-else class="space-y-5">
      <button @click="router.back()" class="text-navy/40 hover:text-navy text-sm flex items-center gap-1">
        ← Volver
      </button>

      <!-- Header -->
      <div class="card">
        <div class="flex items-start gap-4">
          <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="profile.nombre_comercial"
            class="w-16 h-16 rounded-xl object-cover shrink-0 border border-navy/10" />
          <div v-else class="w-16 h-16 rounded-xl bg-violet/20 flex items-center justify-center text-3xl font-bold text-violet shrink-0">
            {{ profile.nombre_comercial?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-xl font-display font-bold text-navy">{{ profile.nombre_comercial }}</h1>
              <VerifiedBadge v-if="profile.is_verified" size="lg" />
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy/50 mt-1">
              <span v-if="profile.rubro">{{ rubroLabel(profile.rubro) }}</span>
              <span v-if="profile.pais">📍 {{ profile.pais }}</span>
              <span v-if="profile.miembro_desde">En HazloViral desde {{ formatDate(profile.miembro_desde) }}</span>
            </div>
            <div v-if="summary?.total" class="flex items-center gap-2 mt-2">
              <StarRating :model-value="Math.round(summary.promedio ?? 0)" readonly size="sm" />
              <span class="text-sm font-semibold text-navy">{{ summary.promedio }}</span>
              <span class="text-xs text-navy/40">({{ summary.total }} {{ summary.total === 1 ? 'reseña' : 'reseñas' }})</span>
            </div>
          </div>
        </div>

        <p v-if="profile.descripcion" class="text-sm text-navy/70 mt-4 whitespace-pre-line">{{ profile.descripcion }}</p>

        <div v-if="links.length" class="flex flex-wrap gap-2 mt-4">
          <a v-for="l in links" :key="l.label" :href="l.url!" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy/10 text-sm text-navy hover:border-violet/40 hover:text-violet transition-colors">
            <i :class="l.icon" />{{ l.label }}
          </a>
        </div>
      </div>

      <!-- Historial en la plataforma -->
      <div class="grid grid-cols-3 gap-4">
        <div class="card text-center">
          <p class="text-2xl font-bold text-violet">{{ profile.stats.contratos_completados }}</p>
          <p class="text-xs text-navy/50 mt-1">Contratos completados</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-violet">{{ profile.stats.influencers_contratados }}</p>
          <p class="text-xs text-navy/50 mt-1">Influencers contratados</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold" :class="profile.stats.disputas ? 'text-coral' : 'text-navy'">{{ profile.stats.disputas }}</p>
          <p class="text-xs text-navy/50 mt-1">Reportes de incumplimiento</p>
        </div>
      </div>

      <!-- Calificar (solo influencers con contrato completado) -->
      <div v-if="puedeCalificar" class="card space-y-3">
        <h2 class="font-display font-semibold text-navy">Califica tu experiencia con esta marca</h2>
        <p class="text-xs text-navy/50">Pagos a tiempo, claridad del brief, trato profesional. Tu reseña ayuda a otros creadores.</p>
        <StarRating v-model="ratingForm.estrellas" size="lg" />
        <textarea v-model="ratingForm.comentario" class="input" rows="2" maxlength="500" placeholder="Comentario (opcional)" />
        <p v-if="ratingError" class="text-coral text-sm">{{ ratingError }}</p>
        <p v-else-if="ratingDone" class="text-green-600 text-sm">¡Gracias! Tu calificación fue guardada.</p>
        <button @click="submitRating" :disabled="ratingForm.estrellas === 0 || savingRating" class="btn-primary text-sm">
          {{ savingRating ? 'Guardando…' : 'Guardar calificación' }}
        </button>
      </div>

      <!-- Reseñas -->
      <div class="card">
        <h2 class="font-display font-semibold text-navy mb-3">Reseñas de influencers</h2>
        <p v-if="!reviews.length" class="text-sm text-navy/40 text-center py-4">Esta marca aún no tiene reseñas.</p>
        <div v-else class="divide-y divide-navy/5">
          <div v-for="r in reviews" :key="r.id" class="py-3">
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold text-sm text-navy">{{ r.influencer_nombre }}</span>
              <span class="text-xs text-navy/40">{{ formatDate(r.updated_at) }}</span>
            </div>
            <StarRating :model-value="r.estrellas" readonly size="sm" />
            <p v-if="r.comentario" class="text-sm text-navy/70 mt-1">{{ r.comentario }}</p>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
