const TIME_ZONE = 'America/Santiago'

const santiagoParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') }
}

/** Instante UTC en que empieza el mes (día 1, 00:00) en America/Santiago. */
export function statMonth(now: Date): Date {
  const { year, month } = santiagoParts(now)
  for (const offsetHours of [3, 4]) {
    const candidate = new Date(Date.UTC(year, month - 1, 1, offsetHours))
    const local = santiagoParts(candidate)
    if (local.year === year && local.month === month && local.day === 1 && local.hour === 0) {
      return candidate
    }
  }
  return new Date(Date.UTC(year, month - 1, 1, 3))
}

const BOT_PATTERN = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slurp|headless/i

export function looksLikeBot(userAgent: string | null): boolean {
  if (!userAgent) return true
  return BOT_PATTERN.test(userAgent)
}

export function resolveClickTarget(
  sponsor: { ctaUrl: string | null; websiteUrl: string | null },
  to: 'cta' | 'web',
): string | null {
  const ordered = to === 'cta' ? [sponsor.ctaUrl, sponsor.websiteUrl] : [sponsor.websiteUrl, sponsor.ctaUrl]
  return ordered.find((url): url is string => !!url) ?? null
}
