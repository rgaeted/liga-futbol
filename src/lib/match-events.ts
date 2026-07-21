import { db } from '@/lib/db'
import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { emitMatchUpdate } from '@/server/socket'
import type { CreateMatchEventInput } from '@/lib/validations/match-event'
import { getMatchMinute } from '@/lib/match-clock'
import { syncLeaguePlayerStats } from '@/lib/match-reconcile'

const eventInclude = {
  player: {
    include: {
      user: { select: { name: true } },
      team: { select: { id: true, name: true } },
    },
  },
  friendlyPlayer: { select: { firstName: true, lastName: true } },
} as const

const GAME_EVENT_TYPES: EventType[] = [
  EventType.GOAL,
  EventType.OWN_GOAL,
  EventType.YELLOW_CARD,
  EventType.RED_CARD,
  EventType.SHOT_ON_TARGET,
  EventType.SHOT_OFF_TARGET,
  EventType.SUBSTITUTION,
  EventType.FOUL,
]

export async function registerMatchEvent(
  matchId: string,
  input: CreateMatchEventInput,
  options?: { minuteOverride?: number }
) {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
  })

  const now = new Date()
  const minute = options?.minuteOverride ?? getMatchMinute(match, now)
  const { metadata, ...rest } = input

  const event = await db.matchEvent.create({
    data: {
      matchId,
      ...rest,
      minute,
      ...(metadata !== undefined ? { metadata: metadata as object } : {}),
    },
    include: eventInclude,
  })

  let homeScore = match.homeScore
  let awayScore = match.awayScore
  let status = match.status

  if (match.matchType === MatchType.FRIENDLY) {
    if (input.type === EventType.GOAL && input.side) {
      if (input.side === 'A') homeScore += 1
      if (input.side === 'B') awayScore += 1
    }
    if (input.type === EventType.OWN_GOAL && input.side) {
      if (input.side === 'A') awayScore += 1
      if (input.side === 'B') homeScore += 1
    }
  } else {
    if (input.type === EventType.GOAL && input.teamId) {
      if (input.teamId === match.homeTeamId) homeScore += 1
      if (input.teamId === match.awayTeamId) awayScore += 1
    }
    if (input.type === EventType.OWN_GOAL && input.teamId) {
      if (input.teamId === match.homeTeamId) awayScore += 1
      if (input.teamId === match.awayTeamId) homeScore += 1
    }
  }

  const clockUpdate: {
    clockStartedAt?: Date
    secondHalfStartedAt?: Date
    halftimeAt?: Date
  } = {}

  if (input.type === EventType.KICKOFF) {
    if (match.status === MatchStatus.SCHEDULED) {
      clockUpdate.clockStartedAt = now
      status = MatchStatus.LIVE
    } else if (match.status === MatchStatus.HALFTIME) {
      clockUpdate.secondHalfStartedAt = now
      status = MatchStatus.LIVE
    }
  }
  if (input.type === EventType.HALFTIME) {
    clockUpdate.halftimeAt = now
    status = MatchStatus.HALFTIME
  }
  if (input.type === EventType.FULLTIME) {
    status = MatchStatus.FINISHED
  }

  const updatedMatch = await db.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status, ...clockUpdate },
  })

  if (match.matchType === MatchType.LEAGUE && input.playerId) {
    await syncLeaguePlayerStats(input.playerId)
  }

  emitMatchUpdate({
    matchId,
    homeScore: updatedMatch.homeScore,
    awayScore: updatedMatch.awayScore,
    status: updatedMatch.status,
    clockStartedAt: updatedMatch.clockStartedAt,
    secondHalfStartedAt: updatedMatch.secondHalfStartedAt,
    halftimeAt: updatedMatch.halftimeAt,
    event,
  })

  return { event, match: updatedMatch }
}

export { GAME_EVENT_TYPES }
