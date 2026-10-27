<script setup lang="ts">
import { viewPath } from '@/router/paths'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReviewPagination from '@/components/ReviewPagination.vue'
import AppLayout from '@/components/AppLayout.vue'
import StarRating from '@/components/StarRating.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
import { formatDate as formatAppDate } from '@/utils/date'
import CoverBanner from '@/components/CoverBanner.vue'
import { useChatStore } from '@/stores/chat'
import { influencerApi } from '@/api/profiles'
import { creditsApi } from '@/api/credits'
import { ratingsApi, type RatingSummary, type RatingItem, type MyRating } from '@/api/ratings'
import { useAuthStore } from '@/stores/auth'
import { rubroNombre } from '@/constants/rubros'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const profile   = ref<any>(null)
const loading   = ref(true)
const chatting  = ref(false)
const chatError = ref('')

// Rating state
const summary      = ref<RatingSummary | null>(null)
const reviews      = ref<RatingItem[]>([])
const reviewPage = ref(1)
const reviewTotal = ref(0)
const reviewsLoading = ref(false)
const reviewsError = ref('')
async function loadReviews(page = 1) {
  if (reviewsLoading.value) return
  reviewsLoading.value = true
  reviewsError.value = ''
  try {
    const result = await ratingsApi.getAll(Number(route.params.id), page)
    reviews.value = result.items
    reviewTotal.value = result.total
    reviewPage.value = result.page
  } catch { reviewsError.value = 'No se pudieron cargar las reseñas. Intenta nuevamente.' }
  finally { reviewsLoading.value = false }
}
const myRating     = ref<MyRating | null>(null)
const ratingForm   = ref({ estrellas: 0, comentario: '' })
const savingRating = ref(false)
const ratingError  = ref('')
const ratingDone   = ref(false)
// Solo empresas con un contrato completado con este influencer pueden calificarlo
const puedeCalificar = ref(false)

// Costo real de abrir un chat (configurable por el admin); gratis si ya existe el chat
const chatCost      = ref<number | null>(null)
const chatExistente = computed(() =>
  !!profile.value && chatStore.chats.some(c => c.influencer_id === profile.value.id))

