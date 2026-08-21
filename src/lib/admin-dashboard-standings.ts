import { APP_LOCALE } from '@/lib/locale'
import { resolveTeamColor } from '@/lib/team-color'

export type CategoryStandingBlock = {
  categoryId: string
  name: string
  rows: Array<{
    rank: number
    teamId: string
    team: string
    color: string
    pj: number
    dg: string
    pts: number
    rankColor: string
  }>
}

type StandingMatch = {
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number
  awayScore: number
  homeTeam: { id: string; name: string; color: string | null } | null
  awayTeam: { id: string; name: string; color: string | null } | null
}

type StandingAccumulator = {
  teamId: string
  team: string
  color: string
  played: number
  gf: number
  ga: number
  points: number
}

function buildOneTable(matches: StandingMatch[]): CategoryStandingBlock['rows'] {
  const table = new Map<string, StandingAccumulator>()

  function ensureTeam(team: { id: string; name: string; color: string | null }) {
    if (!table.has(team.id)) {
      table.set(team.id, {
        teamId: team.id,
        team: team.name,
        color: resolveTeamColor(team.color, team.name),
        played: 0,
        gf: 0,
        ga: 0,
        points: 0,
      })
    }
    return table.get(team.id)!
  }

  for (const match of matches) {
    if (!match.homeTeam || !match.awayTeam) continue
    const home = ensureTeam(match.homeTeam)
    const away = ensureTeam(match.awayTeam)
    home.played += 1
    away.played += 1
    home.gf += match.homeScore
    home.ga += match.awayScore
    away.gf += match.awayScore
    away.ga += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.points += 3
    } else if (match.homeScore < match.awayScore) {
      away.points += 3
    } else {
      home.points += 1
      away.points += 1
    }
  }

  return [...table.values()]
    .sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || a.team.localeCompare(b.team, APP_LOCALE))
    .slice(0, 6)
    .map((row, index) => ({
      rank: index + 1,
      teamId: row.teamId,
      team: row.team,
      color: row.color,
      pj: row.played,
      dg: row.gf - row.ga > 0 ? `+${row.gf - row.ga}` : String(row.gf - row.ga),
      pts: row.points,
      rankColor: index < 3 ? '#b91c1c' : '#71717a',
    }))
}

export function buildStandingsByCategory(
  matches: Array<StandingMatch & { seasonCategoryId: string | null }>,
  categories: Array<{ id: string; categoryId: string; name: string }>,
): CategoryStandingBlock[] {
  return categories.map((category) => {
    const ofCategory = matches.filter((m) => m.seasonCategoryId === category.id)
    return {
      categoryId: category.categoryId,
      name: category.name,
      rows: buildOneTable(ofCategory),
    }
  })
}
