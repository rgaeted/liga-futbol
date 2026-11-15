/** Equipos de un DT que juegan en el partido (un DT puede dirigir varios equipos, uno por categoría). */
export function coachTeamIdsInMatch(
  coachTeamIds: string[],
  match: { homeTeamId: string | null; awayTeamId: string | null },
): string[] {
  return coachTeamIds.filter((id) => id === match.homeTeamId || id === match.awayTeamId)
}
