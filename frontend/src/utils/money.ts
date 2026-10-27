const usdFormatter = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' })

export function parseMoney(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function formatUsd(value: unknown): string {
  const amount = parseMoney(value)
  return amount === null ? 'No disponible' : usdFormatter.format(amount)
}
