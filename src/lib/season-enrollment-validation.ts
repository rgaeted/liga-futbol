import type { SeasonEnrollmentInput } from '@/lib/validations/mobile-season'

export function validateSeasonEnrollment(input: SeasonEnrollmentInput): string | null {
  const playerTeams = new Map<string, string>()
  for (const team of input.teams) {
    for (const playerId of team.playerIds) {
      const existingTeam = playerTeams.get(playerId)
      if (existingTeam && existingTeam !== team.teamId) {
        return 'Un jugador no puede estar inscrito en dos equipos de la misma temporada'
      }
      playerTeams.set(playerId, team.teamId)
    }
  }
  return null
}

export function countRegisteredTeams(input: SeasonEnrollmentInput): number {
  return input.teams.filter((team) => team.playerIds.length > 0).length
}
