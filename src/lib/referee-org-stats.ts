import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import { SCORING_GOAL_EVENT_TYPES } from '@/lib/event-labels'

export type RefereeOrgStats = {
  matches: {
    total: number
    finished: number
    cancelled: number
    upcoming: number
    league: number
    friendly: number
  }
  events: {
    goals: number
    yellowCards: number
    redCards: number
    substitutions: number
    fouls: number
    total: number
  }
}

const UPCOMING_STATUSES: MatchStatus[] = [
  MatchStatus.SCHEDULED,
  MatchStatus.LIVE,
  MatchStatus.HALFTIME,
]

function officiatedWhere(userId: string, organizationId: string) {
  return { refereeId: userId, organizationId }
}

function finishedOfficiatedWhere(userId: string, organizationId: string) {
  return {
    ...officiatedWhere(userId, organizationId),
    status: MatchStatus.FINISHED,
  }
}

/** Partidos y eventos en partidos arbitrados por el usuario en la org. */
export async function getRefereeOrgStats(
  userId: string,
  organizationId: string,
): Promise<RefereeOrgStats> {
  const base = officiatedWhere(userId, organizationId)
  const finished = finishedOfficiatedWhere(userId, organizationId)

  const [
    total,
    finishedCount,
    cancelled,
    upcoming,
    league,
    friendly,
    goals,
    yellowCards,
    redCards,
    substitutions,
    fouls,
  ] = await Promise.all([
    db.match.count({ where: base }),
    db.match.count({ where: finished }),
    db.match.count({ where: { ...base, status: MatchStatus.CANCELLED } }),
    db.match.count({ where: { ...base, status: { in: UPCOMING_STATUSES } } }),
    db.match.count({ where: { ...base, matchType: MatchType.LEAGUE } }),
    db.match.count({ where: { ...base, matchType: MatchType.FRIENDLY } }),
    db.matchEvent.count({
      where: {
        match: finished,
        type: { in: [...SCORING_GOAL_EVENT_TYPES, EventType.OWN_GOAL] },
      },
    }),
    db.matchEvent.count({
      where: { match: finished, type: EventType.YELLOW_CARD },
    }),
    db.matchEvent.count({
      where: { match: finished, type: EventType.RED_CARD },
    }),
    db.matchEvent.count({
      where: { match: finished, type: EventType.SUBSTITUTION },
    }),
    db.matchEvent.count({
      where: { match: finished, type: EventType.FOUL },
    }),
  ])

  return {
    matches: {
      total,
      finished: finishedCount,
      cancelled,
      upcoming,
      league,
      friendly,
    },
    events: {
      goals,
      yellowCards,
      redCards,
      substitutions,
      fouls,
      total: goals + yellowCards + redCards + substitutions + fouls,
    },
  }
}
