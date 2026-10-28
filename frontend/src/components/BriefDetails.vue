<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/utils/date'
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
  const fmt = (d: string) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
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

const detallesPrincipales = computed(() => [
  { label: 'Objetivo', value: b.value.objetivo_principal, icon: 'pi pi-flag' },
  { label: 'Público', value: b.value.publico_objetivo, icon: 'pi pi-users' },
  { label: 'Formatos', value: b.value.formatos, icon: 'pi pi-video' },
  { label: 'Tono de voz', value: b.value.tono_de_voz, icon: 'pi pi-megaphone' },
].filter(item => item.value))

const detallesAdicionales = computed(() => [
  b.value.hashtags_menciones && { label: 'Hashtags y menciones', value: b.value.hashtags_menciones, icon: 'pi pi-hashtag' },
  b.value.derechos_uso && { label: 'Derechos de uso', value: derechosUsoLabel(b.value.derechos_uso), icon: 'pi pi-verified' },
  exclusividad.value && { label: 'Exclusividad', value: exclusividad.value, icon: 'pi pi-lock' },
  b.value.recursos_esteticos && { label: 'Referencias', value: b.value.recursos_esteticos, icon: 'pi pi-palette' },
].filter(Boolean))

function sizeLabel(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
</script>

<template>
  <div class="space-y-4 text-sm text-ink-muted">
    <div class="flex flex-wrap gap-2">
      <span v-for="p in b.plataformas ?? []" :key="p"
        class="inline-flex items-center rounded-full border border-violet/15 bg-violet/5 px-3 py-1 text-xs font-semibold text-violet">{{ p }}</span>
      <span v-if="presupuesto" class="inline-flex items-center gap-2 rounded-full border border-border bg-slate/60 px-3 py-1 text-xs font-semibold text-navy"><i class="pi pi-wallet text-violet" aria-hidden="true" />{{ presupuesto }}</span>
      <span v-if="fechas" class="inline-flex items-center gap-2 rounded-full border border-border bg-slate/60 px-3 py-1 text-xs font-semibold text-navy"><i class="pi pi-calendar text-violet" aria-hidden="true" />{{ fechas }}</span>
      <span v-if="b.requiere_disclosure" class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"><i class="pi pi-info-circle" aria-hidden="true" />Publicidad identificada</span>
    </div>

    <div v-if="detallesPrincipales.length" class="grid gap-2.5 sm:grid-cols-2">
      <div v-for="detail in detallesPrincipales" :key="detail.label" class="min-w-0 rounded-xl border border-border bg-white p-3">
        <p class="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <i :class="[detail.icon, 'text-violet']" aria-hidden="true" />{{ detail.label }}
        </p>
        <p class="whitespace-pre-wrap break-words leading-relaxed text-navy">{{ detail.value }}</p>
      </div>
    </div>

    <template v-if="!compact">
      <div v-if="b.puntos_clave_si || b.restricciones_no" class="grid gap-2.5 sm:grid-cols-2">
        <div v-if="b.puntos_clave_si" class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <p class="mb-1.5 flex items-center gap-2 text-xs font-bold text-emerald-800"><i class="pi pi-check-circle" aria-hidden="true" />Incluir</p>
          <p class="whitespace-pre-wrap break-words leading-relaxed text-emerald-950">{{ b.puntos_clave_si }}</p>
        </div>
        <div v-if="b.restricciones_no" class="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
          <p class="mb-1.5 flex items-center gap-2 text-xs font-bold text-rose-800"><i class="pi pi-times-circle" aria-hidden="true" />Evitar</p>
          <p class="whitespace-pre-wrap break-words leading-relaxed text-rose-950">{{ b.restricciones_no }}</p>
        </div>
      </div>

      <dl v-if="detallesAdicionales.length" class="divide-y divide-border rounded-xl border border-border bg-slate/40 px-3">
        <div v-for="detail in detallesAdicionales" :key="detail.label" class="grid gap-1 py-2.5 sm:grid-cols-[minmax(9rem,0.35fr)_1fr] sm:gap-3">
          <dt class="flex items-center gap-2 text-xs font-semibold text-navy"><i :class="[detail.icon, 'text-violet']" aria-hidden="true" />{{ detail.label }}</dt>
          <dd class="whitespace-pre-wrap break-words leading-relaxed">{{ detail.value }}</dd>
        </div>
      </dl>

      <div v-if="b.archivos?.length" class="space-y-2">
        <p class="text-xs font-bold uppercase tracking-wide text-ink-muted">Archivos de referencia</p>
        <a v-for="f in b.archivos" :key="f.url" :href="f.url" target="_blank" rel="noopener"
          class="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 ui-hover transition-colors">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-violet">
            <i :class="f.tipo_archivo === 'documento' ? 'pi pi-file' : 'pi pi-image'" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-navy">{{ f.nombre }}</span>
            <span class="text-xs text-ink-muted">{{ sizeLabel(f.size_bytes) }}</span>
          </span>
          <i class="pi pi-external-link shrink-0 text-xs text-ink-muted" aria-hidden="true" />
        </a>
      </div>
    </template>
  </div>
</template>
