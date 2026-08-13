import { APP_LOCALE, APP_TIMEZONE } from '@liga/mobile-core'

export function formatScheduleDateLabel(iso: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso))
}

export function formatScheduleTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso))
}

export function formatPublishedDateLabel(iso: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso))
}

export function groupMatchesByDate<T extends { scheduledAt: string }>(
  matches: T[],
): { dateKey: string; label: string; items: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const match of matches) {
    const dateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(match.scheduledAt))

    const bucket = groups.get(dateKey) ?? []
    bucket.push(match)
    groups.set(dateKey, bucket)
  }

  return [...groups.entries()].map(([dateKey, items]) => ({
    dateKey,
    label: formatScheduleDateLabel(items[0]!.scheduledAt),
    items,
  }))
}
