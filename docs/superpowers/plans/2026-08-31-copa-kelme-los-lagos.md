# Copa Kelme Los Lagos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sembrar la Copa Kelme Los Lagos como temporada de fútbol 7 infantil en la org `kelme`, con variante 4 o 6 equipos y finales en categoría aparte.

**Architecture:** Un módulo puro genera fixture, tablas y emparejamientos de knockout. Un script Prisma idempotente (mismo patrón que `scripts/seed-liga-le-park.ts`) crea categorías, clubes, temporada, inscripción vacía y partidos `LEAGUE`. No hay cambio de schema ni UI nueva.

**Tech Stack:** TypeScript, Vitest, Prisma 7, `tsx`, `scheduleInputToIso` (`America/Santiago`).

**Spec:** `docs/superpowers/specs/2026-08-31-copa-kelme-los-lagos-design.md`

## Global Constraints

- UI copy: español chileno, tú (no voseo).
- Fechas/horas de partido: `scheduleInputToIso` + `APP_TIMEZONE` (`America/Santiago`). Nunca armar `Date` naive y guardarlo como UTC sin convertir.
- Org destino: solo `slug: 'kelme'`. No crear org nueva.
- No sembrar Person/Player ficticios.
- No módulo de gastos. No `MatchType` nuevo. No wizard admin.
- No publicar edición móvil.
- Commits: uno por task. No commitear `.env`, `docs/handoff/`, `.superpowers/`, `supabase/.temp/`.
- Eventos árbitro al crear partido: `BASIC_REFEREE_EVENT_TYPES` (gol, amarilla, roja).
- IDs estables con prefijo `ckll-`.
- Nombre de temporada exacto: `Copa Kelme Los Lagos`.

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/copa-kelme-los-lagos.ts` | Constantes, fixture grupos, tablas, knockout, parseo CLI, schedule Chile |
| `tests/lib/copa-kelme-los-lagos.test.ts` | Tests del módulo puro |
| `scripts/seed-copa-kelme-los-lagos.ts` | I/O Prisma: categorías, equipos, temporada, matches |
| `package.json` | Script `db:seed:copa-kelme-los-lagos` |

---

### Task 1: Fixture de grupos / round-robin + CLI + horarios

**Files:**
- Create: `src/lib/copa-kelme-los-lagos.ts`
- Create: `tests/lib/copa-kelme-los-lagos.test.ts`

**Interfaces:**
- Consumes: `scheduleInputToIso` from `src/lib/schedule-datetime.ts`
- Produces: `CupVariant`, `CUP_TEAMS_4`, `CUP_TEAMS_6`, `buildGroupFixture`, `parseCupSeedArgs`, `scheduleCupMatches`, `addDaysIso`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/copa-kelme-los-lagos.test.ts
import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  buildGroupFixture,
  parseCupSeedArgs,
  scheduleCupMatches,
} from '@/lib/copa-kelme-los-lagos'

describe('buildGroupFixture', () => {
  it('builds a 4-team round-robin of 6 matches across 3 rounds', () => {
    const fixture = buildGroupFixture('4')
    expect(fixture.categoryKeys).toEqual(['infantil', 'finales'])
    expect(fixture.teamKeys).toEqual(['colo-colo', 'catolica', 'union', 'fv'])
    expect(fixture.matches).toHaveLength(6)
    expect(fixture.matches.map((m) => [m.round, m.slot, m.homeKey, m.awayKey, m.categoryKey])).toEqual([
      [1, 0, 'colo-colo', 'catolica', 'infantil'],
      [1, 1, 'union', 'fv', 'infantil'],
      [2, 0, 'colo-colo', 'union', 'infantil'],
      [2, 1, 'catolica', 'fv', 'infantil'],
      [3, 0, 'colo-colo', 'fv', 'infantil'],
      [3, 1, 'catolica', 'union', 'infantil'],
    ])
  })

  it('builds 6-team groups of 3 with 3 rounds and a bye per group', () => {
    const fixture = buildGroupFixture('6')
    expect(fixture.categoryKeys).toEqual(['grupo-a', 'grupo-b', 'finales'])
    expect(fixture.teamKeys).toEqual([
      'colo-colo',
      'catolica',
      'union',
      'fv',
      'austral',
      'club-6',
    ])
    expect(fixture.matches).toHaveLength(6)
    expect(fixture.matches.map((m) => [m.round, m.slot, m.homeKey, m.awayKey, m.categoryKey])).toEqual([
      [1, 0, 'colo-colo', 'catolica', 'grupo-a'],
      [1, 1, 'fv', 'austral', 'grupo-b'],
      [2, 0, 'colo-colo', 'union', 'grupo-a'],
      [2, 1, 'fv', 'club-6', 'grupo-b'],
      [3, 0, 'catolica', 'union', 'grupo-a'],
      [3, 1, 'austral', 'club-6', 'grupo-b'],
    ])
  })
})

describe('parseCupSeedArgs', () => {
  it('requires variant', () => {
    expect(parseCupSeedArgs(['--phase=grupos', '--start=2026-09-05'])).toEqual({
      ok: false,
      error: 'Usa --variant=4 o --variant=6',
    })
  })

  it('parses variant 4 grupos with start date', () => {
    expect(parseCupSeedArgs(['--variant=4', '--start=2026-09-05'])).toEqual({
      ok: true,
      value: {
        variant: '4',
        phase: 'grupos',
        startDate: '2026-09-05',
        venue: 'Por confirmar',
        dryRun: false,
        resetMatches: false,
      },
    })
  })

  it('parses dry-run, venue and finales', () => {
    expect(
      parseCupSeedArgs([
        '--variant=6',
        '--phase=finales',
        '--start=2026-09-26',
        '--venue=Cancha Municipal',
        '--dry-run',
        '--reset-matches',
      ]),
    ).toEqual({
      ok: true,
      value: {
        variant: '6',
        phase: 'finales',
        startDate: '2026-09-26',
        venue: 'Cancha Municipal',
        dryRun: true,
        resetMatches: true,
      },
    })
  })
})

describe('scheduleCupMatches', () => {
  it('places round 2 seven days later at 11:15 Chile', () => {
    const fixture = buildGroupFixture('4')
    const scheduled = scheduleCupMatches(fixture.matches, '2026-09-05')
    const round2Slot1 = scheduled.find((m) => m.round === 2 && m.slot === 1)
    expect(round2Slot1?.scheduledAt).toBe('2026-09-12T14:15:00.000Z')
  })
})

describe('addDaysIso', () => {
  it('adds 7 days without shifting the calendar day', () => {
    expect(addDaysIso('2026-09-05', 7)).toBe('2026-09-12')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts`

