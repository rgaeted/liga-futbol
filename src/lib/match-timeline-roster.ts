export type TimelineRosterPlayer = {
  id: string
  label: string
  teamId?: string | null
  side?: 'A' | 'B'
}

export function playersForTeamSide(
  matchType: 'LEAGUE' | 'FRIENDLY',
  players: TimelineRosterPlayer[],
  opts: { teamId: string; side: string }
) {
  if (matchType === 'FRIENDLY') {
    return players.filter((p) => p.side === opts.side)
  }
  if (!opts.teamId) return players
  return players.filter((p) => p.teamId === opts.teamId)
}

export function resolveAssistFilter(
  matchType: 'LEAGUE' | 'FRIENDLY',
  players: TimelineRosterPlayer[],
  opts: { teamId: string; side: string; scorerId: string }
) {
  if (opts.scorerId) {
    const scorer = players.find((p) => p.id === opts.scorerId)
    if (scorer) {
      if (matchType === 'FRIENDLY' && scorer.side) {
        return { teamId: opts.teamId, side: scorer.side }
      }
      if (matchType === 'LEAGUE' && scorer.teamId) {
        return { teamId: scorer.teamId, side: opts.side }
      }
    }
  }
  return { teamId: opts.teamId, side: opts.side }
}

export function assistCandidates(
  matchType: 'LEAGUE' | 'FRIENDLY',
  players: TimelineRosterPlayer[],
  opts: { teamId: string; side: string; scorerId: string }
) {
  const filter = resolveAssistFilter(matchType, players, opts)
  return playersForTeamSide(matchType, players, filter).filter((p) => p.id !== opts.scorerId)
}

export function sideFromScorer(
  matchType: 'LEAGUE' | 'FRIENDLY',
  players: TimelineRosterPlayer[],
  scorerId: string
): { side?: string; teamId?: string } {
  if (!scorerId) return {}
  const scorer = players.find((p) => p.id === scorerId)
  if (!scorer) return {}
  if (matchType === 'FRIENDLY' && scorer.side) return { side: scorer.side }
  if (matchType === 'LEAGUE' && scorer.teamId) return { teamId: scorer.teamId }
  return {}
}
