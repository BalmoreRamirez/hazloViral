<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: number
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  modelValue: 0,
  readonly: false,
  size: 'md',
})

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

const hovered = ref(0)

const sizeClass = computed(() => ({
  sm: 'text-base gap-0.5',
  md: 'text-2xl gap-1',
  lg: 'text-3xl gap-1.5',
}[props.size]))

function starState(i: number) {
  const active = hovered.value || props.modelValue
  return i <= active ? 'filled' : 'empty'
}

function select(i: number) {
  if (!props.readonly) emit('update:modelValue', i)
}
</script>

<template>
  <div :class="['inline-flex items-center', sizeClass]">
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      :disabled="readonly"
      :class="[
        'leading-none transition-transform',
        !readonly && 'hover:scale-110 cursor-pointer',
        readonly && 'cursor-default',
      ]"
      @mouseenter="!readonly && (hovered = i)"
      @mouseleave="!readonly && (hovered = 0)"
      @click="select(i)"
    >
      <span :class="starState(i) === 'filled' ? 'text-amber-400' : 'text-navy/20'">★</span>
    </button>
  </div>
</template>
