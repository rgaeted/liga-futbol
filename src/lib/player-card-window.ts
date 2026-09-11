import { EventType } from '@prisma/client'
import { isScoringGoalEvent } from '@/lib/event-labels'
import { PLAYER_CARD_MIN_PJ, percentile } from '@/lib/player-card'

export type PlayerCardEventRow = {
  type: string
  playerId: string | null
  assistPlayerId: string | null
}

export type PlayerCardMatchRow = {
  id: string
  scheduledAt: Date
  sideAName: string | null
  sideBName: string | null
  roster: Array<{ playerId: string; side: 'A' | 'B' }>
  events: PlayerCardEventRow[]
  mvpPlayerIds: string[]
}

export type WindowAggregate = {
  pj: number
  goles: number
  asistencias: number
  presencias: number
  fechasPosibles: number
  mvps: number
  amarillas: number
  rojas: number
  rachaGoleadora: number
  rachaPresencia: number
  lastSideName: string | null
  p10GolesPorPartido: number
  p90GolesPorPartido: number
  p10AsistPorPartido: number
  p90AsistPorPartido: number
}

export function trailingStreak(flags: boolean[]): number {
  let n = 0
  for (let i = flags.length - 1; i >= 0; i--) {
    if (!flags[i]) break
    n += 1
  }
  return n
}

function playerStatsFor(
  matches: PlayerCardMatchRow[],
  playerId: string,
): { pj: number; goles: number; asistencias: number } {
  let pj = 0
  let goles = 0
  let asistencias = 0
  for (const match of matches) {
    const played = match.roster.some((row) => row.playerId === playerId)
    if (played) pj += 1
    for (const event of match.events) {
      if (isScoringGoalEvent(event.type as EventType) && event.playerId === playerId) {
        goles += 1
      }
      if (isScoringGoalEvent(event.type as EventType) && event.assistPlayerId === playerId) {
        asistencias += 1
      }
    }
  }
  return { pj, goles, asistencias }
}

export function aggregatePlayerCardWindow(
  matches: PlayerCardMatchRow[],
  playerId: string,
): WindowAggregate {
  const ordered = [...matches].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
  )
  const played = ordered.filter((match) =>
    match.roster.some((row) => row.playerId === playerId),
  )
  const last = played[played.length - 1]
  const lastRoster = last?.roster.find((row) => row.playerId === playerId)
  const lastSideName = last
    ? lastRoster?.side === 'B'
      ? (last.sideBName ?? 'B')
      : (last.sideAName ?? 'A')
    : null

  let goles = 0
  let asistencias = 0
  let amarillas = 0
  let rojas = 0
  let mvps = 0
  for (const match of ordered) {
    if (match.mvpPlayerIds.includes(playerId)) mvps += 1
    for (const event of match.events) {
      if (isScoringGoalEvent(event.type as EventType) && event.playerId === playerId) {
        goles += 1
      }
      if (isScoringGoalEvent(event.type as EventType) && event.assistPlayerId === playerId) {
        asistencias += 1
      }
      if (event.type === 'YELLOW_CARD' && event.playerId === playerId) amarillas += 1
      if (event.type === 'RED_CARD' && event.playerId === playerId) rojas += 1
    }
  }

  const ratesG: number[] = []
  const ratesA: number[] = []
  const playerIds = new Set(ordered.flatMap((match) => match.roster.map((row) => row.playerId)))
  for (const id of playerIds) {
    const stats = playerStatsFor(ordered, id)
    if (stats.pj < PLAYER_CARD_MIN_PJ) continue
    ratesG.push(stats.goles / stats.pj)
    ratesA.push(stats.asistencias / stats.pj)
  }

  return {
    pj: played.length,
    goles,
    asistencias,
    presencias: played.length,
    fechasPosibles: ordered.length,
    mvps,
    amarillas,
    rojas,
    rachaGoleadora: trailingStreak(
      played.map((match) =>
        match.events.some(
          (event) =>
            isScoringGoalEvent(event.type as EventType) && event.playerId === playerId,
        ),
      ),
    ),
    rachaPresencia: trailingStreak(
      ordered.map((match) => match.roster.some((row) => row.playerId === playerId)),
    ),
    lastSideName,
    p10GolesPorPartido: ratesG.length ? percentile(ratesG, 0.1) : 0,
    p90GolesPorPartido: ratesG.length ? percentile(ratesG, 0.9) : 0,
    p10AsistPorPartido: ratesA.length ? percentile(ratesA, 0.1) : 0,
    p90AsistPorPartido: ratesA.length ? percentile(ratesA, 0.9) : 0,
  }
}
