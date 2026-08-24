import { formatScheduleDateInput, scheduleInputToIso } from '@/lib/schedule-datetime'

export type AnalyticsPeriod = '7' | '30' | '90' | 'all'

export type AnalyticsWeatherPeriod = {
  avgTempC: number
  minTempC: number
  maxTempC: number
  topLabels: string[]
}

const PERIOD_DAYS: Record<Exclude<AnalyticsPeriod, 'all'>, number> = {
  '7': 7,
  '30': 30,
  '90': 90,
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7': 'últimos 7 días',
  '30': 'últimos 30 días',
  '90': 'últimos 90 días',
  all: 'todo el historial',
}

export function resolveAnalyticsPeriod(
  raw: string | null | undefined,
  now = new Date(),
): { period: AnalyticsPeriod; from: Date | null; label: string } {
  const period: AnalyticsPeriod =
    raw === '7' || raw === '30' || raw === '90' || raw === 'all' ? raw : '30'
  if (period === 'all') {
    return { period, from: null, label: PERIOD_LABELS.all }
  }
  const shifted = new Date(now.getTime() - PERIOD_DAYS[period] * 86_400_000)
  const from = new Date(scheduleInputToIso(formatScheduleDateInput(shifted), '00:00'))
  return { period, from, label: PERIOD_LABELS[period] }
}

export function paidRate(paidCount: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((paidCount / total) * 100)
}

export function applyMatchCap<T>(matches: T[], cap = 200): { rows: T[]; truncated: boolean } {
  if (matches.length <= cap) return { rows: matches, truncated: false }
  return { rows: matches.slice(0, cap), truncated: true }
}

export function shouldShowBlock(rows: readonly unknown[]): boolean {
  return rows.length > 0
}

export function weatherPeriodSummary(
  snapshots: Array<{ weatherTempC: number | null; weatherLabel: string | null }>,
): AnalyticsWeatherPeriod | null {
  const usable = snapshots.filter(
    (s): s is { weatherTempC: number; weatherLabel: string } =>
      s.weatherTempC != null && Boolean(s.weatherLabel),
  )
  if (usable.length < 2) return null
  const temps = usable.map((s) => s.weatherTempC)
  const avgTempC = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
  const counts = new Map<string, number>()
  for (const s of usable) counts.set(s.weatherLabel, (counts.get(s.weatherLabel) ?? 0) + 1)
  const topLabels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, 2)
    .map(([label]) => label)
  return {
    avgTempC,
    minTempC: Math.min(...temps),
    maxTempC: Math.max(...temps),
    topLabels,
  }
}
