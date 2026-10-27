export const APP_TIME_ZONE = 'America/El_Salvador'

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string): Date {
  return dateOnlyPattern.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseDate(value).toLocaleDateString('es-SV', {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
}

export function formatDateTime(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseDate(value).toLocaleString('es-SV', {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
}

export function formatTime(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseDate(value).toLocaleTimeString('es-SV', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
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
  }).formatToParts(parseDate(value))
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  const period = values.dayPeriod?.toLowerCase().includes('a') ? 'a. m.' : 'p. m.'
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} ${period}`
}

export function todayInAppTimeZone(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}
