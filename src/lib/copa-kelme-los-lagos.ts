// src/lib/copa-kelme-los-lagos.ts
import { scheduleInputToIso } from '@/lib/schedule-datetime'

export type CupVariant = '4' | '6'
export type CupPhase = 'grupos' | 'finales'
export type CupTeamKey =
  | 'colo-colo'
  | 'catolica'
  | 'union'
  | 'fv'
  | 'austral'
  | 'club-6'
export type CupCategoryKey = 'infantil' | 'grupo-a' | 'grupo-b' | 'finales'

export const CUP_SEASON_NAME = 'Copa Kelme Los Lagos'
export const CUP_ORG_SLUG = 'kelme'
export const CUP_FOOTBALL_FORMAT = 'FUTBOL_7' as const
export const CUP_REGION_CODE = '10'
export const CUP_COMMUNE_CODE = '10109'
export const CUP_DEFAULT_VENUE = 'Por confirmar'
export const CUP_KICKOFF_SLOTS = ['10:00', '11:15'] as const

export const CUP_TEAMS: Record<
  CupTeamKey,
  { key: CupTeamKey; name: string; id: string }
> = {
  'colo-colo': { key: 'colo-colo', name: 'Colo Colo', id: 'ckll-team-colo-colo' },
  catolica: { key: 'catolica', name: 'Católica', id: 'ckll-team-catolica' },
  union: { key: 'union', name: 'Unión', id: 'ckll-team-union' },
  fv: { key: 'fv', name: 'FV', id: 'ckll-team-fv' },
  austral: { key: 'austral', name: 'Austral', id: 'ckll-team-austral' },
  'club-6': { key: 'club-6', name: 'Club 6', id: 'ckll-team-club-6' },
}

export const CUP_TEAMS_4: CupTeamKey[] = ['colo-colo', 'catolica', 'union', 'fv']
export const CUP_TEAMS_6: CupTeamKey[] = [
  'colo-colo',
  'catolica',
  'union',
  'fv',
  'austral',
  'club-6',
]

export const CUP_CATEGORIES: Record<
  CupCategoryKey,
  { key: CupCategoryKey; name: string; id: string }
> = {
  infantil: {
    key: 'infantil',
    name: 'Copa Los Lagos Infantil',
    id: 'ckll-cat-infantil',
  },
  'grupo-a': {
    key: 'grupo-a',
    name: 'Copa Los Lagos Grupo A',
    id: 'ckll-cat-grupo-a',
  },
  'grupo-b': {
    key: 'grupo-b',
    name: 'Copa Los Lagos Grupo B',
    id: 'ckll-cat-grupo-b',
  },
  finales: {
    key: 'finales',
    name: 'Copa Los Lagos Finales',
    id: 'ckll-cat-finales',
  },
}

export type GroupMatch = {
  round: number
  slot: 0 | 1
  homeKey: CupTeamKey
  awayKey: CupTeamKey
  categoryKey: Exclude<CupCategoryKey, 'finales'>
}

export type GroupFixture = {
  variant: CupVariant
  teamKeys: CupTeamKey[]
  categoryKeys: CupCategoryKey[]
  matches: GroupMatch[]
}

