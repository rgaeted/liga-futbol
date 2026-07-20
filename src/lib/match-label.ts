import type { MatchType } from '@prisma/client'

type MatchLabelInput = {
  matchType: MatchType | 'LEAGUE' | 'FRIENDLY'
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string } | null
  awayTeam: { name: string } | null
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
