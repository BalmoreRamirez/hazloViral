<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import ReviewPagination from '@/components/ReviewPagination.vue'
import AppLayout from '@/components/AppLayout.vue'
import CoverBanner from '@/components/CoverBanner.vue'
import StarRating from '@/components/StarRating.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
import { viewPath } from '@/router/paths'
import { formatDate as formatAppDate } from '@/utils/date'
import { empresaApi, type EmpresaPublicProfile } from '@/api/profiles'
import { empresaRatingsApi, type RatingSummary, type EmpresaRatingItem } from '@/api/ratings'
import { useAuthStore } from '@/stores/auth'
import { rubroLabel } from '@/constants/rubros'

const route = useRoute()
const auth = useAuthStore()
const empresaId = computed(() => Number(route.params.id))
const profile = ref<EmpresaPublicProfile | null>(null)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')
const summary = ref<RatingSummary | null>(null)
const reviews = ref<EmpresaRatingItem[]>([])
const ratingsLoading = ref(false)
const ratingsError = ref('')
const eligibilityError = ref('')
const eligibilityLoading = ref(false)
const ownCompanyId = ref<number | null>(null)
const isOwner = computed(() => ownCompanyId.value === profile.value?.id)
const puedeCalificar = ref(false)
const ratingForm = ref({ estrellas: 0, comentario: '' })
const savingRating = ref(false)
const ratingError = ref('')
const ratingDone = ref(false)
const hasRating = ref(false)
const avatarFailed = ref(false)
const reviewPage = ref(1)
const reviewTotal = ref(0)
const sortedReviews = computed(() => [...reviews.value].sort((a, b) => b.updated_at.localeCompare(a.updated_at)))

function safeUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}
const links = computed(() => profile.value ? [
  { label: 'Sitio web', icon: 'pi-globe', url: safeUrl(profile.value.sitio_web) },
  { label: 'Instagram', icon: 'pi-instagram', url: safeUrl(profile.value.instagram_url) },
  { label: 'TikTok', icon: 'pi-tiktok', url: safeUrl(profile.value.tiktok_url) },
].filter(link => link.url) : [])
function formatDate(value: string) {
  return formatAppDate(value, { year: 'numeric', month: 'short', day: 'numeric' })
}
async function loadRatings(page = reviewPage.value) {
  if (ratingsLoading.value) return
  ratingsLoading.value = true
  ratingsError.value = ''
  try {
    const [ratingSummary, allReviews] = await Promise.all([
      empresaRatingsApi.getSummary(empresaId.value), empresaRatingsApi.getAll(empresaId.value, page),
    ])
    summary.value = ratingSummary
    reviews.value = allReviews.items
    reviewTotal.value = allReviews.total
    reviewPage.value = allReviews.page
  } catch { ratingsError.value = 'No se pudieron cargar las valoraciones. El perfil de la marca sigue disponible.' }
  finally { ratingsLoading.value = false }
}
async function loadEligibility() {
  eligibilityError.value = ''
  if (auth.isEmpresa) {
    const own = await empresaApi.getProfile().catch(() => null)
    ownCompanyId.value = own?.id ?? null
  }
  if (!auth.isInfluencer) return
  eligibilityLoading.value = true
  try {
    const mine = await empresaRatingsApi.getMine(empresaId.value)
    puedeCalificar.value = mine.puede_calificar
    hasRating.value = !!mine.rating
    if (mine.rating) ratingForm.value = { estrellas: mine.rating.estrellas, comentario: mine.rating.comentario ?? '' }
  } catch { eligibilityError.value = 'No se pudo comprobar si puedes calificar esta marca.' }
  finally { eligibilityLoading.value = false }
}
async function loadProfile() {
  loading.value = true
  loadError.value = ''
  notFound.value = false
  avatarFailed.value = false
  try { profile.value = await empresaApi.getPublic(empresaId.value) }
  catch (error: any) {
    notFound.value = error.response?.status === 404
    if (!notFound.value) loadError.value = 'No pudimos cargar el perfil de la empresa. Verifica tu conexión e intenta de nuevo.'
  } finally { loading.value = false }
  if (profile.value && !loadError.value && !notFound.value) await Promise.all([loadRatings(), loadEligibility()])
}
onMounted(loadProfile)
async function submitRating() {
  if (!puedeCalificar.value || savingRating.value || ratingForm.value.estrellas < 1) return
  savingRating.value = true
  ratingError.value = ''
  ratingDone.value = false
  try {
    await empresaRatingsApi.upsert(empresaId.value, { estrellas: ratingForm.value.estrellas, comentario: ratingForm.value.comentario.trim() || undefined })
    ratingDone.value = true
    hasRating.value = true
    await loadRatings(1)
  } catch (error: any) {
    const message = error.response?.data?.message
    ratingError.value = Array.isArray(message) ? message.join(' · ') : message ?? 'No se pudo guardar la calificación. Tu comentario se conserva.'
  } finally { savingRating.value = false }
}
</script>

