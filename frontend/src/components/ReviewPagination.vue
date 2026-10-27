<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ page: number; total: number; loading?: boolean }>()
defineEmits<{ change: [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / 6)))
</script>
<template>
  <nav v-if="total > 6" aria-label="Páginas de reseñas" class="border-t border-border pt-4 mt-5 flex flex-wrap items-center justify-between gap-3">
    <p class="text-xs text-ink-muted" role="status">Página {{ page }} de {{ pages }} · {{ total }} reseñas</p>
    <div class="flex gap-2">
      <button type="button" class="btn-secondary text-sm" :disabled="loading || page <= 1" @click="$emit('change', page - 1)">Anterior</button>
      <button type="button" class="btn-secondary text-sm" :disabled="loading || page >= pages" @click="$emit('change', page + 1)">Siguiente</button>
    </div>
  </nav>
</template>
