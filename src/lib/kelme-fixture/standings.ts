import type { FixtureStatus } from './types'

export type StandingsMatch = {
  homeTeamId: string | null
  awayTeamId: string | null
  homeGoals: number
  awayGoals: number
  status: FixtureStatus
}

export type StandingRow = {
  teamId: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
  /** Posición (1 = primero). Los equipos con empate sin resolver comparten posición. */
  rank: number
  /** `true` si el empate persiste y requiere resolución manual. */
  tied: boolean
}

export type StandingsResult = {
  rows: StandingRow[]
  /** Todos los partidos del grupo están finalizados. */
  complete: boolean
  /** No quedan empates sin resolver. */
  fullyResolved: boolean
  /** La clasificación es definitiva: grupo completo y sin empates pendientes. */
  definitive: boolean
  unresolvedTeamIds: string[]
}

type CalculateInput = {
  /** Equipos de la tabla, en orden estable de inscripción (no se usa para desempatar). */
  teamIds: string[]
  matches: StandingsMatch[]
  /** Orden manual aprobado por la organización para romper empates irresolubles. */
  manualOrder?: string[] | null
}

function emptyRow(teamId: string): StandingRow {
  return { teamId, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, rank: 0, tied: false }
}

/**
 * Calcula la tabla a partir de partidos FINAL. Criterios: puntos, diferencia de goles, goles a
 * favor, resultado directo (solo con exactamente dos empatados) y orden manual. Nunca desempata
 * por nombre, id ni azar: si el empate persiste queda marcado como pendiente.
 */
export function calculateStandings({ teamIds, matches, manualOrder }: CalculateInput): StandingsResult {
  const table = new Map<string, StandingRow>(teamIds.map((id) => [id, emptyRow(id)]))
  const finals = matches.filter(
    (m) =>
      m.status === 'FINAL' &&
      m.homeTeamId != null &&
      m.awayTeamId != null &&
      table.has(m.homeTeamId) &&
      table.has(m.awayTeamId),
  )

  for (const m of finals) {
    const home = table.get(m.homeTeamId!)!
    const away = table.get(m.awayTeamId!)!
    home.pj += 1
    away.pj += 1
    home.gf += m.homeGoals
    home.gc += m.awayGoals
    away.gf += m.awayGoals
    away.gc += m.homeGoals
    if (m.homeGoals > m.awayGoals) {
      home.pg += 1
      home.pts += 3
      away.pp += 1
    } else if (m.homeGoals < m.awayGoals) {
      away.pg += 1
      away.pts += 3
      home.pp += 1
    } else {
      home.pe += 1
      away.pe += 1
      home.pts += 1
      away.pts += 1
    }
  }
  for (const row of table.values()) row.dg = row.gf - row.gc

  const expectedMatches = (teamIds.length * (teamIds.length - 1)) / 2
  const complete = teamIds.length > 1 && finals.length === expectedMatches

  const byStats = [...table.values()].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf)

  // Agrupa por (pts, dg, gf): cada grupo es un empate a resolver.
  const clusters: StandingRow[][] = []
  for (const row of byStats) {
    const last = clusters[clusters.length - 1]
    if (last && last[0].pts === row.pts && last[0].dg === row.dg && last[0].gf === row.gf) {
      last.push(row)
    } else {
      clusters.push([row])
    }
  }

  const manualIndex = new Map((manualOrder ?? []).map((id, index) => [id, index]))
  const ordered: StandingRow[] = []
  const unresolved: string[] = []

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      ordered.push(cluster[0])
      continue
    }

    if (cluster.length === 2) {
      const [x, y] = cluster
      const direct = finals.find(
        (m) =>
          (m.homeTeamId === x.teamId && m.awayTeamId === y.teamId) ||
          (m.homeTeamId === y.teamId && m.awayTeamId === x.teamId),
      )
      if (direct && direct.homeGoals !== direct.awayGoals) {
        const winnerId = direct.homeGoals > direct.awayGoals ? direct.homeTeamId : direct.awayTeamId
        ordered.push(...(winnerId === x.teamId ? [x, y] : [y, x]))
        continue
      }
    }

    if (cluster.every((row) => manualIndex.has(row.teamId))) {
      ordered.push(...[...cluster].sort((a, b) => manualIndex.get(a.teamId)! - manualIndex.get(b.teamId)!))
      continue
    }

    // Empate sin resolver: se conserva el orden de inscripción solo para mostrarlo.
    const stable = [...cluster].sort((a, b) => teamIds.indexOf(a.teamId) - teamIds.indexOf(b.teamId))
    for (const row of stable) {
      row.tied = true
      unresolved.push(row.teamId)
    }
    ordered.push(...stable)
  }

  // Posiciones: los empates sin resolver comparten la mejor posición del bloque.
  let position = 0
  let index = 0
  while (index < ordered.length) {
    position = index + 1
    if (ordered[index].tied) {
      let end = index
      while (end < ordered.length && ordered[end].tied && sameStats(ordered[end], ordered[index])) end += 1
      for (let i = index; i < end; i += 1) ordered[i].rank = position
      index = end
    } else {
      ordered[index].rank = position
      index += 1
    }
  }

  const fullyResolved = unresolved.length === 0
  return {
    rows: ordered,
    complete,
    fullyResolved,
    definitive: complete && fullyResolved,
    unresolvedTeamIds: unresolved,
  }
}

function sameStats(a: StandingRow, b: StandingRow): boolean {
  return a.pts === b.pts && a.dg === b.dg && a.gf === b.gf
}
