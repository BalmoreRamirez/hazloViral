<template>
  <span
    :title="'Perfil verificado'"
    class="inline-flex items-center justify-center rounded-full bg-violet-600 text-white flex-shrink-0"
    :class="sizeClasses"
  >
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full p-0.5">
      <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ size?: 'sm' | 'md' | 'lg' }>()

const sizeClasses = computed(() => ({
  'w-4 h-4': props.size === 'sm' || !props.size,
  'w-5 h-5': props.size === 'md',
  'w-6 h-6': props.size === 'lg',
}))
</script>
