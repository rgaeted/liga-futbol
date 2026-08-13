import type { LeagueMatchTeams, ScoringEventInput } from '@/lib/mobile/notifications/types'

export function resolveScoringTeamId(
  match: LeagueMatchTeams,
  event: ScoringEventInput,
): string | null {
  if (!event.teamId || !match.homeTeamId || !match.awayTeamId) {
    return null
  }

  if (!match.homeSeasonTeamId || !match.awaySeasonTeamId) {
    return null
  }

  if (event.type === 'GOAL') {
    if (event.teamId === match.homeTeamId) return match.homeSeasonTeamId
    if (event.teamId === match.awayTeamId) return match.awaySeasonTeamId
    return null
  }

  if (event.teamId === match.homeTeamId) return match.awaySeasonTeamId
  if (event.teamId === match.awayTeamId) return match.homeSeasonTeamId
  return null
}
