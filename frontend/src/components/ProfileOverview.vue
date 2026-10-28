<script setup lang="ts">
import AvatarUpload from '@/components/AvatarUpload.vue'
import VerifiedBadge from '@/components/VerifiedBadge.vue'
defineProps<{ name: string; label: string; subtitle?: string; verified?: boolean; disabled?: boolean; avatarId?: string }>()
defineEmits<{ updated: [] }>()
</script>

<template>
  <section class="card border-t-4 border-t-violet flex flex-col sm:flex-row sm:items-center gap-5">
    <div :id="avatarId" class="shrink-0">
      <AvatarUpload :name="name" size="lg" :editable="!disabled" @updated="$emit('updated')" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ label }}</p>
      <div class="flex flex-wrap items-center gap-2 mt-1">
        <h2 class="font-display text-2xl font-bold text-navy break-words">{{ name || 'Tu perfil profesional' }}</h2>
        <VerifiedBadge v-if="verified" size="sm" />
      </div>
      <p v-if="subtitle" class="text-sm text-ink-muted mt-1 break-words">{{ subtitle }}</p>
      <p class="text-xs text-ink-muted mt-2">{{ disabled ? 'La imagen no está disponible mientras se carga el perfil.' : 'Selecciona tu imagen para actualizarla. Solo JPG o PNG, hasta 5 MB.' }}</p>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap gap-6 sm:border-l sm:border-border sm:pl-6"><slot /></div>
  </section>
</template>
