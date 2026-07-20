import { EventType, MatchType, type MatchEvent } from '@prisma/client'
import { db } from '@/lib/db'
import { emitMatchUpdate } from '@/server/socket'

export function computeScoresFromEvents(
  matchType: MatchType,
  homeTeamId: string | null,
  awayTeamId: string | null,
  events: Pick<MatchEvent, 'type' | 'teamId' | 'side'>[]
): { homeScore: number; awayScore: number } {
  let homeScore = 0
  let awayScore = 0

  for (const e of events) {
    if (matchType === MatchType.FRIENDLY) {
      if (e.type === EventType.GOAL && e.side === 'A') homeScore += 1
      if (e.type === EventType.GOAL && e.side === 'B') awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.side === 'A') awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.side === 'B') homeScore += 1
    } else {
      if (e.type === EventType.GOAL && e.teamId === homeTeamId) homeScore += 1
      if (e.type === EventType.GOAL && e.teamId === awayTeamId) awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.teamId === homeTeamId) awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.teamId === awayTeamId) homeScore += 1
    }
  }

  return { homeScore, awayScore }
}

export async function syncLeaguePlayerStats(playerId: string) {
  const [goals, yellowCards, redCards] = await Promise.all([
    db.matchEvent.count({
      where: {
        playerId,
        type: EventType.GOAL,
        match: { matchType: MatchType.LEAGUE },
      },
    }),
    db.matchEvent.count({
      where: {
        playerId,
        type: EventType.YELLOW_CARD,
        match: { matchType: MatchType.LEAGUE },
      },
    }),
    db.matchEvent.count({
      where: {
        playerId,
        type: EventType.RED_CARD,
        match: { matchType: MatchType.LEAGUE },
      },
    }),
  ])

  await db.player.update({
    where: { id: playerId },
    data: { goals, yellowCards, redCards },
  })
}

export async function reconcileMatchState(matchId: string, affectedPlayerIds: string[] = []) {
  const match = await db.match.findUniqueOrThrow({ where: { id: matchId } })
  const events = await db.matchEvent.findMany({ where: { matchId } })
  const { homeScore, awayScore } = computeScoresFromEvents(
    match.matchType,
    match.homeTeamId,
    match.awayTeamId,
    events
  )

  const updatedMatch = await db.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore },
  })

  if (match.matchType === MatchType.LEAGUE) {
    const playerIds = new Set(affectedPlayerIds)
    for (const event of events) {
      if (event.playerId) playerIds.add(event.playerId)
    }
    await Promise.all([...playerIds].map((playerId) => syncLeaguePlayerStats(playerId)))
  }

  emitMatchUpdate({
    matchId,
    homeScore: updatedMatch.homeScore,
    awayScore: updatedMatch.awayScore,
    status: updatedMatch.status,
    clockStartedAt: updatedMatch.clockStartedAt,
    secondHalfStartedAt: updatedMatch.secondHalfStartedAt,
    halftimeAt: updatedMatch.halftimeAt,
  })

  return updatedMatch
}
