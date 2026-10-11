export const RUBROS_INFLUENCER = [
  { label: '✈️ Turismo', value: 'turismo' }, { label: '🏨 Hoteles', value: 'hoteles' },
  { label: '🗺️ Viajes', value: 'viajes' }, { label: '🍽️ Gastronomía', value: 'gastronomia' },
  { label: '👗 Moda', value: 'moda' }, { label: '💻 Tecnología', value: 'tecnologia' },
  { label: '💪 Fitness', value: 'fitness' }, { label: '💄 Belleza', value: 'belleza' },
  { label: '💼 Negocios', value: 'negocios' }, { label: '🎭 Entretenimiento', value: 'entretenimiento' },
  { label: '📚 Educación', value: 'educacion' }, { label: '📷 Fotografía', value: 'fotografia' },
  { label: '🏥 Salud', value: 'salud' }, { label: '🎵 Música', value: 'musica' }, { label: '⚽ Deporte', value: 'deporte' },
]

// Las marcas usan el mismo catálogo de rubros que los influencers
export const RUBROS = RUBROS_INFLUENCER

export function rubroLabel(value: string | null | undefined): string {
  return RUBROS.find(r => r.value === value)?.label ?? (value ?? '')
}
