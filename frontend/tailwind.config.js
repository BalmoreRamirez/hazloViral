/**
 * InfluSmart — Configuración Tailwind CSS
 * Paleta "Corporate-Pop" definida en claude.md §3
 *
 * Primary   Deep Navy   #0F172A  — fondos, nav, textos ejecutivos
 * Accent    Violet      #7C3AED  — CTAs, botones principales
 * Alert     Coral       #F43F5E  — alertas urgentes, saldo bajo, disputas
 * Surface   Slate       #F8FAFC  — fondos de tarjetas, contenedores internos
 *
 * Tipografía §3.2:
 *   body/data  → Helvetica Neue / Helvetica / Arial
 *   títulos/UI → Helvetica Neue / Helvetica / Arial
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // ── Paleta de colores (claude.md §3.1) ─────────────────────────────────
      colors: {
        navy: {
          DEFAULT: '#0F172A', // Primary — fondos principales y textos ejecutivos
          light:   '#1E293B',
          lighter: '#334155',
        },
        violet: {
          DEFAULT: '#7C3AED', // Accent — CTAs, "Iniciar Chat", "Recargar"
          light:   '#A78BFA',
          dark:    '#5B21B6',
        },
        coral: {
          DEFAULT: '#F43F5E', // Alert — saldo bajo, notificaciones urgentes, disputas
          light:   '#FDA4AF',
          dark:    '#BE123C',
        },
        slate: {
          DEFAULT: '#F8FAFC', // Surface — fondo de tarjetas y contenedores
          dark:    '#E2E8F0',
        },
        // Tokens del sistema de diseño (contraste AA revisado) — espejo de @theme en main.css
        ink: { DEFAULT: '#0F172A', muted: '#475569' },
        'surface-sunken': '#F1F5F9',
        border: { DEFAULT: '#E2E8F0', strong: '#8B95A5' },
        'violet-tint': '#EDE9FE',
        'coral-text': '#BE123C',
        'coral-tint': '#FFE4E6',
        danger: '#E11D48',
        success: { DEFAULT: '#15803D', tint: '#DCFCE7' },
        warning: { DEFAULT: '#B45309', tint: '#FEF3C7' },
      },

      // ── Tipografía (claude.md §3.2) ─────────────────────────────────────────
      fontFamily: {
        body:    ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },

      // ── Sombras personalizadas ───────────────────────────────────────────────
      boxShadow: {
        card:       '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(15 23 42 / 0.12)',
      },

      // ── Border radius ────────────────────────────────────────────────────────
      borderRadius: {
        card: '0.75rem', // 12px — consistente con PrimeVue card borderRadius
      },
    },
  },

  plugins: [],
}