<template>
  <AppLayout>
    <div v-if="loading" class="space-y-6" role="status" aria-label="Cargando perfil de empresa">
      <div class="h-40 bg-slate-dark/60 animate-pulse rounded-2xl" />
      <div class="grid sm:grid-cols-3 gap-4"><div v-for="i in 3" :key="i" class="h-28 bg-slate-dark/40 animate-pulse rounded-xl" /></div>
      <p class="text-sm text-ink-muted">Cargando información de la marca…</p>
    </div>
    <section v-else-if="notFound || loadError || !profile" class="card max-w-xl mx-auto py-12 text-center space-y-4" role="alert">
      <i class="pi pi-building text-3xl text-ink-muted" aria-hidden="true" />
      <h1 class="page-title font-display font-bold text-navy">{{ notFound ? 'Marca no encontrada' : 'Perfil no disponible' }}</h1>
      <p class="text-sm text-ink-muted">{{ notFound ? 'El enlace puede ser incorrecto o la empresa ya no está disponible.' : loadError }}</p>
      <button v-if="!notFound" type="button" @click="loadProfile" class="btn-primary">Reintentar</button>
      <RouterLink :to="viewPath('/dashboard')" class="btn-secondary inline-flex">Volver al inicio</RouterLink>
    </section>

    <div v-else class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <RouterLink :to="viewPath(isOwner ? '/perfil/empresa' : '/dashboard')" class="inline-flex items-center gap-2 text-sm text-ink-muted ui-hover"><i class="pi pi-arrow-left" aria-hidden="true" />{{ isOwner ? 'Volver a mi perfil' : 'Volver al inicio' }}</RouterLink>
        <span class="text-xs font-medium text-ink-muted inline-flex items-center gap-2"><i class="pi pi-eye" aria-hidden="true" />Perfil público de empresa</span>
      </div>
      <div v-if="isOwner" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet/20 bg-violet-tint px-5 py-3">
        <p class="text-sm text-navy">Así se presenta tu marca a los influencers. Tus datos privados no se muestran aquí.</p>
        <RouterLink :to="viewPath('/perfil/empresa')" class="text-sm font-semibold text-violet inline-flex items-center gap-2"><i class="pi pi-pencil" aria-hidden="true" />Editar mi perfil</RouterLink>
      </div>

      <section class="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <CoverBanner :rubro="profile.rubro" :nombre="profile.nombre_comercial" height="112px" />
        <div class="px-5 sm:px-8 pb-7">
          <div class="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5 -mt-8 relative">
            <div class="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-white p-1.5 shadow-sm shrink-0">
              <img v-if="profile.avatar_url && !avatarFailed" :src="profile.avatar_url" :alt="`Logo de ${profile.nombre_comercial}`" class="w-full h-full rounded-xl object-cover border border-border" @error="avatarFailed = true" />
              <div v-else class="w-full h-full rounded-xl bg-violet-tint flex items-center justify-center text-3xl font-display font-bold text-violet">{{ profile.nombre_comercial[0]?.toUpperCase() }}</div>
            </div>
            <div class="flex-1 min-w-0 sm:pb-1">
              <div class="flex flex-wrap items-center gap-3"><h1 class="page-title font-display font-bold text-navy break-words">{{ profile.nombre_comercial }}</h1><VerifiedBadge v-if="profile.is_verified" size="lg" /></div>
              <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-ink-muted"><span v-if="profile.rubro" class="badge-info">{{ rubroLabel(profile.rubro) }}</span><span v-if="profile.pais" class="inline-flex items-center gap-1.5"><i class="pi pi-map-marker" aria-hidden="true" />{{ profile.pais }}</span></div>
            </div>
            <a href="#brand-reviews" class="sm:pb-1 flex items-center gap-3 rounded-xl bg-slate px-4 py-3 ui-hover focus-visible:outline-2 focus-visible:outline-violet">
              <i class="pi pi-star-fill text-warning" aria-hidden="true" />
              <div><p class="text-sm font-semibold text-navy">{{ ratingsLoading ? 'Cargando…' : ratingsError ? 'No disponible' : summary?.total ? `${summary.promedio} / 5` : 'Sin valoraciones' }}</p><p class="text-xs text-ink-muted mt-0.5">{{ summary?.total && !ratingsError ? `${summary.total} reseñas de influencers` : 'Experiencias de colaboración' }}</p></div>
            </a>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Trayectoria en la plataforma">
        <article v-for="stat in [{ label: 'Contratos completados', value: profile.stats.contratos_completados, icon: 'pi-check-circle', hint: 'Colaboraciones finalizadas en la plataforma' }, { label: 'Creadores con quienes colaboró', value: profile.stats.influencers_contratados, icon: 'pi-users', hint: 'Influencers distintos con contratos completados' }, { label: 'Reportes de incumplimiento', value: profile.stats.disputas, icon: 'pi-flag', hint: 'Reportes registrados; no implican una resolución' }]" :key="stat.label" class="card">
          <div class="flex justify-between items-start gap-3"><p class="text-sm text-ink-muted">{{ stat.label }}</p><i :class="['pi text-violet', stat.icon]" aria-hidden="true" /></div>
          <p class="text-3xl font-display font-bold text-navy tabular-nums mt-3">{{ stat.value }}</p><p class="text-xs text-ink-muted mt-2">{{ stat.hint }}</p>
        </article>
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] items-start">
        <div class="space-y-6 min-w-0">
          <section class="card space-y-4" aria-labelledby="brand-about"><h2 id="brand-about" class="font-display text-lg font-semibold text-navy">Conoce la marca</h2><p v-if="profile.descripcion" class="text-sm sm:text-base text-ink-muted whitespace-pre-line leading-relaxed max-w-prose break-words">{{ profile.descripcion }}</p><p v-else class="text-sm text-ink-muted">Esta marca aún no ha agregado una presentación.</p></section>

          <section id="brand-reviews" class="card space-y-5 scroll-mt-6" aria-labelledby="brand-reviews-title">
            <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 id="brand-reviews-title" class="font-display text-lg font-semibold text-navy">Experiencias de influencers</h2><p class="text-xs text-ink-muted mt-1">Opiniones de creadores que colaboraron con esta empresa.</p></div><span v-if="summary?.total && !ratingsError" class="badge-info">{{ summary.total }} reseñas</span></div>
            <p v-if="ratingsLoading" role="status" class="py-6 text-center text-sm text-ink-muted">Cargando reseñas…</p>
            <div v-else-if="ratingsError" role="alert" class="rounded-xl bg-warning-tint p-4 space-y-3"><p class="text-sm text-warning">{{ ratingsError }}</p><button type="button" class="btn-secondary" @click="loadRatings(reviewPage)">Reintentar reseñas</button></div>
            <div v-else-if="!reviews.length" class="rounded-xl bg-slate p-8 text-center"><i class="pi pi-comments text-2xl text-violet" aria-hidden="true" /><h3 class="text-base font-semibold text-navy mt-3">Las primeras experiencias están por llegar</h3><p class="text-sm text-ink-muted mt-2">Esta marca todavía no tiene reseñas publicadas.</p></div>
            <div v-else class="divide-y divide-border">
              <article v-for="review in sortedReviews" :key="review.id" class="py-5 first:pt-0 last:pb-0">
                <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-semibold text-navy">{{ review.influencer_nombre }}</p><time :datetime="review.updated_at" class="text-xs text-ink-muted">{{ formatDate(review.updated_at) }}</time></div>
                <div class="mt-2"><StarRating :model-value="review.estrellas" readonly size="sm" /><span class="sr-only">{{ review.estrellas }} de 5 estrellas</span></div>
                <p v-if="review.comentario" class="text-sm text-ink-muted mt-3 whitespace-pre-line break-words leading-relaxed">{{ review.comentario }}</p>
              </article>

            </div>
            <ReviewPagination :page="reviewPage" :total="reviewTotal" :loading="ratingsLoading" @change="loadRatings" />
          </section>

          <section v-if="puedeCalificar" class="card space-y-4">
            <div><h2 class="font-display text-lg font-semibold text-navy">{{ hasRating ? 'Tu experiencia con esta marca' : 'Comparte tu experiencia' }}</h2><p class="text-sm text-ink-muted mt-1">Cuenta cómo fue la comunicación, el brief y el proceso de colaboración.</p></div>
            <form class="space-y-4" @submit.prevent="submitRating">
              <fieldset :disabled="savingRating" class="space-y-4"><legend class="sr-only">Calificación de la empresa</legend><div><p id="rating-label" class="label">Tu calificación</p><div aria-labelledby="rating-label"><StarRating v-model="ratingForm.estrellas" size="lg" /></div></div><div><label for="brand-review-comment" class="label">Comentario <span class="font-normal text-ink-muted">(opcional)</span></label><textarea id="brand-review-comment" v-model="ratingForm.comentario" class="input" rows="4" maxlength="500" placeholder="¿Qué deberían saber otros creadores?" /><p class="text-xs text-ink-muted text-right mt-1">{{ ratingForm.comentario.length }} / 500</p></div></fieldset>
              <p v-if="ratingError" role="alert" class="text-coral-text text-sm">{{ ratingError }}</p><p v-if="ratingDone" role="status" class="text-success text-sm">Tu calificación se guardó correctamente.</p><button type="submit" :disabled="ratingForm.estrellas === 0 || savingRating" class="btn-primary">{{ savingRating ? 'Guardando…' : hasRating ? 'Actualizar calificación' : 'Publicar calificación' }}</button>
            </form>
          </section>
          <div v-else-if="auth.isInfluencer" class="rounded-xl border border-border bg-white px-5 py-4 text-sm text-ink-muted"><p>{{ eligibilityLoading ? 'Comprobando si puedes calificar esta marca…' : eligibilityError || 'Puedes calificar esta marca después de completar un contrato con ella.' }}</p><button v-if="eligibilityError" type="button" @click="loadEligibility" class="text-violet font-semibold mt-2">Reintentar</button></div>
        </div>

        <aside class="space-y-6 xl:sticky xl:top-6" aria-label="Información de la marca">
          <section class="card space-y-4"><h2 class="font-display text-lg font-semibold text-navy">Información de la empresa</h2><dl class="text-sm space-y-4"><div><dt class="text-xs text-ink-muted">Sector</dt><dd class="font-medium text-navy mt-1">{{ profile.rubro ? rubroLabel(profile.rubro) : 'Sin especificar' }}</dd></div><div><dt class="text-xs text-ink-muted">Ubicación</dt><dd class="font-medium text-navy mt-1">{{ profile.pais || 'Sin especificar' }}</dd></div><div><dt class="text-xs text-ink-muted">En InfluSmart desde</dt><dd class="font-medium text-navy mt-1">{{ profile.miembro_desde ? formatDate(profile.miembro_desde) : 'No disponible' }}</dd></div></dl><div class="border-t border-border pt-4"><span :class="profile.is_verified ? 'badge-success' : 'badge-muted'"><i :class="['pi', profile.is_verified ? 'pi-shield' : 'pi-info-circle']" aria-hidden="true" />{{ profile.is_verified ? 'Marca verificada' : 'Verificación pendiente' }}</span><p class="text-xs text-ink-muted mt-2 leading-relaxed">La insignia refleja los requisitos de perfil verificados por la plataforma.</p></div></section>
          <section class="card space-y-4"><h2 class="font-display text-lg font-semibold text-navy">Presencia online</h2><p class="text-xs text-ink-muted">Visita los canales compartidos por la marca. Los enlaces se abren en otra pestaña.</p><div v-if="links.length" class="space-y-2"><a v-for="link in links" :key="link.label" :href="link.url!" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm text-navy ui-hover focus-visible:outline-2 focus-visible:outline-violet"><i :class="['pi text-violet', link.icon]" aria-hidden="true" /><span class="flex-1">{{ link.label }}</span><i class="pi pi-external-link text-xs text-ink-muted" aria-hidden="true" /></a></div><p v-else class="text-sm text-ink-muted">No hay enlaces públicos registrados.</p></section>
          <p class="text-xs text-ink-muted px-2 leading-relaxed"><i class="pi pi-lock mr-1" aria-hidden="true" />Esta página muestra únicamente la información pública de la marca.</p>
        </aside>
      </div>
    </div>
  </AppLayout>
</template>
