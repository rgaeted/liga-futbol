import type { MatchType } from '@prisma/client'

export type MvpPlayerOption = { id: string; label: string }

type MvpMatchRelations = {
  matchType: MatchType
  mvpPlayer?: { user: { name: string } } | null
  mvpFriendlyPlayer?: { firstName: string; lastName: string } | null
}

export function resolveMvpLabel(match: MvpMatchRelations): string | null {
  if (match.matchType === 'FRIENDLY') {
    if (!match.mvpFriendlyPlayer) return null
    return `${match.mvpFriendlyPlayer.firstName} ${match.mvpFriendlyPlayer.lastName}`.trim()
  }
  return match.mvpPlayer?.user.name ?? null
}

export function resolveMvpPlayerId(match: {
  matchType: MatchType
  mvpPlayerId: string | null
  mvpFriendlyPlayerId: string | null
}): string | null {
  return match.matchType === 'FRIENDLY' ? match.mvpFriendlyPlayerId : match.mvpPlayerId
}

export async function assertMvpInMatchRoster(
  db: {
    callUp: { findFirst: (args: object) => Promise<{ id: string } | null> }
    friendlyMatchPlayer: { findFirst: (args: object) => Promise<{ id: string } | null> }
    player: { findFirst: (args: object) => Promise<{ id: string } | null> }
  },
  match: {
    id: string
    matchType: MatchType
    homeTeamId: string | null
    awayTeamId: string | null
  },
  input: { playerId?: string | null; friendlyPlayerId?: string | null }
): Promise<string | null> {
  if (match.matchType === 'FRIENDLY') {
    const friendlyPlayerId = input.friendlyPlayerId
    if (!friendlyPlayerId) return null
    const row = await db.friendlyMatchPlayer.findFirst({
      where: { matchId: match.id, friendlyPlayerId },
      select: { id: true },
    })
    if (!row) return 'El MVP debe ser un jugador del partido'
    return null
  }

  const playerId = input.playerId
  if (!playerId) return null

  const inCallUp = await db.callUp.findFirst({
    where: { matchId: match.id, playerId },
    select: { id: true },
  })
  if (inCallUp) return null

  if (match.homeTeamId && match.awayTeamId) {
    const onTeam = await db.player.findFirst({
      where: {
        id: playerId,
        teamId: { in: [match.homeTeamId, match.awayTeamId] },
      },
      select: { id: true },
    })
    if (onTeam) return null
  }

  return 'El MVP debe ser un jugador del partido'
}
