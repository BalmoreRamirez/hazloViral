<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/index'

const props = defineProps<{
  name: string          // nombre para generar iniciales si no hay foto
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean    // muestra overlay de cambio
}>()

const emit = defineEmits<{ updated: [url: string] }>()

const authStore  = useAuthStore()
const uploading  = ref(false)
const error      = ref('')
const fileInput  = ref<HTMLInputElement>()

// ── Avatar por defecto — iniciales con color derivado del nombre ──────────
function hashColor(str: string): string {
  const palette = [
    '#7C3AED', '#6D28D9', '#5B21B6',  // violetas
    '#0F172A', '#1E293B', '#334155',  // navys
    '#F43F5E', '#BE123C', '#E11D48',  // corales
    '#0EA5E9', '#0284C7', '#075985',  // azules
    '#10B981', '#059669', '#047857',  // verdes
    '#F59E0B', '#D97706', '#B45309',  // ambar
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length] ?? '#7C3AED'
}

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0] ?? ''
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1] ?? ''
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
})

const bgColor    = computed(() => hashColor(props.name || 'user'))
const avatarUrl  = computed(() => authStore.user?.avatar_url ?? null)

// ── Tamaños ───────────────────────────────────────────────────────────────
const sizeClass = computed(() => ({
  sm:  'w-8 h-8 text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-16 h-16 text-lg',
  xl:  'w-24 h-24 text-2xl',
}[props.size ?? 'md']))

// ── Upload ────────────────────────────────────────────────────────────────
function triggerPicker() {
  if (!props.editable) return
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return

  error.value    = ''
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<{ url: string }>('/uploads/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    authStore.user!.avatar_url = res.data.url
    // Sincronizar localStorage
    localStorage.setItem('hv_user', JSON.stringify(authStore.user))
    emit('updated', res.data.url)
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'Error al subir la imagen'
  } finally {
    uploading.value = false
    input.value = ''   // reset para poder elegir el mismo archivo de nuevo
  }
}
</script>

<template>
  <div class="relative inline-block">
    <!-- Avatar -->
    <div
      :class="[sizeClass, 'rounded-full overflow-hidden select-none flex items-center justify-center font-semibold text-white ring-2 ring-white shadow-md transition-all duration-200', editable && 'cursor-pointer']"
      :style="avatarUrl ? {} : { backgroundColor: bgColor }"
      @click="triggerPicker"
    >
      <!-- Foto real -->
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="name"
        class="w-full h-full object-cover"
        @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
      />
      <!-- Iniciales (fallback) -->
      <span v-else>{{ initials }}</span>
    </div>

    <!-- Overlay editable -->
    <div
      v-if="editable"
      class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
      @click="triggerPicker"
    >
      <i v-if="!uploading" class="pi pi-camera text-white text-sm"></i>
      <i v-else class="pi pi-spin pi-spinner text-white text-sm"></i>
    </div>

    <!-- Badge de cámara (esquina inferior derecha) en tamaños lg/xl -->
    <button
      v-if="editable && (size === 'lg' || size === 'xl')"
      class="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-violet text-white flex items-center justify-center shadow-md hover:bg-violet-dark transition-colors"
      @click.stop="triggerPicker"
      :disabled="uploading"
      title="Cambiar foto"
    >
      <i class="pi pi-camera text-xs"></i>
    </button>

    <!-- Input oculto -->
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileChange"
    />

    <!-- Error toast inline -->
    <p v-if="error" class="absolute top-full left-0 mt-1 text-xs text-coral whitespace-nowrap">
      {{ error }}
    </p>
  </div>
</template>
