import { EventType, type FriendlySide, type Match, type MatchEvent } from '@prisma/client'

export type KickoffSide = 'home' | 'away'

export function kickoffTeamFromEvent(
  event: Pick<MatchEvent, 'type' | 'side' | 'teamId'>,
  match: Pick<Match, 'matchType' | 'homeTeamId' | 'awayTeamId'>
): KickoffSide | null {
  if (event.type !== EventType.KICKOFF) return null

  if (match.matchType === 'FRIENDLY') {
    if (event.side === 'A') return 'home'
    if (event.side === 'B') return 'away'
    return null
  }

  if (event.teamId && event.teamId === match.homeTeamId) return 'home'
  if (event.teamId && event.teamId === match.awayTeamId) return 'away'
  return null
}

export function oppositeKickoffSide(side: KickoffSide): KickoffSide {
  return side === 'home' ? 'away' : 'home'
}

export function kickoffSideToFriendly(side: KickoffSide): FriendlySide {
  return side === 'home' ? 'A' : 'B'
}