Expected: FAIL — `Cannot find module '@/lib/copa-kelme-los-lagos'`

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

Continuar el mismo archivo `copa-kelme-los-lagos.ts`:

```ts
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
```

Chile en septiembre 2026 está en UTC−3, así que 11:15 del 12-09 es `2026-09-12T14:15:00.000Z`. Si el test de horario falla por un día de cambio DST, ajustar el expected al ISO que imprima `scheduleInputToIso('2026-09-12', '11:15')` en consola; no inventar un offset.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/copa-kelme-los-lagos.ts tests/lib/copa-kelme-los-lagos.test.ts
git commit -m "$(cat <<'EOF'
feat: generate Kelme Los Lagos 4- and 6-team group fixtures

EOF
)"
```

---

### Task 2: Tablas y emparejamientos de finales

**Files:**
- Modify: `src/lib/copa-kelme-los-lagos.ts`
- Modify: `tests/lib/copa-kelme-los-lagos.test.ts`

**Interfaces:**
- Consumes: `CupTeamKey`, `CUP_TEAMS_4` from Task 1
- Produces: `tableFromResults`, `buildFourTeamFinals`, `buildSixTeamSemis`, `buildSixTeamCierre`, `KnockoutMatch`

- [ ] **Step 1: Write the failing tests** (append to the same test file)

```ts
import { APP_LOCALE } from '@/lib/locale'
import {
  buildFourTeamFinals,
  buildSixTeamCierre,
  buildSixTeamSemis,
  tableFromResults,
} from '@/lib/copa-kelme-los-lagos'

describe('tableFromResults', () => {
  it('ranks by points, then goal difference, then goals for', () => {
    const table = tableFromResults(['colo-colo', 'catolica', 'union', 'fv'], [
      { homeKey: 'colo-colo', awayKey: 'catolica', homeGoals: 2, awayGoals: 0 },
      { homeKey: 'union', awayKey: 'fv', homeGoals: 1, awayGoals: 1 },
      { homeKey: 'colo-colo', awayKey: 'union', homeGoals: 0, awayGoals: 0 },
      { homeKey: 'catolica', awayKey: 'fv', homeGoals: 3, awayGoals: 0 },
    ])
    expect(table.map((row) => row.teamKey)).toEqual([
      'colo-colo',
      'catolica',
      'union',
      'fv',
    ])
    expect(table[0]).toMatchObject({ pts: 4, gf: 2, ga: 0 })
    expect(table[1]).toMatchObject({ pts: 3, gf: 3, ga: 2 })
  })
})