export function buildGroupFixture(variant: CupVariant): GroupFixture {
  if (variant === '4') {
    const [a, b, c, d] = CUP_TEAMS_4
    return {
      variant,
      teamKeys: [...CUP_TEAMS_4],
      categoryKeys: ['infantil', 'finales'],
      matches: [
        { round: 1, slot: 0, homeKey: a, awayKey: b, categoryKey: 'infantil' },
        { round: 1, slot: 1, homeKey: c, awayKey: d, categoryKey: 'infantil' },
        { round: 2, slot: 0, homeKey: a, awayKey: c, categoryKey: 'infantil' },
        { round: 2, slot: 1, homeKey: b, awayKey: d, categoryKey: 'infantil' },
        { round: 3, slot: 0, homeKey: a, awayKey: d, categoryKey: 'infantil' },
        { round: 3, slot: 1, homeKey: b, awayKey: c, categoryKey: 'infantil' },
      ],
    }
  }

  const [a1, a2, a3, b1, b2, b3] = CUP_TEAMS_6
  return {
    variant,
    teamKeys: [...CUP_TEAMS_6],
    categoryKeys: ['grupo-a', 'grupo-b', 'finales'],
    matches: [
      { round: 1, slot: 0, homeKey: a1, awayKey: a2, categoryKey: 'grupo-a' },
      { round: 1, slot: 1, homeKey: b1, awayKey: b2, categoryKey: 'grupo-b' },
      { round: 2, slot: 0, homeKey: a1, awayKey: a3, categoryKey: 'grupo-a' },
      { round: 2, slot: 1, homeKey: b1, awayKey: b3, categoryKey: 'grupo-b' },
      { round: 3, slot: 0, homeKey: a2, awayKey: a3, categoryKey: 'grupo-a' },
      { round: 3, slot: 1, homeKey: b2, awayKey: b3, categoryKey: 'grupo-b' },
    ],
  }
}

export type CupSeedArgs = {
  variant: CupVariant
  phase: CupPhase
  startDate: string | null
  venue: string
  dryRun: boolean
  resetMatches: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseCupSeedArgs(
  argv: string[],
): { ok: true; value: CupSeedArgs } | { ok: false; error: string } {
  let variant: CupVariant | null = null
  let phase: CupPhase = 'grupos'
  let startDate: string | null = null
  let venue = CUP_DEFAULT_VENUE
  let dryRun = false
  let resetMatches = false

  for (const arg of argv) {
    if (arg === '--variant=4' || arg === '--variant=6') {
      variant = arg.slice('--variant='.length) as CupVariant
    } else if (arg === '--phase=grupos' || arg === '--phase=finales') {
      phase = arg.slice('--phase='.length) as CupPhase
    } else if (arg.startsWith('--start=')) {
      startDate = arg.slice('--start='.length)
    } else if (arg.startsWith('--venue=')) {
      venue = arg.slice('--venue='.length).trim() || CUP_DEFAULT_VENUE
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--reset-matches') {
      resetMatches = true
    }
  }

  if (!variant) return { ok: false, error: 'Usa --variant=4 o --variant=6' }
  if (startDate && !DATE_RE.test(startDate)) {
    return { ok: false, error: 'Usa --start=YYYY-MM-DD' }
  }

  return {
    ok: true,
    value: { variant, phase, startDate, venue, dryRun, resetMatches },
  }
}

export function addDaysIso(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day + days)
  return new Date(utc).toISOString().slice(0, 10)
}

export type ScheduledCupMatch = GroupMatch & { scheduledAt: string }

export function scheduleCupMatches(
  matches: GroupMatch[],
  firstDate: string,
  slots: readonly [string, string] = CUP_KICKOFF_SLOTS,
): ScheduledCupMatch[] {
  return matches.map((match) => ({
    ...match,
    scheduledAt: scheduleInputToIso(
      addDaysIso(firstDate, (match.round - 1) * 7),
      slots[match.slot],
    ),
  }))
}

export type StandingRow = {
  teamKey: CupTeamKey
  pts: number
  gf: number
  ga: number
}

export type KnockoutKind = 'semifinal' | 'tercer-puesto' | 'final'

export type KnockoutMatch = {
  round: number
  slot: 0 | 1
  homeKey: CupTeamKey
  awayKey: CupTeamKey
  kind: KnockoutKind
  categoryKey: 'finales'
}

type KnockoutResult =
  | { ok: true; matches: KnockoutMatch[] }
  | { ok: false; error: string }

export type CupResult = {
  homeKey: CupTeamKey
  awayKey: CupTeamKey
  homeGoals: number
  awayGoals: number
}

