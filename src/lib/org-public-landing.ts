export type OrgPublicLanding = {
  organization: {
    name: string
    slug: string
    primaryColor: string
    logoUrl: string | null
  }
  live: Array<{
    id: string
    label: string
    score: string
    status: 'LIVE' | 'HALFTIME'
  }>
  nextMatch: {
    id: string
    label: string
    when: string
    venue: string
  } | null
  results: Array<{
    id: string
    label: string
    score: string
    when: string
  }>
  scorers: Array<{
    name: string
    goals: number
  }>
}

export function tallyRecentScorers(
  events: Array<{ type: string; playerId: string | null; playerName: string | null }>,
  take = 5,
): Array<{ name: string; goals: number }> {
  const map = new Map<string, { name: string; goals: number }>()
  for (const e of events) {
    if (e.type !== 'GOAL' || !e.playerId) continue
    const row = map.get(e.playerId) ?? { name: e.playerName ?? 'Jugador', goals: 0 }
    row.goals += 1
    if (e.playerName) row.name = e.playerName
    map.set(e.playerId, row)
  }
  return [...map.values()]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'es'))
    .slice(0, take)
}
