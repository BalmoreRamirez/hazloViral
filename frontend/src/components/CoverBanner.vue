<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  rubro?: string | null
  nombre?: string
  height?: string
}>()

type RubroConfig = {
  label: string
  gradient: string
  pattern: string
  icon: string
  accentColor: string
}

const RUBROS: Record<string, RubroConfig> = {
  turismo: {
    label: 'Turismo',
    icon: '✈️',
    accentColor: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #0ea5e9 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <path d="M0 40 Q20 20 40 40 Q60 60 80 40" stroke="rgba(255,255,255,0.12)" stroke-width="2" fill="none"/>
      <path d="M0 55 Q20 35 40 55 Q60 75 80 55" stroke="rgba(255,255,255,0.08)" stroke-width="2" fill="none"/>
      <path d="M0 25 Q20 5 40 25 Q60 45 80 25" stroke="rgba(255,255,255,0.06)" stroke-width="2" fill="none"/>
      <circle cx="40" cy="10" r="2" fill="rgba(255,255,255,0.2)"/>
      <circle cx="10" cy="60" r="1.5" fill="rgba(255,255,255,0.15)"/>
      <circle cx="70" cy="50" r="1.5" fill="rgba(255,255,255,0.15)"/>
    </svg>`,
  },
  hoteles: {
    label: 'Hoteles',
    icon: '🏨',
    accentColor: '#d97706',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 45%, #d97706 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <rect x="5" y="5" width="20" height="25" rx="1" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
      <rect x="35" y="5" width="20" height="25" rx="1" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
      <rect x="5" y="35" width="20" height="20" rx="1" stroke="rgba(255,255,255,0.07)" stroke-width="1" fill="none"/>
      <rect x="35" y="35" width="20" height="20" rx="1" stroke="rgba(255,255,255,0.07)" stroke-width="1" fill="none"/>
    </svg>`,
  },
  viajes: {
    label: 'Viajes',
    icon: '🗺️',
    accentColor: '#10b981',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #059669 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="4,4"/>
      <circle cx="50" cy="50" r="30" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
      <circle cx="50" cy="50" r="15" stroke="rgba(255,255,255,0.07)" stroke-width="1" fill="none"/>
      <ellipse cx="50" cy="50" rx="30" ry="12" stroke="rgba(255,255,255,0.07)" stroke-width="1" fill="none"/>
    </svg>`,
  },
  gastronomia: {
    label: 'Gastronomía',
    icon: '🍽️',
    accentColor: '#ef4444',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 45%, #ef4444 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
      <circle cx="10" cy="10" r="3" fill="rgba(255,255,255,0.12)"/>
      <circle cx="30" cy="10" r="3" fill="rgba(255,255,255,0.12)"/>
      <circle cx="50" cy="10" r="3" fill="rgba(255,255,255,0.12)"/>
      <circle cx="20" cy="25" r="3" fill="rgba(255,255,255,0.09)"/>
      <circle cx="40" cy="25" r="3" fill="rgba(255,255,255,0.09)"/>
      <circle cx="10" cy="40" r="3" fill="rgba(255,255,255,0.07)"/>
      <circle cx="30" cy="40" r="3" fill="rgba(255,255,255,0.07)"/>
      <circle cx="50" cy="40" r="3" fill="rgba(255,255,255,0.07)"/>
    </svg>`,
  },
  moda: {
    label: 'Moda',
    icon: '👗',
    accentColor: '#ec4899',
    gradient: 'linear-gradient(135deg, #4a044e 0%, #86198f 45%, #ec4899 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <line x1="0" y1="0" x2="40" y2="40" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
      <line x1="40" y1="0" x2="0" y2="40" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
      <line x1="20" y1="0" x2="20" y2="40" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
      <line x1="0" y1="20" x2="40" y2="20" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
    </svg>`,
  },
  tecnologia: {
    label: 'Tecnología',
    icon: '💻',
    accentColor: '#6366f1',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 45%, #6366f1 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <rect x="0" y="0" width="60" height="60" fill="none"/>
      <line x1="0" y1="20" x2="60" y2="20" stroke="rgba(99,102,241,0.3)" stroke-width="0.5"/>
      <line x1="0" y1="40" x2="60" y2="40" stroke="rgba(99,102,241,0.3)" stroke-width="0.5"/>
      <line x1="20" y1="0" x2="20" y2="60" stroke="rgba(99,102,241,0.3)" stroke-width="0.5"/>
      <line x1="40" y1="0" x2="40" y2="60" stroke="rgba(99,102,241,0.3)" stroke-width="0.5"/>
      <circle cx="20" cy="20" r="2" fill="rgba(99,102,241,0.5)"/>
      <circle cx="40" cy="20" r="2" fill="rgba(99,102,241,0.5)"/>
      <circle cx="20" cy="40" r="2" fill="rgba(99,102,241,0.5)"/>
      <circle cx="40" cy="40" r="2" fill="rgba(99,102,241,0.5)"/>
    </svg>`,
  },
  fitness: {
    label: 'Fitness',
    icon: '💪',
    accentColor: '#f97316',
    gradient: 'linear-gradient(135deg, #431407 0%, #c2410c 45%, #f97316 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <line x1="0" y1="60" x2="60" y2="0" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
      <line x1="0" y1="80" x2="80" y2="0" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      <line x1="-20" y1="60" x2="40" y2="0" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      <line x1="20" y1="60" x2="60" y2="20" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </svg>`,
  },
  belleza: {
    label: 'Belleza',
    icon: '💄',
    accentColor: '#f43f5e',
    gradient: 'linear-gradient(135deg, #4c0519 0%, #be123c 45%, #f43f5e 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <circle cx="40" cy="40" r="35" stroke="rgba(255,255,255,0.08)" stroke-width="1" fill="none"/>
      <circle cx="40" cy="40" r="25" stroke="rgba(255,255,255,0.06)" stroke-width="1" fill="none"/>
      <circle cx="40" cy="40" r="15" stroke="rgba(255,255,255,0.05)" stroke-width="1" fill="none"/>
      <circle cx="20" cy="20" r="3" fill="rgba(255,255,255,0.12)"/>
      <circle cx="60" cy="20" r="2" fill="rgba(255,255,255,0.1)"/>
      <circle cx="60" cy="60" r="3" fill="rgba(255,255,255,0.12)"/>
      <circle cx="20" cy="60" r="2" fill="rgba(255,255,255,0.1)"/>
    </svg>`,
  },
  negocios: {
    label: 'Negocios',
    icon: '💼',
    accentColor: '#64748b',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #334155 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <rect x="2" y="2" width="36" height="36" rx="2" stroke="rgba(255,255,255,0.07)" stroke-width="0.5" fill="none"/>
      <line x1="2" y1="14" x2="38" y2="14" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
      <line x1="2" y1="26" x2="38" y2="26" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
      <line x1="14" y1="2" x2="14" y2="38" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
      <line x1="26" y1="2" x2="26" y2="38" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
    </svg>`,
  },
  entretenimiento: {
    label: 'Entretenimiento',
    icon: '🎭',
    accentColor: '#a855f7',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #6d28d9 45%, #a855f7 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <polygon points="30,5 35,20 50,20 38,30 43,45 30,35 17,45 22,30 10,20 25,20" stroke="rgba(255,255,255,0.15)" stroke-width="1" fill="rgba(255,255,255,0.03)"/>
      <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.15)"/>
      <circle cx="50" cy="10" r="2" fill="rgba(255,255,255,0.15)"/>
      <circle cx="10" cy="50" r="2" fill="rgba(255,255,255,0.1)"/>
      <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/>
    </svg>`,
  },
  educacion: {
    label: 'Educación',
    icon: '📚',
    accentColor: '#0891b2',
    gradient: 'linear-gradient(135deg, #164e63 0%, #0e7490 45%, #0891b2 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
      <line x1="5" y1="10" x2="45" y2="10" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
      <line x1="5" y1="20" x2="35" y2="20" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>
      <line x1="5" y1="30" x2="40" y2="30" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
      <line x1="5" y1="40" x2="30" y2="40" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>
    </svg>`,
  },
  fotografia: {
    label: 'Fotografía',
    icon: '📷',
    accentColor: '#78716c',
    gradient: 'linear-gradient(135deg, #1c1917 0%, #292524 45%, #44403c 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <rect x="15" y="20" width="50" height="40" rx="4" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
      <circle cx="40" cy="40" r="14" stroke="rgba(255,255,255,0.08)" stroke-width="1" fill="none"/>
      <circle cx="40" cy="40" r="8" stroke="rgba(255,255,255,0.06)" stroke-width="1" fill="none"/>
      <rect x="28" y="14" width="14" height="6" rx="2" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
    </svg>`,
  },
  salud: {
    label: 'Salud',
    icon: '🏥',
    accentColor: '#22c55e',
    gradient: 'linear-gradient(135deg, #052e16 0%, #166534 45%, #16a34a 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <line x1="30" y1="10" x2="30" y2="50" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-linecap="round"/>
      <line x1="10" y1="30" x2="50" y2="30" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="30" cy="30" r="25" stroke="rgba(255,255,255,0.06)" stroke-width="1" fill="none"/>
    </svg>`,
  },
  musica: {
    label: 'Música',
    icon: '🎵',
    accentColor: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #1e0048 0%, #4c1d95 45%, #7c3aed 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <path d="M10 15 Q20 5 30 15 Q40 25 50 15" stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none"/>
      <path d="M10 30 Q20 20 30 30 Q40 40 50 30" stroke="rgba(255,255,255,0.1)" stroke-width="2" fill="none"/>
      <path d="M10 45 Q20 35 30 45 Q40 55 50 45" stroke="rgba(255,255,255,0.07)" stroke-width="2" fill="none"/>
      <circle cx="48" cy="12" r="4" fill="rgba(255,255,255,0.15)"/>
    </svg>`,
  },
  deporte: {
    label: 'Deporte',
    icon: '⚽',
    accentColor: '#84cc16',
    gradient: 'linear-gradient(135deg, #1a2e05 0%, #3f6212 45%, #65a30d 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <circle cx="30" cy="30" r="25" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
      <path d="M5 30 L55 30" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <path d="M30 5 L30 55" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <ellipse cx="30" cy="30" rx="25" ry="10" stroke="rgba(255,255,255,0.06)" stroke-width="1" fill="none"/>
    </svg>`,
  },
  default: {
    label: 'General',
    icon: '⚡',
    accentColor: '#7c3aed',
    gradient: 'linear-gradient(135deg, #1e0a3c 0%, #4c1d95 45%, #7c3aed 100%)',
    pattern: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
      <path d="M0 60 L30 0 L60 60" stroke="rgba(255,255,255,0.08)" stroke-width="1" fill="none"/>
      <path d="M10 60 L40 0" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" fill="none"/>
      <path d="M20 60 L50 0" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" fill="none"/>
    </svg>`,
  },
}

