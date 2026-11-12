import { formatScheduleTimeLabel } from '@/lib/schedule-datetime'

export type ScheduleMatch = {
  code: string
  court: number
  startAt: Date
  endAt: Date
  /** Los partidos de definición pendientes no tienen equipos y no se comparan por equipo. */
  homeTeamId: string | null
  awayTeamId: string | null
  phase?: string
}

const MINUTE = 60_000

/** Dos intervalos [inicio, fin) se solapan si cada uno empieza antes de que termine el otro. */
function overlaps(a: ScheduleMatch, b: ScheduleMatch): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt
}

const hhmm = (date: Date) => formatScheduleTimeLabel(date)

export type ScheduleRules = {
  matchMinutes: number
  /** Ningún partido puede terminar después de esta hora. */
  latestEnd: Date
}

/** Problemas que invalidan el calendario. Devuelve una lista vacía si todo es correcto. */
export function validateSchedule(matches: ScheduleMatch[], rules: ScheduleRules): string[] {
  const issues: string[] = []

  for (const m of matches) {
    const minutes = (m.endAt.getTime() - m.startAt.getTime()) / MINUTE
    if (minutes !== rules.matchMinutes) {
      issues.push(`${m.code}: dura ${minutes} minutos y debe durar ${rules.matchMinutes}.`)
    }
    if (m.endAt > rules.latestEnd) {
      issues.push(`${m.code}: termina a las ${hhmm(m.endAt)}, después del cierre (${hhmm(rules.latestEnd)}).`)
    }
  }

  for (let i = 0; i < matches.length; i += 1) {
    for (let j = i + 1; j < matches.length; j += 1) {
      const a = matches[i]
      const b = matches[j]
      if (!overlaps(a, b)) continue

      if (a.court === b.court) {
        issues.push(`${a.code} y ${b.code}: se solapan en la cancha ${a.court}.`)
      }
      const aTeams = [a.homeTeamId, a.awayTeamId].filter((id): id is string => !!id)
      const shared = [b.homeTeamId, b.awayTeamId].filter((id): id is string => !!id && aTeams.includes(id))
      if (shared.length > 0) {
        issues.push(`${a.code} y ${b.code}: un mismo equipo juega dos partidos a la vez.`)
      }
    }
  }

  return issues
}

/** Cantidad de partidos por equipo (solo cuenta partidos con equipos ya definidos). */
export function matchesPerTeam(matches: ScheduleMatch[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const m of matches) {
    for (const id of [m.homeTeamId, m.awayTeamId]) {
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * Avisos operativos que no invalidan el calendario pero conviene que la organización conozca:
 * poco tiempo entre el último partido de grupos y las definiciones, y descansos cortos.
 */
export function operationalAlerts(
  matches: ScheduleMatch[],
  teamNames: Map<string, string>,
  options: { warnBelowMinutes?: number } = {},
): string[] {
  const threshold = options.warnBelowMinutes ?? 15
  const alerts: string[] = []

  const groupEnds = matches.filter((m) => m.phase === 'GROUP').map((m) => m.endAt.getTime())
  const definitionStarts = matches
    .filter((m) => m.phase === 'FINAL' || m.phase === 'THIRD_PLACE' || m.phase === 'FIFTH_PLACE')
    .map((m) => m.startAt.getTime())
  if (groupEnds.length > 0 && definitionStarts.length > 0) {
    const lastGroupEnd = Math.max(...groupEnds)
    const firstDefinition = Math.min(...definitionStarts)
    const gap = (firstDefinition - lastGroupEnd) / MINUTE
    if (gap <= threshold) {
      alerts.push(
        `El último partido de grupos termina a las ${hhmm(new Date(lastGroupEnd))} y las definiciones comienzan a las ${hhmm(new Date(firstDefinition))}: ` +
          `quedan solo ${gap} minutos para confirmar resultados y posiciones. Si hay retraso, las definiciones podrían no terminar a las 12:00.`,
      )
    }
  }

  const byTeam = new Map<string, ScheduleMatch[]>()
  for (const m of matches) {
    for (const id of [m.homeTeamId, m.awayTeamId]) {
      if (id) byTeam.set(id, [...(byTeam.get(id) ?? []), m])
    }
  }
  const tight: string[] = []
  for (const [id, list] of byTeam) {
    const sorted = [...list].sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    const shortest = sorted
      .slice(1)
      .map((m, index) => (m.startAt.getTime() - sorted[index].endAt.getTime()) / MINUTE)
      .reduce((min, value) => Math.min(min, value), Infinity)
    if (shortest < threshold) tight.push(`${teamNames.get(id) ?? id} (${shortest} min)`)
  }
  if (tight.length > 0) {
    alerts.push(`Descansos cortos entre partidos: ${tight.join(', ')}.`)
  }

  return alerts
}