describe('buildFourTeamFinals', () => {
  it('pairs 1st vs 2nd in the final and 3rd vs 4th for third place', () => {
    const table = [
      { teamKey: 'colo-colo' as const, pts: 9, gf: 6, ga: 1 },
      { teamKey: 'catolica' as const, pts: 6, gf: 4, ga: 3 },
      { teamKey: 'union' as const, pts: 3, gf: 2, ga: 4 },
      { teamKey: 'fv' as const, pts: 0, gf: 1, ga: 5 },
    ]
    expect(buildFourTeamFinals(table)).toEqual({
      ok: true,
      matches: [
        {
          round: 1,
          slot: 0,
          homeKey: 'union',
          awayKey: 'fv',
          kind: 'tercer-puesto',
          categoryKey: 'finales',
        },
        {
          round: 1,
          slot: 1,
          homeKey: 'colo-colo',
          awayKey: 'catolica',
          kind: 'final',
          categoryKey: 'finales',
        },
      ],
    })
  })

  it('rejects a short table', () => {
    expect(buildFourTeamFinals([{ teamKey: 'colo-colo', pts: 3, gf: 1, ga: 0 }])).toEqual({
      ok: false,
      error: 'La tabla Infantil necesita 4 equipos para armar las finales.',
    })
  })
})

describe('buildSixTeamSemis', () => {
  it('pairs 1st A vs 2nd B and 1st B vs 2nd A', () => {
    const tableA = [
      { teamKey: 'colo-colo' as const, pts: 6, gf: 4, ga: 1 },
      { teamKey: 'catolica' as const, pts: 3, gf: 2, ga: 2 },
      { teamKey: 'union' as const, pts: 0, gf: 0, ga: 3 },
    ]
    const tableB = [
      { teamKey: 'fv' as const, pts: 6, gf: 5, ga: 1 },
      { teamKey: 'austral' as const, pts: 3, gf: 2, ga: 3 },
      { teamKey: 'club-6' as const, pts: 0, gf: 1, ga: 4 },
    ]
    expect(buildSixTeamSemis(tableA, tableB)).toEqual({
      ok: true,
      matches: [
        {
          round: 1,
          slot: 0,
          homeKey: 'colo-colo',
          awayKey: 'austral',
          kind: 'semifinal',
          categoryKey: 'finales',
        },
        {
          round: 1,
          slot: 1,
          homeKey: 'fv',
          awayKey: 'catolica',
          kind: 'semifinal',
          categoryKey: 'finales',
        },
      ],
    })
  })
})

describe('buildSixTeamCierre', () => {
  it('sends losers to third place and winners to the final', () => {
    expect(
      buildSixTeamCierre(
        { homeKey: 'colo-colo', awayKey: 'austral', homeGoals: 2, awayGoals: 1 },
        { homeKey: 'fv', awayKey: 'catolica', homeGoals: 0, awayGoals: 3 },
      ),
    ).toEqual({
      ok: true,
      matches: [
        {
          round: 1,
          slot: 0,
          homeKey: 'austral',
          awayKey: 'fv',
          kind: 'tercer-puesto',
          categoryKey: 'finales',
        },
        {
          round: 1,
          slot: 1,
          homeKey: 'colo-colo',
          awayKey: 'catolica',
          kind: 'final',
          categoryKey: 'finales',
        },
      ],
    })
  })

  it('rejects a drawn semi', () => {
    expect(
      buildSixTeamCierre(
        { homeKey: 'colo-colo', awayKey: 'austral', homeGoals: 1, awayGoals: 1 },
        { homeKey: 'fv', awayKey: 'catolica', homeGoals: 2, awayGoals: 0 },
      ),
    ).toEqual({
      ok: false,
      error: 'Las semifinales no pueden ir a finales empatadas. Define un ganador en el marcador.',
    })
  })
})
```

Quitar el import de `APP_LOCALE` si no se usa en el test (el sort vive en el módulo).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts`

Expected: FAIL — `tableFromResults is not a function`

- [ ] **Step 3: Write minimal implementation** (append to `src/lib/copa-kelme-los-lagos.ts`)

```ts
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
```

En el test de `tableFromResults`, Colo Colo tiene 4 pts (win + draw) y Católica 3 (un win). Unión 2 pts (draw+draw) y FV 1 (draw+loss): 1-1 vs Unión y 0-3 vs Católica. Recalcular: Unión 1-1 y 0-0 = 2 pts; FV 1-1 y 0-3 = 1 pt. El expected `[colo-colo, catolica, union, fv]` es correcto. Pts de colo-colo: 3+1=4, gf 2, ga 0. Católica: 3 pts, gf 3, ga 2. OK.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/copa-kelme-los-lagos.ts tests/lib/copa-kelme-los-lagos.test.ts
git commit -m "$(cat <<'EOF'
feat: pair Kelme Los Lagos finals from group tables

