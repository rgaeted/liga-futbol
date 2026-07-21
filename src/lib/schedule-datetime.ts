import { APP_TIMEZONE } from '@/lib/locale'

/** yyyy-mm-dd para `<input type="date">` en la zona horaria de la app. */
export function formatScheduleDateInput(date: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** HH:mm para `<input type="time">` en la zona horaria de la app. */
export function formatScheduleTimeInput(date: Date, timeZone = APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

function partsToUtcMs(parts: Intl.DateTimeFormatPart[]): number {
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
}

/** Convierte fecha y hora locales (Chile) a ISO UTC para persistir en BD. */
export function scheduleInputToIso(date: string, time: string, timeZone = APP_TIMEZONE): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const targetUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  let guess = targetUtcMs
  for (let i = 0; i < 3; i++) {
    const formatted = formatter.formatToParts(new Date(guess))
    const asUtc = partsToUtcMs(formatted)
    guess -= asUtc - targetUtcMs
  }

  return new Date(guess).toISOString()
}
