import type { MatchType } from '@prisma/client'

type MatchLabelInput = {
  matchType: MatchType | 'LEAGUE' | 'FRIENDLY'
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string } | null
  awayTeam: { name: string } | null
}

export function friendlyCategoryLabel(
  match: {
    matchType: string
    friendlyCategory?: { name: string } | null
  }
): string | null {
  if (match.matchType !== 'FRIENDLY') return null
  return match.friendlyCategory?.name ?? null
}

export function matchSideNames(match: MatchLabelInput): { home: string; away: string } {
  if (match.matchType === 'FRIENDLY') {
    return {
      home: match.sideAName ?? 'Lado A',
      away: match.sideBName ?? 'Lado B',
    }
  }
  return {
    home: match.homeTeam?.name ?? 'Local',
    away: match.awayTeam?.name ?? 'Visitante',
  }
}

export function matchDisplayName(match: MatchLabelInput): string {
  const { home, away } = matchSideNames(match)
  return `${home} vs ${away}`
}

type EventTeamInput = {
  teamId?: string | null
  side?: 'A' | 'B' | null
  playerTeamId?: string | null
}

type MatchTeamInput = MatchLabelInput & {
  homeTeamId?: string | null
  awayTeamId?: string | null
}

export function eventTeamLabel(
  event: EventTeamInput,
  match: MatchTeamInput
): string | null {
  const sides = matchSideNames(match)
  const resolvedTeamId = event.teamId ?? event.playerTeamId ?? null

  if (event.side === 'A') return sides.home
  if (event.side === 'B') return sides.away
  if (resolvedTeamId && match.homeTeamId && resolvedTeamId === match.homeTeamId) return sides.home
  if (resolvedTeamId && match.awayTeamId && resolvedTeamId === match.awayTeamId) return sides.away
  return null
}

export function resolveEventTeamLabel(
  event: {
    teamId?: string | null
    side?: 'A' | 'B' | null
    playerTeamId?: string | null
    playerTeamName?: string | null
    friendlyPlayerId?: string | null
    friendlySide?: 'A' | 'B' | null
  },
  match: MatchTeamInput
): string | null {
  const fromIds = eventTeamLabel(
    {
      teamId: event.teamId,
      side: event.side ?? event.friendlySide ?? null,
      playerTeamId: event.playerTeamId,
    },
    match
  )
  if (fromIds) return fromIds
  if (event.playerTeamName) return event.playerTeamName
  return null
}
