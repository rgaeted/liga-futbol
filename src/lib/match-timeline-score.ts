import { EventType, MatchType } from '@prisma/client'
import { isScoringGoalEvent } from '@/lib/event-labels'

export type TimelineScoreEvent = {
  id: string
  type: EventType | string
  teamId?: string | null
  side?: 'A' | 'B' | null
}

function appliesScoreChange(
  matchType: MatchType,
  event: TimelineScoreEvent,
  homeTeamId: string | null,
  awayTeamId: string | null,
): { home: number; away: number } | null {
  const type = event.type as EventType
  if (matchType === MatchType.FRIENDLY) {
    if (isScoringGoalEvent(type) && event.side === 'A') return { home: 1, away: 0 }
    if (isScoringGoalEvent(type) && event.side === 'B') return { home: 0, away: 1 }
    if (type === EventType.OWN_GOAL && event.side === 'A') return { home: 0, away: 1 }
    if (type === EventType.OWN_GOAL && event.side === 'B') return { home: 1, away: 0 }
    return null
  }
  if (isScoringGoalEvent(type) && event.teamId === homeTeamId) return { home: 1, away: 0 }
  if (isScoringGoalEvent(type) && event.teamId === awayTeamId) return { home: 0, away: 1 }
  if (type === EventType.OWN_GOAL && event.teamId === homeTeamId) return { home: 0, away: 1 }
  if (type === EventType.OWN_GOAL && event.teamId === awayTeamId) return { home: 1, away: 0 }
  return null
}

/** Marcador local–visita tras cada evento que modifica el resultado. */
export function buildTimelineScoresAfter(
  matchType: MatchType,
  homeTeamId: string | null,
  awayTeamId: string | null,
  events: TimelineScoreEvent[],
): Map<string, string> {
  const scores = new Map<string, string>()
  let homeScore = 0
  let awayScore = 0

  for (const event of events) {
    const delta = appliesScoreChange(matchType, event, homeTeamId, awayTeamId)
    if (!delta) continue
    homeScore += delta.home
    awayScore += delta.away
    scores.set(event.id, `${homeScore}-${awayScore}`)
  }

  return scores
}
