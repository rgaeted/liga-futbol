import { db } from '@/lib/db'
import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { emitMatchUpdate } from '@/server/socket'
import type { CreateMatchEventInput } from '@/lib/validations/match-event'

const eventInclude = {
  player: { include: { user: { select: { name: true } } } },
  friendlyPlayer: { select: { firstName: true, lastName: true } },
} as const

export async function registerMatchEvent(matchId: string, input: CreateMatchEventInput) {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
  })

  const { metadata, ...rest } = input
  const event = await db.matchEvent.create({
    data: {
      matchId,
      ...rest,
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

  if (input.type === EventType.KICKOFF) status = MatchStatus.LIVE
  if (input.type === EventType.HALFTIME) status = MatchStatus.HALFTIME
  if (input.type === EventType.FULLTIME) status = MatchStatus.FINISHED

  const updatedMatch = await db.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status },
  })

  if (match.matchType === MatchType.LEAGUE && input.playerId) {
    if (input.type === EventType.GOAL) {
      await db.player.update({
        where: { id: input.playerId },
        data: { goals: { increment: 1 } },
      })
    }
    if (input.type === EventType.YELLOW_CARD) {
      await db.player.update({
        where: { id: input.playerId },
        data: { yellowCards: { increment: 1 } },
      })
    }
    if (input.type === EventType.RED_CARD) {
      await db.player.update({
        where: { id: input.playerId },
        data: { redCards: { increment: 1 } },
      })
    }
  }

  emitMatchUpdate({
    matchId,
    homeScore: updatedMatch.homeScore,
    awayScore: updatedMatch.awayScore,
    status: updatedMatch.status,
    event,
  })

  return { event, match: updatedMatch }
}
