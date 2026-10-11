export const PLATAFORMAS_BRIEF = ['TikTok', 'Instagram', 'Facebook', 'YouTube'] as const

export const DERECHOS_USO = [
  { value: 'organico', label: 'Solo orgánico (sin pauta)' },
  { value: 'ads_30',   label: 'Pauta pagada por 30 días' },
  { value: 'ads_90',   label: 'Pauta pagada por 90 días' },
  { value: 'ads_180',  label: 'Pauta pagada por 6 meses' },
  { value: 'ads_365',  label: 'Pauta pagada por 1 año' },
] as const

export function derechosUsoLabel(value: string | null | undefined): string {
  return DERECHOS_USO.find(d => d.value === value)?.label ?? ''
}

export function formatPresupuesto(min: number | string | null | undefined, max: number | string | null | undefined): string {
  const fmt = (n: number | string) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)} USD`
  if (min != null) return `Desde ${fmt(min)} USD`
  if (max != null) return `Hasta ${fmt(max)} USD`
  return ''
}