export function tableFromResults(
  teamKeys: CupTeamKey[],
  results: CupResult[],
): StandingRow[] {
  const table = new Map<CupTeamKey, StandingRow>()
  for (const key of teamKeys) {
    table.set(key, { teamKey: key, pts: 0, gf: 0, ga: 0 })
  }
  for (const result of results) {
    const home = table.get(result.homeKey)
    const away = table.get(result.awayKey)
    if (!home || !away) continue
    home.gf += result.homeGoals
    home.ga += result.awayGoals
    away.gf += result.awayGoals
    away.ga += result.homeGoals
    if (result.homeGoals > result.awayGoals) home.pts += 3
    else if (result.homeGoals < result.awayGoals) away.pts += 3
    else {
      home.pts += 1
      away.pts += 1
    }
  }
  return [...table.values()].sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      CUP_TEAMS[a.teamKey].name.localeCompare(CUP_TEAMS[b.teamKey].name, 'es-CL'),
  )
}

export function buildFourTeamFinals(table: StandingRow[]): KnockoutResult {
  if (table.length < 4) {
    return {
      ok: false,
      error: 'La tabla Infantil necesita 4 equipos para armar las finales.',
    }
  }
  const [first, second, third, fourth] = table
  return {
    ok: true,
    matches: [
      {
        round: 1,
        slot: 0,
        homeKey: third.teamKey,
        awayKey: fourth.teamKey,
        kind: 'tercer-puesto',
        categoryKey: 'finales',
      },
      {
        round: 1,
        slot: 1,
        homeKey: first.teamKey,
        awayKey: second.teamKey,
        kind: 'final',
        categoryKey: 'finales',
      },
    ],
  }
}

export function buildSixTeamSemis(
  tableA: StandingRow[],
  tableB: StandingRow[],
): KnockoutResult {
  if (tableA.length < 2 || tableB.length < 2) {
    return {
      ok: false,
      error: 'Cada grupo necesita al menos 2 equipos en la tabla para armar semis.',
    }
  }
  return {
    ok: true,
    matches: [
      {
        round: 1,
        slot: 0,
        homeKey: tableA[0].teamKey,
        awayKey: tableB[1].teamKey,
        kind: 'semifinal',
        categoryKey: 'finales',
      },
      {
        round: 1,
        slot: 1,
        homeKey: tableB[0].teamKey,
        awayKey: tableA[1].teamKey,
        kind: 'semifinal',
        categoryKey: 'finales',
      },
    ],
  }
}

function winnerLoser(result: CupResult): {
  winner: CupTeamKey
  loser: CupTeamKey
} | null {
  if (result.homeGoals === result.awayGoals) return null
  if (result.homeGoals > result.awayGoals) {
    return { winner: result.homeKey, loser: result.awayKey }
  }
  return { winner: result.awayKey, loser: result.homeKey }
}

export function buildSixTeamCierre(
  semi1: CupResult,
  semi2: CupResult,
): KnockoutResult {
  const one = winnerLoser(semi1)
  const two = winnerLoser(semi2)
  if (!one || !two) {
    return {
      ok: false,
      error:
        'Las semifinales no pueden ir a finales empatadas. Define un ganador en el marcador.',
    }
  }
  return {
    ok: true,
    matches: [
      {
        round: 1,
        slot: 0,
        homeKey: one.loser,
        awayKey: two.loser,
        kind: 'tercer-puesto',
        categoryKey: 'finales',
      },
      {
        round: 1,
        slot: 1,
        homeKey: one.winner,
        awayKey: two.winner,
        kind: 'final',
        categoryKey: 'finales',
      },
    ],
  }
}

export function detectCupVariantFromCategoryKeys(
  keys: string[],
): CupVariant | null {
  const set = new Set(keys)
  const is4 = set.has('infantil') && set.has('finales') && !set.has('grupo-a')
  const is6 = set.has('grupo-a') && set.has('grupo-b') && set.has('finales')
  if (is4 && !is6) return '4'
  if (is6 && !is4) return '6'
  return null
}

export function requireStartDate(
  args: CupSeedArgs,
): { ok: true; startDate: string } | { ok: false; error: string } {
  if (args.dryRun && !args.startDate) {
    return { ok: true, startDate: '2026-09-05' }
  }
  if (!args.startDate) {
    return { ok: false, error: 'Usa --start=YYYY-MM-DD' }
  }
  return { ok: true, startDate: args.startDate }
}
