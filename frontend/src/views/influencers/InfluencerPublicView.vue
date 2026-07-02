<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import StarRating from '@/components/StarRating.vue'
import { useChatStore } from '@/stores/chat'
import { influencerApi } from '@/api/profiles'
import { ratingsApi, type RatingSummary, type RatingItem, type MyRating } from '@/api/ratings'
import { useAuthStore } from '@/stores/auth'

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
const myRating     = ref<MyRating | null>(null)
const ratingForm   = ref({ estrellas: 0, comentario: '' })
const savingRating = ref(false)
const ratingError  = ref('')
const ratingDone   = ref(false)

const REDES_ICON: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', YouTube: '▶️', Facebook: '👤',
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-SV', { year: 'numeric', month: 'short', day: 'numeric' })
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
    ;[summary.value, reviews.value] = await Promise.all([
      ratingsApi.getSummary(id),
      ratingsApi.getAll(id),
    ])
    // Load empresa's own rating
    if (authStore.isEmpresa) {
      myRating.value = await ratingsApi.getMine(id)
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
    router.push(`/chats/${chat.id}`)
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
    ;[summary.value, reviews.value] = await Promise.all([
      ratingsApi.getSummary(profile.value.id),
      ratingsApi.getAll(profile.value.id),
    ])
    ratingDone.value = true
  } catch (e: any) {
    ratingError.value = e.response?.data?.message ?? 'Error al guardar la calificación.'
  } finally { savingRating.value = false }
}
</script>

