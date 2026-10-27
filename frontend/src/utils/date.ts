export const APP_TIME_ZONE = 'America/El_Salvador'

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

export function parseAppDate(value: string): Date {
  if (dateOnlyPattern.test(value)) return new Date(`${value}T00:00:00-06:00`)
  // Legacy local timestamps without an offset must not use the browser timezone.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)) {
    return new Date(`${value.replace(' ', 'T')}-06:00`)
  }
  return new Date(value)
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseAppDate(value).toLocaleDateString('es-SV', {
    ...options,
    timeZone: APP_TIME_ZONE,
  })
}

export function formatDateTime(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseAppDate(value).toLocaleString('es-SV', {
    ...options,
    timeZone: APP_TIME_ZONE,
  })
}

export function formatTime(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseAppDate(value).toLocaleTimeString('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
    timeZone: APP_TIME_ZONE,
  })
}

export function formatLocalDateTimeForDocument(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(parseAppDate(value))
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  const period = values.dayPeriod?.toLowerCase().includes('a') ? 'a. m.' : 'p. m.'
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} ${period}`
}

export function todayInAppTimeZone(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function calculateAge(dateOfBirth: string, now = new Date()): number {
  const today = todayInAppTimeZone(now)
  const birth = dateOfBirth.slice(0, 10)
  return Number(today.slice(0, 4)) - Number(birth.slice(0, 4)) - (today.slice(5) < birth.slice(5) ? 1 : 0)
}
