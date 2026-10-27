<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ items: { label: string; ok: boolean }[]; loading?: boolean }>()
const completed = computed(() => props.items.filter(item => item.ok).length)
</script>

<template>
  <section class="card space-y-4">
    <div><h2 class="font-display font-semibold text-navy">Estado del perfil</h2><p class="text-xs text-ink-muted mt-1">Requisitos para generar confianza.</p></div>
    <p v-if="loading" class="text-sm text-ink-muted" role="status">Consultando requisitos…</p>
    <template v-else>
      <div class="flex justify-between text-xs text-ink-muted"><span>Requisitos completos</span><strong class="text-navy">{{ completed }} / {{ items.length }}</strong></div>
      <div class="h-1.5 bg-slate-dark rounded-full overflow-hidden" role="progressbar" aria-label="Requisitos completos" :aria-valuemin="0" :aria-valuemax="items.length || 1" :aria-valuenow="completed">
        <div class="h-full bg-violet rounded-full" :style="{ width: `${items.length ? completed / items.length * 100 : 0}%` }" />
      </div>
      <ul class="space-y-3"><li v-for="item in items" :key="item.label" class="flex items-start gap-2 text-sm"><i :class="['pi mt-0.5', item.ok ? 'pi-check-circle text-success' : 'pi-circle text-ink-muted']" aria-hidden="true" /><span class="text-ink-muted">{{ item.label }}<span class="sr-only">: {{ item.ok ? 'Completo' : 'Pendiente' }}</span></span></li></ul>
    </template>
  </section>
</template>