<template>
  <AppLayout>
    <div v-if="loading" class="text-center py-16 text-navy/40">Cargando perfil…</div>

    <template v-else-if="profile">
      <div class="space-y-5">
        <!-- Back -->
        <button @click="router.back()" class="text-navy/40 hover:text-navy text-sm flex items-center gap-1">
          ← Volver al buscador
        </button>

        <!-- Header -->
        <div class="card">
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-full bg-violet/20 flex items-center justify-center text-3xl font-bold text-violet shrink-0">
              {{ profile.nombre_artistico?.[0]?.toUpperCase() }}
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-display font-bold text-navy">{{ profile.nombre_artistico }}</h1>
              <p class="text-navy/50 text-sm mt-0.5">📍 {{ profile.ubicacion || 'Sin ubicación' }}</p>

              <!-- Rating summary -->
              <div v-if="summary && summary.total > 0" class="flex items-center gap-2 mt-1.5">
                <span class="flex">
                  <span v-for="(s, i) in starsDisplay" :key="i"
                    :class="s === 'filled' ? 'text-amber-400' : 'text-navy/20'" class="text-lg leading-none">★</span>
                </span>
                <span class="font-bold text-navy text-sm">{{ summary.promedio }}</span>
                <span class="text-navy/50 text-xs">({{ summary.total }} reseña{{ summary.total !== 1 ? 's' : '' }})</span>
              </div>
              <div v-else-if="summary" class="mt-1.5">
                <span class="text-navy/40 text-xs italic">Sin calificaciones aún</span>
              </div>

              <p v-if="profile.bio" class="text-sm text-navy/70 mt-2">{{ profile.bio }}</p>
              <div class="flex flex-wrap gap-2 mt-3">
                <span class="badge-info text-sm">💰 ${{ Number(profile.tarifa_base).toFixed(0) }} USD / campaña</span>
                <span :class="profile.disponibilidad ? 'badge-active' : 'badge-muted'">
                  {{ profile.disponibilidad ? '✅ Disponible' : '🔒 No disponible' }}
                </span>
              </div>
            </div>
          </div>

          <!-- CTA: iniciar chat (solo empresa) -->
          <div v-if="authStore.isEmpresa" class="mt-5 pt-4 border-t border-navy/10">
            <button @click="startChat" :disabled="chatting || !profile.disponibilidad" class="btn-primary w-full sm:w-auto">
              {{ chatting ? 'Abriendo chat…' : '💬 Iniciar chat' }}
            </button>
            <p v-if="chatError" class="text-coral text-sm mt-2">{{ chatError }}</p>
            <p v-if="!profile.disponibilidad" class="text-navy/40 text-xs mt-1">
              Este influencer no está disponible actualmente.
            </p>
            <p v-else class="text-navy/40 text-xs mt-1">Costo: 1 crédito por chat nuevo.</p>
          </div>
        </div>

        <!-- Redes sociales -->
        <div v-if="profile.metrics?.length" class="card">
          <h2 class="font-display font-semibold text-navy mb-4">Redes sociales</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="m in profile.metrics" :key="m.id"
              class="flex items-center gap-3 bg-slate rounded-xl p-3 border border-navy/8">
              <span class="text-2xl">{{ REDES_ICON[m.red_social] ?? '📱' }}</span>
              <div class="flex-1">
                <div class="flex items-center gap-1.5">
                  <p class="font-semibold text-navy text-sm">{{ m.red_social }}</p>
                  <span v-if="m.is_verified"
                    class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet text-white text-[9px] font-bold"
                    title="Seguidores verificados automáticamente">✓</span>
                </div>
                <p class="text-xs text-navy/50">@{{ m.username }}</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-navy">{{ formatFollowers(m.seguidores) }}</p>
                <p v-if="m.engagement_rate > 0" class="text-xs text-green-600 font-semibold">{{ m.engagement_rate }}% eng</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="card text-center py-6 text-navy/40 text-sm">
          Este influencer aún no ha cargado métricas de redes sociales.
        </div>

        <!-- Formulario de calificación (solo empresa) -->
        <div v-if="authStore.isEmpresa" class="card">
          <h2 class="font-display font-semibold text-navy mb-1">
            {{ myRating ? 'Tu calificación' : 'Calificar influencer' }}
          </h2>
          <p class="text-navy/50 text-xs mb-4">
            {{ myRating ? 'Puedes actualizar tu calificación en cualquier momento.' : 'Comparte tu experiencia trabajando con este influencer.' }}
          </p>

          <div v-if="ratingDone && !ratingError" class="flex items-center gap-2 text-green-600 text-sm mb-3">
            <span>✅</span> Calificación guardada correctamente.
          </div>

          <div class="space-y-3">
            <div>
              <label class="label text-xs mb-1.5 block">Puntaje</label>
              <StarRating v-model="ratingForm.estrellas" size="lg" />
            </div>
            <div class="field">
              <label class="label text-xs">Comentario <span class="text-navy/40 font-normal">(opcional)</span></label>
              <textarea v-model="ratingForm.comentario" rows="3" maxlength="500"
                placeholder="¿Cómo fue tu experiencia trabajando con este influencer?"
                class="input resize-none" />
              <p class="text-navy/40 text-xs text-right mt-1">{{ ratingForm.comentario.length }}/500</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click="submitRating"
                :disabled="savingRating || ratingForm.estrellas === 0"
                class="btn-primary"
              >
                {{ savingRating ? 'Guardando…' : myRating ? 'Actualizar calificación' : 'Enviar calificación' }}
              </button>
              <p v-if="ratingError" class="text-coral text-sm">{{ ratingError }}</p>
            </div>
          </div>
        </div>

        <!-- Reseñas de otras empresas -->
        <div v-if="reviews.length" class="card">
          <h2 class="font-display font-semibold text-navy mb-4">
            Reseñas <span class="text-navy/40 font-normal text-sm">({{ reviews.length }})</span>
          </h2>
          <div class="space-y-4">
            <div v-for="r in reviews" :key="r.id"
              class="border border-navy/8 rounded-xl p-4 bg-slate/50">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-semibold text-navy text-sm">{{ r.empresa_nombre }}</p>
                  <p class="text-navy/40 text-xs mt-0.5">{{ formatDate(r.created_at) }}</p>
                </div>
                <StarRating :model-value="r.estrellas" readonly size="sm" />
              </div>
              <p v-if="r.comentario" class="text-sm text-navy/70 mt-2">{{ r.comentario }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="card text-center py-8 text-navy/40">Influencer no encontrado.</div>
  </AppLayout>
</template>
