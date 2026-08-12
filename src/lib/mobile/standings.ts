import type { MobileStandingRow } from '@liga/mobile-contracts'
import { APP_LOCALE } from '@/lib/locale'
import { resolveTeamColor } from '@/lib/team-color'

type FinishedMatch = {
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number
  awayScore: number
  homeTeam: { id: string; name: string; color: string | null } | null
  awayTeam: { id: string; name: string; color: string | null } | null
}

type SeasonTeamRef = {
  seasonTeamId: string
  teamId: string
  displayName: string
  color: string | null
  crestMimeType: string | null
}

type Accumulator = {
  seasonTeamId: string
  teamId: string
  name: string
  color: string
  crestMimeType: string | null
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
}

export function buildMobileStandings(
  matches: FinishedMatch[],
  seasonTeamByTeamId: Map<string, SeasonTeamRef>,
): MobileStandingRow[] {
  const table = new Map<string, Accumulator>()

  function ensureTeam(teamId: string, fallbackName: string, fallbackColor: string | null) {
    const seasonTeam = seasonTeamByTeamId.get(teamId)
    const key = seasonTeam?.seasonTeamId ?? teamId
    if (!table.has(key)) {
      table.set(key, {
        seasonTeamId: seasonTeam?.seasonTeamId ?? key,
        teamId,
        name: seasonTeam?.displayName ?? fallbackName,
        color: resolveTeamColor(seasonTeam?.color ?? fallbackColor, fallbackName),
        crestMimeType: seasonTeam?.crestMimeType ?? null,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
      })
    }
    return table.get(key)!
  }

  for (const match of matches) {
    if (!match.homeTeam || !match.awayTeam) continue
    const home = ensureTeam(match.homeTeam.id, match.homeTeam.name, match.homeTeam.color)
    const away = ensureTeam(match.awayTeam.id, match.awayTeam.name, match.awayTeam.color)
    home.pj += 1
    away.pj += 1
    home.gf += match.homeScore
    home.gc += match.awayScore
    away.gf += match.awayScore
    away.gc += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.pg += 1
      away.pp += 1
    } else if (match.homeScore < match.awayScore) {
      away.pg += 1
      home.pp += 1
    } else {
      home.pe += 1
      away.pe += 1
    }
  }

  return [...table.values()]
    .map((row) => ({
      ...row,
      dg: row.gf - row.gc,
      pts: row.pg * 3 + row.pe,
    }))
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.dg - a.dg ||
        b.gf - a.gf ||
        a.name.localeCompare(b.name, APP_LOCALE),
    )
    .map((row, index) => ({
      rank: index + 1,
      seasonTeamId: row.seasonTeamId,
      teamId: row.teamId,
      name: row.name,
      color: row.color,
      crestUrl: null,
      pj: row.pj,
      pg: row.pg,
      pe: row.pe,
      pp: row.pp,
      gf: row.gf,
      gc: row.gc,
      dg: row.dg,
      pts: row.pts,
    }))
}
