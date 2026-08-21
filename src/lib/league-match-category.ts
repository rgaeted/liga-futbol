export function validateLeagueMatchTeams(input: {
  homeTeamId: string
  awayTeamId: string
  enrolledTeamIds: string[]
}): string | null {
  if (input.homeTeamId === input.awayTeamId) {
    return 'Local y visita deben ser clubes distintos.'
  }
  const enrolled = new Set(input.enrolledTeamIds)
  if (!enrolled.has(input.homeTeamId) || !enrolled.has(input.awayTeamId)) {
    return 'Local y visita deben estar inscritos en esta categoría.'
  }
  return null
}
