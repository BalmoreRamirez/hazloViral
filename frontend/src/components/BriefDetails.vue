<script setup lang="ts">
import { computed } from 'vue'
import { derechosUsoLabel, formatPresupuesto } from '@/constants/brief'

/**
 * Muestra el contenido de un brief de campaña (entidad o snapshot del contrato).
 * Los campos ausentes (briefs anteriores a la versión extendida) simplemente no se muestran.
 */
const props = defineProps<{
  brief: Record<string, any>
  compact?: boolean
}>()

const b = computed(() => props.brief)

const presupuesto = computed(() => formatPresupuesto(b.value.presupuesto_min, b.value.presupuesto_max))

const fechas = computed(() => {
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  const { fecha_inicio: i, fecha_fin: f } = b.value
  if (i && f) return `${fmt(i)} → ${fmt(f)}`
  if (i) return `Desde ${fmt(i)}`
  if (f) return `Hasta ${fmt(f)}`
  return ''
})

const exclusividad = computed(() => {
  const dias = Number(b.value.exclusividad_dias ?? 0)
  if (!dias) return ''
  return `${dias} días${b.value.exclusividad_detalle ? ` · ${b.value.exclusividad_detalle}` : ''}`
})

function sizeLabel(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
</script>

<template>
  <div class="space-y-2 text-xs text-navy/70">
    <!-- Chips de condiciones clave -->
    <div class="flex flex-wrap gap-1.5">
      <span v-for="p in b.plataformas ?? []" :key="p"
        class="px-2 py-0.5 rounded-full bg-violet/10 text-violet font-medium">{{ p }}</span>
      <span v-if="presupuesto" class="px-2 py-0.5 rounded-full bg-navy/5 text-navy font-medium">💰 {{ presupuesto }}</span>
      <span v-if="fechas" class="px-2 py-0.5 rounded-full bg-navy/5 text-navy font-medium">📅 {{ fechas }}</span>
      <span v-if="b.requiere_disclosure" class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">#publi obligatorio</span>
    </div>

    <p v-if="b.objetivo_principal"><span class="font-semibold text-navy">🎯 Objetivo:</span> {{ b.objetivo_principal }}</p>
    <p v-if="b.publico_objetivo"><span class="font-semibold text-navy">👥 Público:</span> {{ b.publico_objetivo }}</p>
    <p v-if="b.formatos"><span class="font-semibold text-navy">🎬 Formatos:</span> {{ b.formatos }}</p>
    <p v-if="b.tono_de_voz"><span class="font-semibold text-navy">🎤 Tono:</span> {{ b.tono_de_voz }}</p>

    <template v-if="!compact">
      <p v-if="b.puntos_clave_si"><span class="font-semibold text-green-600">✅ Incluir:</span> {{ b.puntos_clave_si }}</p>
      <p v-if="b.restricciones_no"><span class="font-semibold text-coral">❌ Evitar:</span> {{ b.restricciones_no }}</p>
      <p v-if="b.hashtags_menciones"><span class="font-semibold text-navy"># Hashtags y menciones:</span> {{ b.hashtags_menciones }}</p>
      <p v-if="b.derechos_uso"><span class="font-semibold text-navy">📢 Derechos de uso:</span> {{ derechosUsoLabel(b.derechos_uso) }}</p>
      <p v-if="exclusividad"><span class="font-semibold text-navy">🔒 Exclusividad:</span> {{ exclusividad }}</p>
      <p v-if="b.recursos_esteticos"><span class="font-semibold text-violet">🎨 Referencias:</span> {{ b.recursos_esteticos }}</p>

      <div v-if="b.archivos?.length" class="flex flex-wrap gap-2 pt-1">
        <a v-for="f in b.archivos" :key="f.url" :href="f.url" target="_blank" rel="noopener"
          class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-navy/10 bg-white hover:border-violet/40 transition-colors">
          <i :class="f.tipo_archivo === 'documento' ? 'pi pi-file' : 'pi pi-image'" class="text-violet" />
          <span class="max-w-[160px] truncate text-navy">{{ f.nombre }}</span>
          <span class="text-navy/40">{{ sizeLabel(f.size_bytes) }}</span>
        </a>
      </div>
    </template>
  </div>
</template>
