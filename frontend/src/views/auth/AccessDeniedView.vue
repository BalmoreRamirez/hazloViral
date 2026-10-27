<script setup lang="ts">
import { viewPath } from '@/router/paths'
</script>

<template>
  <main class="min-h-screen bg-slate flex items-center justify-center px-4">
    <section class="card max-w-lg text-center space-y-4">
      <i class="pi pi-lock text-3xl text-violet" aria-hidden="true" />
      <h1 class="font-display text-2xl font-bold text-navy">Acceso restringido</h1>
      <p class="text-ink-muted">No se pudo autorizar el acceso. Verifica tus permisos, el enlace y tu conexión.</p>
      <RouterLink :to="viewPath('/dashboard')" class="btn-primary inline-flex">Volver al inicio</RouterLink>
    </section>
  </main>
</template>