const config = computed<RubroConfig>(() => {
  const key = (props.rubro ?? '').toLowerCase().trim()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return RUBROS[key] ?? RUBROS['default']!
})

const patternDataUrl = computed(() => {
  const encoded = encodeURIComponent(config.value.pattern)
  return `url("data:image/svg+xml,${encoded}")`
})

const bannerHeight = computed(() => props.height ?? '180px')
</script>

<template>
  <div
    class="cover-banner relative overflow-hidden rounded-2xl"
    :style="{ height: bannerHeight, background: config.gradient }"
    role="img"
    :aria-label="`Portada - ${config.label}`"
  >
    <!-- Tiled SVG pattern -->
    <div
      class="absolute inset-0"
      :style="{ backgroundImage: patternDataUrl, backgroundRepeat: 'repeat', backgroundSize: '80px 80px' }"
    />

    <!-- Vignette fade at bottom for text readability -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

    <!-- Accent glow orb -->
    <div
      class="absolute top-0 right-8 w-48 h-48 rounded-full opacity-20 blur-3xl"
      :style="{ background: config.accentColor }"
    />

    <!-- Label + icon top-left -->
    <div class="absolute top-4 left-5 flex items-center gap-2">
      <span class="text-2xl leading-none drop-shadow">{{ config.icon }}</span>
      <span class="text-white/80 text-xs font-semibold tracking-widest uppercase select-none drop-shadow">
        {{ config.label }}
      </span>
    </div>

    <!-- Optional name overlay bottom-right -->
    <div v-if="nombre" class="absolute bottom-4 right-5">
      <span class="text-white/60 text-xs font-medium truncate max-w-[160px]">{{ nombre }}</span>
    </div>
  </div>
</template>
