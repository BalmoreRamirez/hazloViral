<script setup lang="ts">
/**
 * Logotipo tipográfico de InfluSmart: "Influ" en el color del texto y "Smart" en violeta.
 * `tone="dark"` para fondos oscuros (barra de navegación, pantallas de acceso).
 */
withDefaults(defineProps<{ tone?: 'dark' | 'light' }>(), { tone: 'dark' })
</script>

<template>
  <span class="font-display font-extrabold tracking-tight whitespace-nowrap"
    :class="tone === 'dark' ? 'text-white' : 'text-ink'"
    aria-label="InfluSmart">Influ<span :class="tone === 'dark' ? 'text-violet-light' : 'text-violet'">Smart</span></span>
</template>