const REDES_ICON: Record<string, string> = {
  TikTok: 'pi-tiktok', Instagram: 'pi-instagram', YouTube: 'pi-youtube', Facebook: 'pi-facebook',
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(iso: string) {
  return formatAppDate(iso, { year: 'numeric', month: 'short', day: 'numeric' })
}

const starsDisplay = computed(() => {
  if (!summary.value?.promedio) return []
  const avg = summary.value.promedio
  return Array.from({ length: 5 }, (_, i) => i + 1 <= Math.round(avg) ? 'filled' : 'empty')
})

onMounted(async () => {
  const id = Number(route.params.id)
  try {
    profile.value = await influencerApi.getPublic(id)
    // Load summary for all authenticated users
    await Promise.all([ratingsApi.getSummary(id).then(value => { summary.value = value }), loadReviews()])
    // Empresa: su calificación, si puede calificar, costo del chat y si ya tiene chat abierto
    if (authStore.isEmpresa) {
      const [mine, cost] = await Promise.all([
        ratingsApi.getMine(id),
        creditsApi.getChatCost().catch(() => null),
        chatStore.loadChats().catch(() => null),
      ])
      myRating.value       = mine.rating
      puedeCalificar.value = mine.puede_calificar
      chatCost.value       = cost?.costo ?? null
      if (myRating.value) {
        ratingForm.value.estrellas   = myRating.value.estrellas
        ratingForm.value.comentario  = myRating.value.comentario ?? ''
      }
    }
  } finally { loading.value = false }
})

async function startChat() {
  if (!profile.value) return
  chatting.value  = true
  chatError.value = ''
  try {
    const chat = await chatStore.openChat(profile.value.id)
    router.push(viewPath(`/chats/${chat.id}`))
  } catch (e: any) {
    chatError.value = e.response?.data?.message ?? 'Error al iniciar el chat.'
  } finally { chatting.value = false }
}

async function submitRating() {
  if (!profile.value || ratingForm.value.estrellas === 0) return
  savingRating.value = true
  ratingError.value  = ''
  try {
    myRating.value = await ratingsApi.upsert(profile.value.id, {
      estrellas:  ratingForm.value.estrellas,
      comentario: ratingForm.value.comentario.trim() || undefined,
    })
    // Refresh summary and reviews
    await Promise.all([ratingsApi.getSummary(profile.value.id).then(value => { summary.value = value }), loadReviews(1)])
    ratingDone.value = true
  } catch (e: any) {
    ratingError.value = e.response?.data?.message ?? 'Error al guardar la calificación.'
  } finally { savingRating.value = false }
}
</script>

<template>
  <AppLayout>
    <div v-if="loading" class="text-center py-16 text-ink-muted">Cargando perfil…</div>

    <template v-else-if="profile">
      <div class="space-y-5">
        <!-- Back -->
        <button @click="router.back()" class="text-ink-muted hover:text-navy text-sm flex items-center gap-1">
          ← Volver al buscador
        </button>

        <!-- Banner del rubro principal (el mismo que ve el influencer en su perfil) -->
        <CoverBanner :rubro="profile.rubros?.[0]" :extra="(profile.rubros?.length ?? 1) - 1"
          :nombre="profile.nombre_artistico" height="160px" />

        <!-- Header -->
        <div class="card">
          <div class="flex items-start gap-4">
            <img v-if="profile.user?.avatar_url" :src="profile.user.avatar_url" :alt="profile.nombre_artistico"
              class="w-20 h-20 rounded-full object-cover shrink-0 border-2 border-white shadow-md" />
            <div v-else class="w-20 h-20 rounded-full bg-violet/20 flex items-center justify-center text-3xl font-bold text-violet shrink-0">
              {{ profile.nombre_artistico?.[0]?.toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-display font-bold text-navy">{{ profile.nombre_artistico }}</h1>
                <VerifiedBadge v-if="profile.is_verified" size="lg" />
              </div>
              <p v-if="profile.username" class="text-violet text-sm font-medium">@{{ profile.username }}</p>
              <p class="text-ink-muted text-sm mt-0.5 flex items-center gap-1.5"><i class="pi pi-map-marker text-xs" aria-hidden="true" /> {{ profile.ubicacion || 'Sin ubicación' }}</p>

              <!-- Rubros: el principal primero, con estrella -->
              <div v-if="profile.rubros?.length" class="flex flex-wrap gap-1.5 mt-2">
                <span v-for="(r, i) in profile.rubros" :key="r" class="badge-muted">
                  <i v-if="i === 0" class="pi pi-star-fill text-violet" aria-hidden="true" />{{ rubroNombre(r) }}
                </span>
              </div>

              <!-- Rating summary -->
              <div v-if="summary && summary.total > 0" class="flex items-center gap-2 mt-1.5">
                <span class="flex">
                  <span v-for="(s, i) in starsDisplay" :key="i"
                    :class="s === 'filled' ? 'text-amber-400' : 'text-navy/20'" class="text-lg leading-none">★</span>
                </span>
                <span class="font-bold text-navy text-sm">{{ summary.promedio }}</span>
                <span class="text-ink-muted text-xs">({{ summary.total }} reseña{{ summary.total !== 1 ? 's' : '' }})</span>
              </div>
              <div v-else-if="summary" class="mt-1.5">
                <span class="text-ink-muted text-xs italic">Sin calificaciones aún</span>
              </div>

              <p v-if="profile.bio" class="text-sm text-ink-muted mt-2">{{ profile.bio }}</p>
              <div class="flex flex-wrap gap-2 mt-3">
                <span class="badge-info text-sm inline-flex items-center gap-1.5"><i class="pi pi-dollar" aria-hidden="true" /> {{ Number(profile.tarifa_base) > 0 ? `$${Number(profile.tarifa_base).toFixed(0)} USD / campaña` : 'Tarifa a convenir' }}</span>
                <span :class="profile.disponibilidad ? 'badge-active' : 'badge-muted'" class="inline-flex items-center gap-1.5">
                  <i :class="['pi', profile.disponibilidad ? 'pi-check-circle' : 'pi-lock']" aria-hidden="true" />
                  {{ profile.disponibilidad ? 'Disponible' : 'No disponible' }}
                </span>
              </div>
            </div>
          </div>

          <!-- CTA: iniciar chat (solo empresa) -->
          <div v-if="authStore.isEmpresa && profile.is_verified" class="mt-5 pt-4 border-t border-border">
            <button @click="startChat" :disabled="chatting || !profile.disponibilidad" class="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2">
              <i v-if="!chatting" class="pi pi-comments" aria-hidden="true" />
              {{ chatting ? 'Abriendo chat…' : 'Iniciar chat' }}
            </button>
            <p v-if="chatError" class="text-coral-text text-sm mt-2">{{ chatError }}</p>
            <p v-if="!profile.disponibilidad" class="text-ink-muted text-xs mt-1">
              Este influencer no está disponible actualmente.
            </p>
            <p v-else-if="chatExistente" class="text-ink-muted text-xs mt-1">Ya tienes un chat con este influencer: abrirlo es gratis.</p>
            <p v-else-if="chatCost !== null" class="text-ink-muted text-xs mt-1">
              Abrir un chat nuevo cuesta ${{ chatCost.toFixed(2) }} USD de tu saldo.
            </p>
          </div>
          <p v-else-if="authStore.isEmpresa" class="mt-5 pt-4 border-t border-border text-warning text-sm">
            Este perfil está incompleto y no puede ser contratado hasta completar la verificación.
          </p>
        </div>

        <!-- Redes sociales -->
        <div v-if="profile.metrics?.length" class="card">
          <h2 class="font-display font-semibold text-navy mb-4">Redes sociales</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="m in profile.metrics" :key="m.id"
              class="flex items-center gap-3 bg-slate rounded-xl p-3 border border-border">
              <i :class="['pi', REDES_ICON[m.red_social] ?? 'pi-mobile', 'text-2xl']" aria-hidden="true" />
              <div class="flex-1">
                <div class="flex items-center gap-1.5">
                  <p class="font-semibold text-navy text-sm">{{ m.red_social }}</p>
                  <span v-if="m.is_verified"
                    class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet text-white text-[9px] font-bold"
                    title="Seguidores verificados automáticamente">✓</span>
                </div>
                <p class="text-xs text-ink-muted">@{{ m.username }}</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-navy">{{ formatFollowers(m.seguidores) }}</p>
                <p v-if="m.engagement_rate > 0" class="text-xs text-success font-semibold">{{ m.engagement_rate }}% eng</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="card text-center py-6 text-ink-muted text-sm">
          Este influencer aún no ha cargado métricas de redes sociales.
        </div>

        <!-- Empresa sin contrato completado: aún no puede calificar -->
        <div v-if="authStore.isEmpresa && !puedeCalificar" class="card flex items-center gap-3 text-sm text-ink-muted">
          <i class="pi pi-star text-lg" aria-hidden="true" />
          Podrás calificar al terminar un contrato con este influencer.
        </div>

        <!-- Formulario de calificación (solo empresas con contrato completado) -->
        <div v-if="authStore.isEmpresa && puedeCalificar" class="card">
          <h2 class="font-display font-semibold text-navy mb-1">
            {{ myRating ? 'Tu calificación' : 'Calificar influencer' }}
          </h2>
          <p class="text-ink-muted text-xs mb-4">
            {{ myRating ? 'Puedes actualizar tu calificación en cualquier momento.' : 'Comparte tu experiencia trabajando con este influencer.' }}
          </p>

          <div v-if="ratingDone && !ratingError" class="flex items-center gap-2 text-success text-sm mb-3">
            <i class="pi pi-check-circle" aria-hidden="true" /> Calificación guardada correctamente.
          </div>

          <div class="space-y-3">
            <div>
              <label class="label text-xs mb-1.5 block">Puntaje</label>
              <StarRating v-model="ratingForm.estrellas" size="lg" />
            </div>
            <div class="field">
              <label class="label text-xs">Comentario <span class="text-ink-muted font-normal">(opcional)</span></label>
              <textarea v-model="ratingForm.comentario" rows="3" maxlength="500"
                placeholder="¿Cómo fue tu experiencia trabajando con este influencer?"
                class="input resize-none" />
              <p class="text-ink-muted text-xs text-right mt-1">{{ ratingForm.comentario.length }}/500</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click="submitRating"
                :disabled="savingRating || ratingForm.estrellas === 0"
                class="btn-primary"
              >
                {{ savingRating ? 'Guardando…' : myRating ? 'Actualizar calificación' : 'Enviar calificación' }}
              </button>
              <p v-if="ratingError" class="text-coral-text text-sm">{{ ratingError }}</p>
            </div>
          </div>
        </div>

        <!-- Reseñas de otras empresas -->
        <div class="card">
          <h2 class="font-display font-semibold text-navy mb-4">
            Reseñas <span class="text-ink-muted font-normal text-sm">({{ reviewTotal }})</span>
          </h2>
          <p v-if="reviewsLoading" role="status" class="py-8 text-center text-ink-muted">Cargando reseñas…</p>
          <div v-else-if="reviewsError" role="alert" class="py-5 space-y-3"><p class="text-sm text-coral-text">{{ reviewsError }}</p><button type="button" class="btn-secondary" @click="loadReviews(reviewPage)">Reintentar</button></div>
          <p v-else-if="!reviews.length" class="py-8 text-center text-sm text-ink-muted">Todavía no hay reseñas publicadas.</p>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">
            <article v-for="r in reviews" :key="r.id"
              class="min-w-0 border border-border rounded-xl p-5 bg-slate/50 space-y-4">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-tint text-violet font-semibold" aria-hidden="true">{{ r.empresa_nombre?.[0]?.toUpperCase() ?? 'E' }}</span>
                <div class="min-w-0">
                  <h3 class="font-semibold text-navy text-sm break-words">{{ r.empresa_nombre }}</h3>
                  <time :datetime="r.created_at" class="block text-ink-muted text-xs mt-1">{{ formatDate(r.created_at) }}</time>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <StarRating :model-value="r.estrellas" readonly size="sm" />
                <span class="text-xs font-semibold text-navy">{{ r.estrellas }} / 5</span>
              </div>
              <p v-if="r.comentario" class="text-sm text-ink-muted whitespace-pre-line break-words leading-relaxed border-t border-border pt-3">{{ r.comentario }}</p>
            </article>
          </div>
          <ReviewPagination :page="reviewPage" :total="reviewTotal" :loading="reviewsLoading" @change="loadReviews" />
        </div>
      </div>
    </template>

    <div v-else class="card text-center py-8 text-ink-muted">Influencer no encontrado.</div>
  </AppLayout>
</template>