EOF
)"
```

---

### Task 3: Seed Prisma fase grupos

**Files:**
- Create: `scripts/seed-copa-kelme-los-lagos.ts`
- Modify: `package.json` (script npm)

**Interfaces:**
- Consumes: Task 1 `buildGroupFixture`, `parseCupSeedArgs`, `scheduleCupMatches`, `CUP_*` constants; `createPrismaClient` from `prisma/lib/db-client.ts`; `deriveTeamColor`; `buildMatchLocationFields`; `BASIC_REFEREE_EVENT_TYPES`
- Produces: CLI que persiste temporada + 6 partidos de grupos cuando `--phase=grupos`

- [ ] **Step 1: Write a failing unit test for variant lock** (append)

El seed habla con DB; no se testea Prisma aquí. Añadir helper puro `detectCupVariantFromCategoryKeys` para no mezclar 4 y 6:

```ts
// tests — append
import { detectCupVariantFromCategoryKeys } from '@/lib/copa-kelme-los-lagos'

describe('detectCupVariantFromCategoryKeys', () => {
  it('detects 4 and 6 from category keys', () => {
    expect(detectCupVariantFromCategoryKeys(['infantil', 'finales'])).toBe('4')
    expect(detectCupVariantFromCategoryKeys(['grupo-a', 'grupo-b', 'finales'])).toBe('6')
    expect(detectCupVariantFromCategoryKeys(['infantil', 'grupo-a', 'finales'])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts -t detectCupVariant`

Expected: FAIL — function not exported

- [ ] **Step 3: Implement helper + seed**

```ts
// append in src/lib/copa-kelme-los-lagos.ts
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
```

Crear `scripts/seed-copa-kelme-los-lagos.ts`:

```ts
#!/usr/bin/env tsx
import 'dotenv/config'
import { FootballFormat, MatchStatus, MatchType } from '@prisma/client'
import { createPrismaClient } from '../prisma/lib/db-client'
import { buildMatchLocationFields } from '../src/lib/match-location'
import { BASIC_REFEREE_EVENT_TYPES } from '../src/lib/match-referee-event-presets'
import { deriveTeamColor } from '../src/lib/team-color'
import {
  CUP_CATEGORIES,
  CUP_COMMUNE_CODE,
  CUP_FOOTBALL_FORMAT,
  CUP_ORG_SLUG,
  CUP_REGION_CODE,
  CUP_SEASON_NAME,
  CUP_TEAMS,
  buildFourTeamFinals,
  buildGroupFixture,
  buildSixTeamCierre,
  buildSixTeamSemis,
  detectCupVariantFromCategoryKeys,
  parseCupSeedArgs,
  requireStartDate,
  scheduleCupMatches,
  tableFromResults,
  type CupCategoryKey,
  type CupTeamKey,
} from '../src/lib/copa-kelme-los-lagos'

const { prisma, pool } = createPrismaClient()

function categoryKeysForVariant(variant: '4' | '6'): CupCategoryKey[] {
  return variant === '4'
    ? ['infantil', 'finales']
    : ['grupo-a', 'grupo-b', 'finales']
}

async function ensureCategory(
  organizationId: string,
  key: CupCategoryKey,
) {
  const def = CUP_CATEGORIES[key]
  const byId = await prisma.friendlyCategory.findUnique({ where: { id: def.id } })
  if (byId) {
    return prisma.friendlyCategory.update({
      where: { id: def.id },
      data: { name: def.name, isActive: true, organizationId },
    })
  }
  const byName = await prisma.friendlyCategory.findFirst({
    where: { organizationId, name: def.name },
  })
  if (byName) return byName
  return prisma.friendlyCategory.create({
    data: {
      id: def.id,
      organizationId,
      name: def.name,
      description: 'Copa Kelme Los Lagos — infantil fútbol 7',
      isActive: true,
    },
  })
}

async function ensureTeam(organizationId: string, key: CupTeamKey) {
  const def = CUP_TEAMS[key]
  const byName = await prisma.team.findFirst({
    where: { organizationId, name: def.name },
  })
  if (byName) return byName
  const color = deriveTeamColor(def.name)
  return prisma.team.upsert({
    where: { id: def.id },
    update: { name: def.name, organizationId, color },
    create: { id: def.id, name: def.name, organizationId, color },
  })
}

async function enrollTeams(
  seasonId: string,
  seasonCategoryId: string,
  categoryId: string,
  teamIds: { teamId: string; displayName: string; color: string | null }[],
) {
  for (const [index, team] of teamIds.entries()) {
    await prisma.seasonTeam.upsert({
      where: {
        seasonCategoryId_teamId: {
          seasonCategoryId,
          teamId: team.teamId,
        },
      },
      create: {
        seasonId,
        seasonCategoryId,
        teamId: team.teamId,
        displayName: team.displayName,
        color: team.color,
        status: 'REGISTERED',
        sortOrder: index,
      },
      update: {
        displayName: team.displayName,
        status: 'REGISTERED',
        sortOrder: index,
      },
    })
  }
  void categoryId
}

async function seedGrupos(args: {
  organizationId: string
  variant: '4' | '6'
  startDate: string
  venue: string
  dryRun: boolean
  resetMatches: boolean
}) {
  const fixture = buildGroupFixture(args.variant)
  const scheduled = scheduleCupMatches(fixture.matches, args.startDate)
  if (args.dryRun) {
    console.log(`DRY-RUN grupos variant=${args.variant} start=${args.startDate}`)
    for (const match of scheduled) {
      console.log(
        `  J${match.round} ${match.scheduledAt} ${CUP_TEAMS[match.homeKey].name} vs ${CUP_TEAMS[match.awayKey].name} [${match.categoryKey}]`,
      )
    }
    return
  }

  const location = buildMatchLocationFields({
    regionCode: CUP_REGION_CODE,
    communeCode: CUP_COMMUNE_CODE,
  })
  if ('error' in location) throw new Error(location.error)

  const categoryByKey = new Map<CupCategoryKey, { id: string }>()
  for (const key of fixture.categoryKeys) {
    categoryByKey.set(key, await ensureCategory(args.organizationId, key))
  }

  const teamByKey = new Map<CupTeamKey, { id: string; name: string; color: string | null }>()
  for (const key of fixture.teamKeys) {
    const team = await ensureTeam(args.organizationId, key)
    teamByKey.set(key, team)
  }

  let season = await prisma.season.findFirst({
    where: { organizationId: args.organizationId, name: CUP_SEASON_NAME },
    include: { seasonCategories: { include: { category: true } } },
  })

  if (season) {
    const existingKeys = season.seasonCategories.map((sc) => {
      const found = (Object.values(CUP_CATEGORIES) as { id: string; key: CupCategoryKey }[]).find(
        (c) => c.id === sc.categoryId || c.name === sc.category.name,
      )
      return found?.key ?? sc.category.name
    })
    const mapped = existingKeys.filter((k): k is CupCategoryKey =>
      k === 'infantil' || k === 'grupo-a' || k === 'grupo-b' || k === 'finales',
    )
    const detected = detectCupVariantFromCategoryKeys(mapped)
    if (detected && detected !== args.variant) {
      throw new Error(
        `La temporada "${CUP_SEASON_NAME}" ya existe como variant=${detected}. No mezclar con --variant=${args.variant}.`,
      )
    }
  } else {
    season = await prisma.season.create({
      data: {
        organizationId: args.organizationId,
        name: CUP_SEASON_NAME,
        startDate: new Date(`${args.startDate}T12:00:00-03:00`),
        endDate: new Date(
          `${scheduled[scheduled.length - 1]!.scheduledAt.slice(0, 10)}T12:00:00-03:00`,
        ),
        footballFormat: FootballFormat.FUTBOL_7,
        seasonCategories: {
          create: fixture.categoryKeys.map((key, sortOrder) => ({
            categoryId: categoryByKey.get(key)!.id,
            sortOrder,
          })),
        },
      },
      include: { seasonCategories: { include: { category: true } } },
    })
  }

  const seasonCategoryByKey = new Map<CupCategoryKey, string>()
  for (const sc of season.seasonCategories) {
    const def = Object.values(CUP_CATEGORIES).find(
      (c) => c.id === sc.categoryId || c.name === sc.category.name,
    )
    if (def) seasonCategoryByKey.set(def.key, sc.id)
  }

  const groupKeys = fixture.categoryKeys.filter((k) => k !== 'finales')
  for (const key of groupKeys) {
    const scId = seasonCategoryByKey.get(key)
    const catId = categoryByKey.get(key)?.id
    if (!scId || !catId) throw new Error(`Falta SeasonCategory ${key}`)
    const keysForCat = fixture.matches
      .filter((m) => m.categoryKey === key)
      .flatMap((m) => [m.homeKey, m.awayKey])
    const uniqueKeys = [...new Set(keysForCat)]
    await enrollTeams(
      season.id,
      scId,
      catId,
      uniqueKeys.map((k) => {
        const team = teamByKey.get(k)!
        return { teamId: team.id, displayName: team.name, color: team.color }
      }),
    )
  }

  const finalesSc = seasonCategoryByKey.get('finales')
  const finalesCat = categoryByKey.get('finales')
  if (finalesSc && finalesCat) {
    await enrollTeams(
      season.id,
      finalesSc,
      finalesCat.id,
      fixture.teamKeys.map((k) => {
        const team = teamByKey.get(k)!
        return { teamId: team.id, displayName: team.name, color: team.color }
      }),
    )
  }

  if (args.resetMatches) {
    await prisma.match.deleteMany({
      where: {
        seasonId: season.id,
        status: MatchStatus.SCHEDULED,
        matchType: MatchType.LEAGUE,
      },
    })
  }

  let created = 0
  let skipped = 0
  for (const match of scheduled) {
    const home = teamByKey.get(match.homeKey)!
    const away = teamByKey.get(match.awayKey)!
    const seasonCategoryId = seasonCategoryByKey.get(match.categoryKey)!
    const existing = await prisma.match.findFirst({
      where: {
        seasonId: season.id,
        seasonCategoryId,
        homeTeamId: home.id,
        awayTeamId: away.id,
      },
    })
    if (existing) {
      skipped += 1
      continue
    }
    await prisma.match.create({
      data: {
        organizationId: args.organizationId,
        matchType: MatchType.LEAGUE,
        seasonId: season.id,
        seasonCategoryId,
        footballFormat: FootballFormat[CUP_FOOTBALL_FORMAT],
        homeTeamId: home.id,
        awayTeamId: away.id,
        scheduledAt: new Date(match.scheduledAt),
        venue: args.venue,
        refereeEventTypes: [...BASIC_REFEREE_EVENT_TYPES],
        ...location,
      },
    })
    created += 1
  }

  console.log(`✅ Grupos listos (${args.variant} equipos)`)
  console.log(`   Temporada: ${CUP_SEASON_NAME}`)
  console.log(`   Partidos creados: ${created} · omitidos: ${skipped}`)
  console.log(`   Admin: /kelme/admin/matches?season=${season.id}`)
}

async function main() {
  const parsed = parseCupSeedArgs(process.argv.slice(2))
  if (!parsed.ok) {
    console.error(parsed.error)
    process.exit(1)
  }
  const start = requireStartDate(parsed.value)
  if (!start.ok) {
    console.error(start.error)
    process.exit(1)
  }

  const org = await prisma.organization.findUnique({ where: { slug: CUP_ORG_SLUG } })
  if (!org) {
    throw new Error('No existe la org kelme. Corre npm run db:ensure:kelme')
  }

  if (parsed.value.phase === 'grupos') {
    await seedGrupos({
      organizationId: org.id,
      variant: parsed.value.variant,
      startDate: start.startDate,
      venue: parsed.value.venue,
      dryRun: parsed.value.dryRun,
      resetMatches: parsed.value.resetMatches,
    })
    return
  }

  console.log('Fase finales: implementar en Task 4')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
```

En `package.json`, junto a los otros `db:seed:*`:

```json
"db:seed:copa-kelme-los-lagos": "tsx scripts/seed-copa-kelme-los-lagos.ts"
```

**No** usar `T12:00:00-03:00` si se puede evitar: `startDate`/`endDate` de `Season` son fechas de temporada, no kickoff. Preferir:

```ts
startDate: new Date(scheduleInputToIso(args.startDate, '12:00')),
endDate: new Date(
  scheduleInputToIso(addDaysIso(args.startDate, 21), '12:00'),
),
```

Importar `addDaysIso` y `scheduleInputToIso` en el script. Variante 4: 3 fechas grupos (+7×2) = +14 días de grupos; dejar `endDate` en +35 días para cubrir finales.

- [ ] **Step 4: Run tests and dry-run**

Run:

```bash
npx vitest run tests/lib/copa-kelme-los-lagos.test.ts
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=4 --phase=grupos --start=2026-09-05 --dry-run
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=6 --phase=grupos --start=2026-09-05 --dry-run
```

Expected: tests PASS; dry-run imprime 6 partidos en cada variante **sin** tocar DB.

Si hay org `kelme` local y `DATABASE_URL` apunta a local (nunca prod salvo que el usuario lo pida):

```bash
npx tsx scripts/seed-copa-kelme-los-lagos.ts --variant=4 --phase=grupos --start=2026-09-05
```

Expected: temporada en `/kelme/admin`, 6 partidos, planteles vacíos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copa-kelme-los-lagos.ts tests/lib/copa-kelme-los-lagos.test.ts scripts/seed-copa-kelme-los-lagos.ts package.json
git commit -m "$(cat <<'EOF'
feat: seed Kelme Los Lagos group stage into kelme season

EOF
)"
```

---

### Task 4: Seed fase finales

**Files:**
- Modify: `scripts/seed-copa-kelme-los-lagos.ts`
- Modify: `tests/lib/copa-kelme-los-lagos.test.ts` (solo si se extrae un helper de “qué fase toca”)

**Interfaces:**
- Consumes: `buildFourTeamFinals`, `buildSixTeamSemis`, `buildSixTeamCierre`, `tableFromResults`
- Produces: `--phase=finales` crea 3.º+final (4) o semis/cierre (6) según partidos `FINISHED`

- [ ] **Step 1: Write the failing test for next knockout stage**

```ts
import { nextFinalesAction } from '@/lib/copa-kelme-los-lagos'

describe('nextFinalesAction', () => {
  it('asks for 4-team finals when all group matches are finished and none in finales', () => {
    expect(
      nextFinalesAction({
        variant: '4',
        groupFinished: true,
        finalesFinishedCount: 0,
        finalesTotalCount: 0,
      }),
    ).toBe('four-finals')
  })

  it('asks for 6-team semis when groups are done and finales empty', () => {
    expect(
      nextFinalesAction({
        variant: '6',
        groupFinished: true,
        finalesFinishedCount: 0,
        finalesTotalCount: 0,
      }),
    ).toBe('six-semis')
  })

  it('asks for 6-team cierre when two semis are finished', () => {
    expect(
      nextFinalesAction({
        variant: '6',
        groupFinished: true,
        finalesFinishedCount: 2,
        finalesTotalCount: 2,
      }),
    ).toBe('six-cierre')
  })

  it('waits if groups are not finished', () => {
    expect(
      nextFinalesAction({
        variant: '4',
        groupFinished: false,
        finalesFinishedCount: 0,
        finalesTotalCount: 0,
      }),
    ).toBe('wait-groups')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts -t nextFinalesAction`

Expected: FAIL — not exported

- [ ] **Step 3: Implement helper and wire seed**

```ts
export type FinalesAction =
  | 'wait-groups'
  | 'four-finals'
  | 'six-semis'
  | 'six-cierre'
  | 'done'

export function nextFinalesAction(input: {
  variant: CupVariant
  groupFinished: boolean
  finalesFinishedCount: number
  finalesTotalCount: number
}): FinalesAction {
  if (!input.groupFinished) return 'wait-groups'
  if (input.variant === '4') {
    if (input.finalesTotalCount === 0) return 'four-finals'
    return 'done'
  }
  if (input.finalesTotalCount === 0) return 'six-semis'
  if (input.finalesTotalCount === 2 && input.finalesFinishedCount === 2) {
    return 'six-cierre'
  }
  if (input.finalesTotalCount >= 4) return 'done'
  return 'wait-groups'
}
```

En el seed, reemplazar el `console.log('Fase finales...')` con `seedFinales`:

1. Cargar temporada `Copa Kelme Los Lagos` + `seasonCategories` + matches LEAGUE.
2. Mapear `teamId` → `CupTeamKey` recorriendo `CUP_TEAMS` / equipos asegurados por nombre.
3. `groupFinished`: todos los partidos cuyo `seasonCategory` no es Finales están `FINISHED`. Si no hay 6 de grupos, error.
4. Contar partidos de categoría Finales (`finalesTotalCount`, `finalesFinishedCount`).
5. `action = nextFinalesAction(...)`.
6. Si `wait-groups`: `console.error` y `exit 1` con “Faltan partidos de grupos por finalizar.”
7. Si `done`: imprimir “Finales ya están creadas” y salir 0.
8. Construir `KnockoutMatch[]`:
   - `four-finals`: `tableFromResults` con los 4 keys y resultados de Infantil → `buildFourTeamFinals`.
   - `six-semis`: tablas A y B por separado → `buildSixTeamSemis`.
   - `six-cierre`: los 2 partidos Finales `FINISHED` como `CupResult` (home/away goals desde `homeScore`/`awayScore` del `Match`) → `buildSixTeamCierre`.
9. `scheduleCupMatches` no acepta `KnockoutMatch` hoy. Añadir overload o mapear a `{ round, slot, homeKey, awayKey, categoryKey: 'grupo-a' }` **no**. Mejor:

```ts
export function scheduleKnockoutMatches(
  matches: KnockoutMatch[],
  firstDate: string,
): Array<KnockoutMatch & { scheduledAt: string }> {
  return matches.map((match) => ({
    ...match,
    scheduledAt: scheduleInputToIso(
      addDaysIso(firstDate, (match.round - 1) * 7),
      CUP_KICKOFF_SLOTS[match.slot],
    ),
  }))
}
```

Test mínimo: `scheduleKnockoutMatches` + `--start` de finales. Añadirlo en el mismo archivo de tests si se implementa.

10. Dry-run: imprimir los partidos de finales y return.
11. Persistencia: igual que grupos (`findFirst` duplicado home/away/category Finales). `venue` y location iguales.

Scores: en Prisma `Match` tiene `homeScore` y `awayScore` (enteros). Usarlos solo si `status === FINISHED`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts`

Expected: PASS

Dry-run finales sin grupos terminados no aplica (no toca DB). Verificar con código que `nextFinalesAction` cubre los 4 casos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copa-kelme-los-lagos.ts tests/lib/copa-kelme-los-lagos.test.ts scripts/seed-copa-kelme-los-lagos.ts
git commit -m "$(cat <<'EOF'
feat: seed Kelme Los Lagos finals after finished group matches

EOF
)"
```

---

### Task 5: Verificación local y copy de uso

**Files:**
- Modify: `scripts/seed-copa-kelme-los-lagos.ts` (mensaje final de ops si aún no lista los 7 pasos)

**Interfaces:**
- Consumes: script de Tasks 3–4
- Produces: comando npm usable y mensaje post-seed con URLs

- [ ] **Step 1: Confirm npm script exists**

En `package.json` debe quedar:

```json
"db:seed:copa-kelme-los-lagos": "tsx scripts/seed-copa-kelme-los-lagos.ts"
```

Al final de un seed exitoso (no dry-run), imprimir:

```
Siguiente:
1. /kelme/admin/teams — renombra placeholders y sube escudos
2. /kelme/admin/players — alta de niños + categoría de copa
3. Inscripción de plantel en la temporada
4. Ajusta fecha/hora/cancha y árbitro en partidos
5. Cuando termine la fase: npm run db:seed:copa-kelme-los-lagos -- --variant=4 --phase=finales --start=YYYY-MM-DD
```

(PowerShell: el `--` extra es obligatorio para pasar flags al script.)

- [ ] **Step 2: Run the full unit suite for this feature**

Run: `npx vitest run tests/lib/copa-kelme-los-lagos.test.ts`

Expected: PASS, 0 failed

- [ ] **Step 3: Dry-run both variants**

Run:

```bash
npm run db:seed:copa-kelme-los-lagos -- --variant=4 --phase=grupos --start=2026-09-05 --dry-run
npm run db:seed:copa-kelme-los-lagos -- --variant=6 --phase=grupos --start=2026-09-05 --dry-run
```

Expected: 6 líneas de partido cada una; sin inserts.

- [ ] **Step 4: Optional local seed (only if DATABASE_URL is local kelme)**

No correr contra prod en este task. Si el entorno es local:

```bash
npm run db:seed:copa-kelme-los-lagos -- --variant=4 --phase=grupos --start=2026-09-05
```

Abrir `/kelme/admin` → temporada **Copa Kelme Los Lagos**, tabla Infantil, 6 programados. No deben aparecer 15 jugadores demo por club.

- [ ] **Step 5: Commit** (solo si el mensaje ops cambió código)

```bash
git add scripts/seed-copa-kelme-los-lagos.ts package.json
git commit -m "$(cat <<'EOF'
docs: print Kelme Los Lagos admin next steps after cup seed

EOF
)"
```

Si no hay diff, no commitear.

---

## Ops después de implementar (no es código)

Elegir **4 o 6** recién al sembrar (`--variant`). Renombrar Club 6 / Colo Colo / etc. en admin. Cargar niños a mano. Finanzas siguen en el Excel. No publicar mobile hasta que la copa tenga planteles reales.

## Self-review

1. **Spec coverage:** 4/6, kelme, infantil F7, grupos+finales, sin niños fake, sin UI, sin hoja 6 FECHAS, Puerto Varas, seed idempotente — Tasks 1–5.
2. **Placeholders:** sin TBD. Fechas de ejemplo `2026-09-05` son CLI, no hardcode de prod.
3. **Types:** `CupVariant`, `GroupMatch`, `KnockoutMatch`, `parseCupSeedArgs` `{ ok, value|error }` consistentes entre tasks.
