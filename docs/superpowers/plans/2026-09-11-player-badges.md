# Player Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatic, event-driven player badges for orgs that enable them — persisted instances, public vitrina, admin catalog, and a recent row on the Los Lunes player card.

**Architecture:** Pure predicate registry + `evaluarBadgesDePartido` over a match snapshot. Prisma stores per-org catalog (`OrgBadge`) and grants (`PlayerBadge`). `reconcileMatchState` evaluates when the match is `FINISHED`. The public page paints DTOs; it does not decide awards.

**Tech Stack:** TypeScript, Vitest, Prisma 7, Next.js App Router, Zod.

**Spec:** `docs/superpowers/specs/2026-09-11-player-badges-design.md`

**Visual:** `docs/superpowers/mocks/2026-09-11-player-badges/badges-galeria.html`

## Global Constraints

- UI copy: español chileno, tú. Voz de camarín: pícara, cálida, nunca humillante.
- Locale: `es-CL`. Timezone: `America/Santiago` (`APP_TIMEZONE`).
- Premios del Camarín (`OrgAward` / `PlayerAward`) no se tocan ni se reutilizan.
- Ningún badge se otorga por usar la app. Predicados `evaluable: false` nunca otorgan.
- Hat-trick y póker pueden ganarse la misma noche.
- Unique `(playerId, orgBadgeId, matchId)`. Umbrales nuevos no reescriben otras fechas.
- Recálculo de un partido: borrar `PlayerBadge` de ese `matchId` y re-evaluar. Excepción `caballero`: ver Task 3.
- `badgesEnabled` default `false`. Prod: prender solo `loslunes` por admin (seed + backfill). Kelme/infantil apagados. No usar este catálogo con menores.
- No importar CSS del mock en `globals.css`. Reutilizar Anton/Barlow de la carta.
- No commitear `.env`, `docs/handoff/`, WIP admin players, cookies, `body.txt`.
- Commits: uno por task.

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/badges/types.ts` | Tipos del motor (match snapshot, history, award) |
| `src/lib/badges/registry.ts` | 34 entradas: copy default, rareza, familia, icono, umbrales, `evaluable`, `repeatable`, `scope` |
| `src/lib/badges/context.ts` | `minutoTotal`, primer tiempo, marcador corrido, lado del jugador |
| `src/lib/badges/predicates.ts` | Predicados puros |
| `src/lib/badges/evaluate.ts` | `evaluarBadgesDePartido` |
| `tests/lib/badges/*.test.ts` | Motor puro |
| `prisma/schema.prisma` | `badgesEnabled`, `OrgBadge`, `PlayerBadge` |
| `prisma/migrations/20260911180000_player_badges/migration.sql` | SQL |
| `src/lib/badges/persist.ts` | Seed, eval+write, backfill |
| `src/lib/match-reconcile.ts` | Gancho FINISHED |
| `src/app/api/org-badges/route.ts` | GET/POST catálogo |
| `src/app/api/org-badges/[id]/route.ts` | PATCH (no DELETE con instancias) |
| `src/app/api/org-badges/settings/route.ts` | `badgesEnabled` |
| `src/lib/tenant-nav.ts` | Item admin Insignias |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/badges/page.tsx` | Admin |
| `src/components/admin/OrgBadgesAdminSection.tsx` | UI admin |
| `src/lib/badges/query.ts` | DTO vitrina |
| `src/components/badges/BadgeVitrina.tsx` | Galería pública |
| `src/components/badges/BadgeDisco.tsx` | Disco + SVG |
| `src/app/(tenant)/[organizationSlug]/jugador/[playerId]/page.tsx` | Carta + vitrina |
| `src/components/player-card/PlayerCard.tsx` | Fila de 4 recientes |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx` | Link “Ver mis insignias” |

---

### Task 1: Tipos, helpers de contexto y registro

**Files:**
- Create: `src/lib/badges/types.ts`
- Create: `src/lib/badges/context.ts`
- Create: `src/lib/badges/registry.ts`
- Create: `tests/lib/badges/context.test.ts`
- Create: `tests/lib/badges/registry.test.ts`

**Interfaces:**
- Consumes: `isScoringGoalEvent` from `src/lib/event-labels.ts`; `cardPositionFromPlayer` from `src/lib/player-card.ts`; `APP_TIMEZONE` from `src/lib/locale.ts`
- Produces: types below; `minutoTotalDePartido`; `minutoPrimerTiempo`; `scoresAfterEvents`; `ladoDeJugador`; `chileYear`; `BADGE_REGISTRY`; `getBadgeDefinition(predicateId)`

```ts
export type BadgeFamily =
  | 'clutch'
  | 'goleador'
  | 'creador'
  | 'muralla'
  | 'constancia'
  | 'camarin'
  | 'hitos'
export type BadgeRarity = 'comun' | 'raro' | 'epico' | 'legendario'
export type BadgeScope = 'match' | 'career' | 'year'
export type BadgeSide = 'A' | 'B'

export type BadgeEvent = {
  id: string
  type: string
  minute: number
  playerId: string | null
  assistPlayerId: string | null
  side: BadgeSide | null
}

export type BadgeRosterRow = {
  playerId: string
  side: BadgeSide
  primaryPosition?: string | null
  position?: string | null
}

export type BadgeMatch = {
  id: string
  scheduledAt: Date
  sideAName: string | null
  sideBName: string | null
  events: BadgeEvent[]
  roster: BadgeRosterRow[]
  mvpPlayerIds: string[]
}

export type BadgeHistory = {
  priorMatches: Array<{
    id: string
    scheduledAt: Date
    played: boolean
    goles: number
    asistencias: number
    amarillas: number
    rojas: number
  }>
  alreadyHasPredicateIds: string[]
  yearHasCaballero: boolean
  yearHasTarjetero: boolean
  laterSameYearExists: boolean
}

export type BadgeCatalogRow = {
  predicateId: string
  thresholds: Record<string, number>
  isActive: boolean
}

export type BadgeAward = {
  predicateId: string
  playerId: string
  context: string
}

export type BadgeDefinition = {
  predicateId: string
  name: string
  description: string
  family: BadgeFamily
  rarity: BadgeRarity
  iconKey: string
  evaluable: boolean
  repeatable: boolean
  scope: BadgeScope
  defaultThresholds: Record<string, number>
}
```

- [ ] **Step 1: Write failing tests**

```ts
// tests/lib/badges/context.test.ts
import { describe, expect, it } from 'vitest'
import {
  chileYear,
  ladoDeJugador,
  minutoPrimerTiempo,
  minutoTotalDePartido,
  scoresAfterEvents,
} from '@/lib/badges/context'

describe('minutoTotalDePartido', () => {
  it('uses FULLTIME minute when present', () => {
    expect(
      minutoTotalDePartido([
        { id: '1', type: 'GOAL', minute: 12, playerId: 'p', assistPlayerId: null, side: 'A' },
        { id: '2', type: 'FULLTIME', minute: 58, playerId: null, assistPlayerId: null, side: null },
      ]),
    ).toBe(58)
  })

  it('floors at 60 when the sheet is short', () => {
    expect(
      minutoTotalDePartido([
        { id: '1', type: 'GOAL', minute: 12, playerId: 'p', assistPlayerId: null, side: 'A' },
      ]),
    ).toBe(60)
  })
})

describe('scoresAfterEvents', () => {
  it('applies own goals to the opposite side', () => {
    const events = [
      { id: '1', type: 'GOAL', minute: 10, playerId: 'a', assistPlayerId: null, side: 'A' as const },
      { id: '2', type: 'OWN_GOAL', minute: 20, playerId: 'a', assistPlayerId: null, side: 'A' as const },
    ]
    const map = scoresAfterEvents(events)
    expect(map.get('1')).toEqual({ a: 1, b: 0 })
    expect(map.get('2')).toEqual({ a: 1, b: 1 })
  })
})

describe('ladoDeJugador', () => {
  it('reads the roster side', () => {
    expect(
      ladoDeJugador(
        [{ playerId: 'p1', side: 'B', primaryPosition: null, position: null }],
        'p1',
      ),
    ).toBe('B')
  })
})

describe('chileYear', () => {
  it('uses America/Santiago', () => {
    expect(chileYear(new Date('2026-01-01T03:00:00.000Z'))).toBe(2025)
  })
})
```

```ts
// tests/lib/badges/registry.test.ts
import { describe, expect, it } from 'vitest'
import { BADGE_REGISTRY, getBadgeDefinition } from '@/lib/badges/registry'

describe('BADGE_REGISTRY', () => {
  it('has 34 unique predicate ids', () => {
    const ids = BADGE_REGISTRY.map((row) => row.predicateId)
    expect(ids).toHaveLength(34)
    expect(new Set(ids).size).toBe(34)
  })

  it('marks unevaluable predicates', () => {
    expect(getBadgeDefinition('de_todos_los_sabores').evaluable).toBe(false)
    expect(getBadgeDefinition('salvador').evaluable).toBe(false)
    expect(getBadgeDefinition('sin_excusas').evaluable).toBe(false)
    expect(getBadgeDefinition('bombero').evaluable).toBe(false)
    expect(getBadgeDefinition('hat_trick').evaluable).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL module not found**

Run: `npx vitest run tests/lib/badges/context.test.ts tests/lib/badges/registry.test.ts`

- [ ] **Step 3: Implement**

`minutoTotalDePartido`: `max(60, max(event.minute), FULLTIME.minute if any, 1)`.

`minutoPrimerTiempo`: HALFTIME.minute if any, else `Math.floor(minutoTotal / 2)`.

`scoresAfterEvents`: for scoring goals (`isScoringGoalEvent`) increment that `side`; for `OWN_GOAL` increment the **opposite** side. Skip events without side. Return `Map<eventId, { a: number; b: number }>`.

`ladoDeJugador(roster, playerId)`: roster find or `null`.

`chileYear(d)`: `Number(new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric' }).format(d))`.

`BADGE_REGISTRY`: one object per spec §6. Unevaluable four: `de_todos_los_sabores`, `salvador`, `sin_excusas`, `bombero`. Use `predicateId: 'kilometrero'` (not `mil_minutos`). Default thresholds exactly as spec (`ultimoPct: 15`, `ganaPor: 1`, `abajoPor` 2/3, `goles` 2/3/4, `minutos: 10`, `asistencias: 3`, `golesRecibidosMax: 1`, `lunesSeguidos` 8/4, `partidos` 100/25, `amarillas: 3`, career 50). `bandeja_de_plata` predicateId as spec (not `mano_a_mano`). `scope`: match for per-game; `career` for hitos + `el_fundador`; `year` for `caballero` and `tarjetero`; constancia rachas are `match` (granted on the closing match of the streak). `repeatable: false` for career/year/hitos and `primer_gol`; `true` for the rest of evaluable match badges including `nunca_falla`/`puntual` (can re-earn on a later streak match — unique per match prevents dup that night).

`getBadgeDefinition(id)`: find or throw.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/lib/badges/context.test.ts tests/lib/badges/registry.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/badges/types.ts src/lib/badges/context.ts src/lib/badges/registry.ts tests/lib/badges/context.test.ts tests/lib/badges/registry.test.ts
git commit -m "feat: add player badge registry and match helpers"
```

---

### Task 2: Predicados de partido + `evaluarBadgesDePartido`

**Files:**
- Create: `src/lib/badges/predicates.ts`
- Create: `src/lib/badges/evaluate.ts`
- Create: `tests/lib/badges/evaluate.test.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: `evaluarBadgesDePartido(match, catalog, historyByPlayerId): BadgeAward[]`

History map: `Record<string, BadgeHistory>` for every roster player (missing key → empty history).

Algorithm:

1. Consider only catalog rows with `isActive` and `getBadgeDefinition(id).evaluable`.
2. Build `scoresAfter`, `minutoTotal`, `primerTiempoHasta`.
3. Final score = last score in map, or `{a:0,b:0}`.
4. For each roster player × each catalog row, if predicate returns `string` context, push award. Skip if `!repeatable && alreadyHasPredicateIds.includes(predicateId)` except `year` scope (handled in Task 3 flags).
5. Own goals never count as `isScoringGoalEvent` for the scorer.

Helper inside predicates.ts:

```ts
export function golesDelJugador(match: BadgeMatch, playerId: string): BadgeEvent[] {
  return match.events.filter(
    (e) => isScoringGoalEvent(e.type as EventType) && e.playerId === playerId,
  )
}
```

- [ ] **Step 1: Write failing tests** (fixture factory in the test file)

```ts
import { describe, expect, it } from 'vitest'
import { evaluarBadgesDePartido } from '@/lib/badges/evaluate'
import { BADGE_REGISTRY } from '@/lib/badges/registry'
import type { BadgeMatch, BadgeCatalogRow } from '@/lib/badges/types'

const catalog: BadgeCatalogRow[] = BADGE_REGISTRY.filter((d) => d.evaluable).map((d) => ({
  predicateId: d.predicateId,
  thresholds: d.defaultThresholds,
  isActive: true,
}))

function emptyHistory() {
  return {
    priorMatches: [],
    alreadyHasPredicateIds: [],
    yearHasCaballero: false,
    yearHasTarjetero: false,
    laterSameYearExists: false,
  }
}

function match(partial: Partial<BadgeMatch> & Pick<BadgeMatch, 'events' | 'roster'>): BadgeMatch {
  return {
    id: 'm1',
    scheduledAt: new Date('2026-09-07T23:30:00.000Z'),
    sideAName: 'Blancos',
    sideBName: 'Negros',
    mvpPlayerIds: [],
    ...partial,
  }
}

describe('evaluarBadgesDePartido', () => {
  it('awards hat_trick at 3 goals and poker at 4 in the same night', () => {
    const m = match({
      roster: [{ playerId: 'opitz', side: 'A' }],
      events: [1, 2, 3, 4].map((n) => ({
        id: `g${n}`,
        type: 'GOAL',
        minute: n * 10,
        playerId: 'opitz',
        assistPlayerId: null,
        side: 'A' as const,
      })),
    })
    const awards = evaluarBadgesDePartido(m, catalog, { opitz: emptyHistory() })
    const ids = awards.filter((a) => a.playerId === 'opitz').map((a) => a.predicateId)
    expect(ids).toContain('hat_trick')
    expect(ids).toContain('poker')
  })

  it('does not count own goals toward hat_trick or primer_gol', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [
        { id: 'o', type: 'OWN_GOAL', minute: 10, playerId: 'p', assistPlayerId: null, side: 'A' },
        { id: 'g', type: 'GOAL', minute: 20, playerId: 'p', assistPlayerId: null, side: 'A' },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, { p: emptyHistory() })
    const ids = awards.map((a) => a.predicateId)
    expect(ids).toContain('en_contra')
    expect(ids).toContain('primer_gol')
    expect(ids).not.toContain('hat_trick')
  })

  it('awards gol_ultima_hora for a 58 min winner at 5-4', () => {
    const m = match({
      roster: [
        { playerId: 'opitz', side: 'A' },
        { playerId: 'x', side: 'B' },
      ],
      events: [
        { id: 'b1', type: 'GOAL', minute: 10, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'b2', type: 'GOAL', minute: 20, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'b3', type: 'GOAL', minute: 25, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'b4', type: 'GOAL', minute: 30, playerId: 'x', assistPlayerId: null, side: 'B' },
        { id: 'a1', type: 'GOAL', minute: 35, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'a2', type: 'GOAL', minute: 40, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'a3', type: 'GOAL', minute: 45, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'a4', type: 'GOAL', minute: 50, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'win', type: 'GOAL', minute: 58, playerId: 'opitz', assistPlayerId: null, side: 'A' },
        { id: 'ft', type: 'FULLTIME', minute: 60, playerId: null, assistPlayerId: null, side: null },
      ],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      opitz: emptyHistory(),
      x: emptyHistory(),
    })
    expect(awards.some((a) => a.playerId === 'opitz' && a.predicateId === 'gol_ultima_hora')).toBe(
      true,
    )
  })

  it('awards el_show to MVPs', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
      mvpPlayerIds: ['p'],
    })
    const awards = evaluarBadgesDePartido(m, catalog, { p: emptyHistory() })
    expect(awards.some((a) => a.predicateId === 'el_show')).toBe(true)
  })

  it('does not award de_todos_los_sabores even if listed active', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
    })
    const awards = evaluarBadgesDePartido(
      m,
      [...catalog, { predicateId: 'de_todos_los_sabores', thresholds: {}, isActive: true }],
      { p: emptyHistory() },
    )
    expect(awards.map((a) => a.predicateId)).not.toContain('de_todos_los_sabores')
  })
})
```

Add asserts in the same file for:

- `abrio_la_lata`: first scoring-goal event author
- `arquitecto`: 3 assists (`assistPlayerId`)
- `taco_de_oro`: ≥1 goal and ≥1 assist
- `bandeja_de_plata`: ≥1 assist
- `sociedad`: 3 assists to the same `playerId`
- `valla_invicta`: only if `cardPositionFromPlayer` is `POR` and opposite side scored 0
- `muro`: POR, side wins, goals against ≤ `golesRecibidosMax`
- inactive catalog row (`isActive: false`) never awards

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/lib/badges/evaluate.test.ts`

- [ ] **Step 3: Implement predicates**

`gol_ultima_hora`: player scoring events where `minute >= minutoTotal * (1 - ultimoPct/100)` AND after that event the player’s side is ahead by exactly `ganaPor` AND final score still has that side winning by exactly `ganaPor`. Context: `` `${minute}' · ${aName} ${a}-${b} ${bName}` ``.

`heroe_remontada`: some scoring involvement (goal or assist) while **before** that event the player’s side trailed by ≥ `abajoPor`; final: player’s side has more goals.

`mano_helada`: scoring goal in last `ultimoCuartoPct`% that breaks a tie (score before event tied; after, player’s side ahead).

`doblete_express`: sort player scoring minutes; any adjacent pair (or first-to-Nth for `goles: 2`) with `min[i+goles-1] - min[i] <= minutos`.

`el_ultimo_en_rendirse`: goal or assist while before-event deficit ≥ `abajoPor`.

`hat_trick` / `poker`: scoring goals count ≥ threshold.

`sentencio`: a scoring goal after which `|a-b| >= diferencia` and player’s side is leading.

`verdugo`: scoring goals ≥ threshold (same night vs the other side — always true in two-side friendlies if they scored N).

`pichanga_limpia`: player’s side wins overall AND conceded 0 goals with `minute <= primerTiempoHasta`. Award to **entire roster of that side**.

`en_contra`: at least one `OWN_GOAL` with `playerId`.

Context helpers: side names `sideAName ?? 'A'`.

`evaluate.ts` loops as specified. Do **not** implement career/year/streak yet (return false / skip those predicateIds unless alreadyHas blocks). Implement match-scoped only in this task; career ones can be stub `return null` so tests that don’t expect them still pass. `primer_gol` **is** match-scoped with career memory: award if scoring goals ≥ 1 and `'primer_gol' not in alreadyHasPredicateIds`. Include `primer_gol` here.

Stubs returning `null`: `nunca_falla`, `puntual`, `todoterreno`, `el_fundador`, `caballero`, `tarjetero`, `club_50`, `centurion_asist`, `kilometrero`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/lib/badges`

- [ ] **Step 5: Commit**

```bash
git add src/lib/badges/predicates.ts src/lib/badges/evaluate.ts tests/lib/badges/evaluate.test.ts
git commit -m "feat: evaluate match-scoped player badges"
```

---

### Task 3: Predicados de racha, carrera y año

**Files:**
- Modify: `src/lib/badges/predicates.ts`
- Modify: `tests/lib/badges/evaluate.test.ts`

**Interfaces:**
- Consumes: `BadgeHistory.priorMatches` chronological ASC **before** this match (this match is **not** included; evaluate must append current stats when computing streaks)
- Produces: remaining predicates implemented (no stubs)

Presence this match: player is on roster.

`nunca_falla` / `puntual`: build flags = `[...prior.played, true]` in scheduled order of prior + current. `trailingStreak` from `src/lib/player-card-window.ts`. Award if streak ≥ threshold.

`todoterreno`: among `priorMatches` + current whose `chileYear-month` equals current match month (format `YYYY-MM` in `APP_TIMEZONE`), every one has `played === true` and there is ≥1 such match. Award on current.

`el_fundador` / `kilometrero`: `careerPjBefore + 1 >= partidos` and not alreadyHas.

`club_50` / `centurion_asist`: `careerGoalsBefore + golesThis` / assists crosses threshold; alreadyHas skips.

`tarjetero`: year yellows (prior in same `chileYear` + this match) ≥ threshold; skip if `yearHasTarjetero`.

`caballero` (excepción): award only if **this match is the last FINISHED of its Chile year in the history the caller provides**. The persist layer (Task 5) must pass `priorMatches` as all other FINISHED in the org, and `evaluate` also receives `isLastFinishedOfChileYear: boolean` on the match **or** history field `laterSameYearExists: boolean`. Add to `BadgeHistory`: `laterSameYearExists: boolean`. Award if `!laterSameYearExists` && year yellows+reds === 0 && year PJ ≥ 1 && `!yearHasCaballero`. If later a card appears, Task 5 deletes caballero rows for that player+year when re-evaluating **any** match of that year (special case, documented in persist).

- [ ] **Step 1: Tests**

```ts
  it('awards nunca_falla on the 8th consecutive presence', () => {
    const prior = Array.from({ length: 7 }, (_, i) => ({
      id: `p${i}`,
      scheduledAt: new Date(`2026-07-0${i + 1}T23:00:00.000Z`),
      played: true,
      goles: 0,
      asistencias: 0,
      amarillas: 0,
      rojas: 0,
    }))
    const m = match({
      id: 'm8',
      roster: [{ playerId: 'p', side: 'A' }],
      events: [],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), priorMatches: prior, laterSameYearExists: true },
    })
    expect(awards.some((a) => a.predicateId === 'nunca_falla')).toBe(true)
  })

  it('awards club_50 when this match crosses 50 career goals', () => {
    const m = match({
      roster: [{ playerId: 'p', side: 'A' }],
      events: [{ id: 'g', type: 'GOAL', minute: 10, playerId: 'p', assistPlayerId: null, side: 'A' }],
    })
    const awards = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), priorMatches: [], alreadyHasPredicateIds: [] },
    })
    // inject careerGoals via priorMatches sums: 49 previous goals
    const prior = [
      {
        id: 'old',
        scheduledAt: new Date('2026-01-05T23:00:00.000Z'),
        played: true,
        goles: 49,
        asistencias: 0,
        amarillas: 0,
        rojas: 0,
      },
    ]
    const awards2 = evaluarBadgesDePartido(m, catalog, {
      p: { ...emptyHistory(), priorMatches: prior },
    })
    expect(awards2.some((a) => a.predicateId === 'club_50')).toBe(true)
    expect(awards.some((a) => a.predicateId === 'club_50')).toBe(false)
  })
```

Fix the first club_50 test: only `awards2` should contain it. Remove the unused `awards` expect-false using empty prior — keep one call with 49 prior goals.

Also test: `caballero` skipped when `laterSameYearExists: true`; granted when false, 0 cards, ≥1 PJ.

- [ ] **Step 2: Run FAIL on stubs**

- [ ] **Step 3: Implement remaining predicates; add `laterSameYearExists` to `BadgeHistory` and `emptyHistory()` in tests**

- [ ] **Step 4: PASS `npx vitest run tests/lib/badges`**

- [ ] **Step 5: Commit**

```bash
git add src/lib/badges tests/lib/badges
git commit -m "feat: evaluate streak career and year player badges"
```

---

### Task 4: Migración Prisma

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260911180000_player_badges/migration.sql`

**Interfaces:**
- Produces: `Organization.badgesEnabled`; models `OrgBadge`, `PlayerBadge`

On `Organization` add:

```
badgesEnabled Boolean @default(false)
orgBadges     OrgBadge[]
playerBadges  PlayerBadge[]
```

On `Player` add `playerBadges PlayerBadge[]`.

On `Match` add `playerBadges PlayerBadge[]`.

```prisma
model OrgBadge {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  predicateId    String
  name           String
  description    String
  family         String
  rarity         String
  iconKey        String
  thresholds     Json
  isActive       Boolean  @default(true)
  sortOrder      Int      @default(0)
  playerBadges   PlayerBadge[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, predicateId])
  @@index([organizationId, sortOrder])
}

model PlayerBadge {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  playerId       String
  player         Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  orgBadgeId     String
  orgBadge       OrgBadge @relation(fields: [orgBadgeId], references: [id], onDelete: Restrict)
  matchId        String
  match          Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  context        String
  awardedAt      DateTime
  createdAt      DateTime @default(now())

  @@unique([playerId, orgBadgeId, matchId])
  @@index([playerId, awardedAt])
  @@index([matchId])
  @@index([organizationId, orgBadgeId])
}
```

SQL: follow `20260903120000_player_awards` style. `thresholds` type `JSONB NOT NULL`. `badgesEnabled BOOLEAN NOT NULL DEFAULT false` on `"Organization"`.

- [ ] **Step 1: Edit schema + write migration.sql by hand (do not rely on `prisma migrate dev` interactive)**

- [ ] **Step 2: `npx prisma generate`**

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260911180000_player_badges/migration.sql
git commit -m "feat: add OrgBadge and PlayerBadge schema"
```

No Vitest here. If generate fails, fix schema.

---

### Task 5: Persistencia, reconcile y backfill

**Files:**
- Create: `src/lib/badges/persist.ts`
- Create: `tests/lib/badges/persist.test.ts`
- Modify: `src/lib/match-reconcile.ts`

**Interfaces:**
- Consumes: `evaluarBadgesDePartido`, `BADGE_REGISTRY`, `db`
- Produces:
  - `seedOrgBadgeCatalog(organizationId: string): Promise<void>`
  - `syncBadgesForFinishedMatch(matchId: string): Promise<void>`
  - `backfillOrgBadges(organizationId: string): Promise<void>`
  - `setOrgBadgesEnabled(organizationId: string, enabled: boolean): Promise<void>`

`syncBadgesForFinishedMatch`:

1. Load match with `organization.badgesEnabled`, `status`, `scheduledAt`, `matchType`, `sideAName`, `sideBName`, `homeTeamId`, `awayTeamId`, events (`id type minute playerId assistPlayerId side teamId`), `friendlyPlayers` (`playerId side player.primaryPosition player.position`), `callUps` (`playerId player.primaryPosition player.position player.teamId`), `teamMvps`.
2. If `!badgesEnabled` or `status !== 'FINISHED'` return.
3. Build `BadgeMatch`: FRIENDLY roster from `friendlyPlayers` (side as `A`/`B`); LEAGUE roster from `callUps` mapping `teamId === homeTeamId` → `A`, away → `B`. Events: FRIENDLY use `side`; LEAGUE map `teamId` to side (own goal side = the team that conceded? keep event.side if set; else map teamId to A/B). Prefer `event.side` when present.
4. Load catalog `OrgBadge` for org.
5. Load all other FINISHED matches of org with roster+event aggregates needed for `BadgeHistory` per player (can query events grouped in JS).
6. `deleteMany({ matchId })` for PlayerBadge.
7. **Caballero special:** for each roster player, if they have yellow or red in this Chile year (prior + this match), `deleteMany` PlayerBadge where `orgBadge.predicateId === 'caballero'` and `awardedAt` in that Chile year (join via orgBadge). Then evaluate.
8. `evaluarBadgesDePartido`.
9. Insert awards: look up `OrgBadge` by predicateId; `awardedAt = match.scheduledAt`; `skipDuplicates` on unique.

`seedOrgBadgeCatalog`: if count org badges > 0 return; else create 34 from registry (`sortOrder` = index).

`setOrgBadgesEnabled`: set flag; if `true`, seed then `backfillOrgBadges`. If `false`, do not delete instances.

`backfillOrgBadges`: all FINISHED of org `orderBy scheduledAt asc`, call `syncBadgesForFinishedMatch` each.

`reconcileMatchState`: after existing FINISHED landing revalidate, `await syncBadgesForFinishedMatch(matchId)`.

- [ ] **Step 1: Persist unit test with `vi.mock('@/lib/db')`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  db: {
    organization: { findUnique: vi.fn(), update: vi.fn() },
    orgBadge: { count: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    playerBadge: { deleteMany: vi.fn(), createMany: vi.fn() },
    match: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { seedOrgBadgeCatalog, setOrgBadgesEnabled } from '@/lib/badges/persist'

describe('seedOrgBadgeCatalog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts 34 rows when empty', async () => {
    vi.mocked(db.orgBadge.count).mockResolvedValue(0)
    vi.mocked(db.orgBadge.createMany).mockResolvedValue({ count: 34 })
    await seedOrgBadgeCatalog('org1')
    expect(db.orgBadge.createMany).toHaveBeenCalled()
    const args = vi.mocked(db.orgBadge.createMany).mock.calls[0]![0] as { data: unknown[] }
    expect(args.data).toHaveLength(34)
  })

  it('skips when catalog exists', async () => {
    vi.mocked(db.orgBadge.count).mockResolvedValue(10)
    await seedOrgBadgeCatalog('org1')
    expect(db.orgBadge.createMany).not.toHaveBeenCalled()
  })
})
```

Also test `syncBadgesForFinishedMatch` returns immediately when `badgesEnabled` is false (mock match findUnique).

- [ ] **Step 2: FAIL then implement persist.ts + reconcile hook**

- [ ] **Step 3: `npx vitest run tests/lib/badges tests/lib/player-card.test.ts`**

- [ ] **Step 4: Commit**

```bash
git add src/lib/badges/persist.ts tests/lib/badges/persist.test.ts src/lib/match-reconcile.ts
git commit -m "feat: persist player badges on finished matches"
```

---

### Task 6: Admin catálogo y flag

**Files:**
- Create: `src/lib/validations/org-badge.ts`
- Create: `src/app/api/org-badges/route.ts`
- Create: `src/app/api/org-badges/[id]/route.ts`
- Create: `src/app/api/org-badges/settings/route.ts`
- Create: `tests/api/org-badges-route.test.ts`
- Create: `src/components/admin/OrgBadgesAdminSection.tsx`
- Create: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/badges/page.tsx`
- Modify: `src/lib/tenant-nav.ts` — item `{ href: base('/admin/badges'), label: 'Insignias', icon: 'IN' }` next to Premios (use `IG` as icon letters if `IN` is Resumen)

**Interfaces:**
- POST body: `{ predicateId: string }` — copies defaults from registry; 409 if unique conflict.
- PATCH id: `{ name?, description?, family?, rarity?, iconKey?, thresholds?, isActive?, sortOrder? }`. If `_count.playerBadges > 0` and client sends delete, there is no DELETE handler that removes rows with grants. Optional DELETE: 409 `{ error: 'No se puede eliminar: ya hay jugadores que la ganaron. Desactívala.' }` when count > 0; if count === 0 allow DELETE.
- PATCH settings: `{ badgesEnabled: boolean }` → `setOrgBadgesEnabled`.

Zod:

```ts
export const createOrgBadgeSchema = z.object({
  predicateId: z.string().min(1),
})
export const updateOrgBadgeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  family: z.enum(['clutch', 'goleador', 'creador', 'muralla', 'constancia', 'camarin', 'hitos']).optional(),
  rarity: z.enum(['comun', 'raro', 'epico', 'legendario']).optional(),
  iconKey: z.string().trim().min(1).optional(),
  thresholds: z.record(z.string(), z.number()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})
export const orgBadgeSettingsSchema = z.object({
  badgesEnabled: z.boolean(),
})
```

Auth: `requireOrgRole([ORG_ADMIN])` like org-awards.

GET returns badges + `_count.playerBadges` + `evaluable` from registry.

Admin UI: switch “Insignias automáticas”; list with active toggle; “Añadir” select of registry ids not yet in org; thresholds as JSON object fields for known keys. Copy: “Se ganan en la cancha. Los premios del camarín se siguen otorgando a mano en Premios.” Badge *Próximamente* if `!evaluable`.

Page: `requireOrganizationId` + load org `badgesEnabled` + `orgBadge.findMany`.

- [ ] **Step 1: API tests** mock persist + db, 403 not needed if we mock requireOrgRole

```ts
vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ organizationId: 'org1' }),
}))
```

POST unknown predicateId → 400. PATCH settings true → calls `setOrgBadgesEnabled`.

- [ ] **Step 2: Implement routes + admin UI + nav**

- [ ] **Step 3: `npx vitest run tests/api/org-badges-route.test.ts tests/lib/badges`**

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations/org-badge.ts src/app/api/org-badges src/components/admin/OrgBadgesAdminSection.tsx "src/app/(tenant)/[organizationSlug]/(dashboard)/admin/badges/page.tsx" src/lib/tenant-nav.ts tests/api/org-badges-route.test.ts
git commit -m "feat: add org badge catalog admin"
```

---

### Task 7: Vitrina pública, carta y panel

**Files:**
- Create: `src/lib/badges/query.ts`
- Create: `src/components/badges/BadgeDisco.tsx`
- Create: `src/components/badges/BadgeVitrina.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/jugador/[playerId]/page.tsx`
- Modify: `src/components/player-card/PlayerCard.tsx`
- Modify: `src/lib/player-card-query.ts` (opcional: incluir `badgesRecientes` en DTO)
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx`
- Create: `tests/lib/badges/query.test.ts`

**Interfaces:**
- Produces: `getPlayerBadgeVitrina(organizationSlug, playerId)` →
  `{ kind: 'ok', vitrina: PlayerBadgeVitrinaDto } | { kind: 'not_found' } | { kind: 'paused' }`
- `PlayerBadgeVitrinaDto`: `{ playerNombre, enabled: true, ganadasDistintas, totalCatalogo, familias: Array<{ family, items: Array<{ predicateId, name, description, rarity, iconKey, locked, proximamente, veces, context: string | null }> }> }`

Locked = `veces === 0 && !proximamente`. Proximamente = `!definition.evaluable`. Veces = count of PlayerBadge for that orgBadge. Context = latest by `awardedAt`.

Page logic:

```
const isLosLunes = organizationSlug === LOSLUNES_SLUG
const card = isLosLunes ? await getLosLunesPlayerCard(playerId) : null
const vitrina = await getPlayerBadgeVitrina(organizationSlug, playerId)

if (isLosLunes && card?.kind === 'ok') show card
if (vitrina.kind === 'ok') show BadgeVitrina
if (!(card?.kind === 'ok') && vitrina.kind !== 'ok') notFound()
```

`getPlayerBadgeVitrina`: player must belong to org slug; org paused → paused; `!badgesEnabled` → `not_found` (so Los Lunes with flag off still shows card-only).

PlayerCard: new optional prop `badges?: Array<{ rarity, iconKey, name }>` max 4. Render a row of `BadgeDisco` size sm under stats, above pie. If empty, omit row.

`getLosLunesPlayerCard`: if org badgesEnabled, attach last 4 grants for that player.

Panel: if `badgesEnabled` (load org flag alongside player), show:

```tsx
<Link href={orgPath(organizationSlug, `/jugador/${player.id}`)} className="text-kelme-red hover:underline">
  Ver mis insignias
</Link>
```

Keep “Ver mi carta” for Los Lunes. Both can show.

`BadgeDisco`: port rarity classes from the mock (comun/raro/epico/legendario/locked). SVGs: copy path data from `badges-galeria.html` into a `ICON_SVG: Record<string, ReactNode>` keyed by `iconKey` from registry. Fallback: simple circle.

Vitrina layout: kicker `Fútbol de los Lunes · Insignias` only if loslunes; else `{orgName} · Insignias`. Title `Se ganan en la cancha`. Legend rarezas. Sections by family labels: Momentos decisivos / Goleador / Creador / Muralla / Constancia — el corazón del club / Camarín — con cariño / Hitos de carrera.

- [ ] **Step 1: query tests** mock db: disabled org → not_found; enabled + player → 34 items, times on granted.

- [ ] **Step 2: Implement query + UI + page gate**

- [ ] **Step 3: `npx vitest run tests/lib/badges tests/api/player-card-route.test.ts tests/api/org-badges-route.test.ts`**

- [ ] **Step 4: Commit**

```bash
git add src/lib/badges/query.ts src/components/badges src/components/player-card/PlayerCard.tsx src/lib/player-card-query.ts "src/app/(tenant)/[organizationSlug]/jugador/[playerId]/page.tsx" "src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx" tests/lib/badges/query.test.ts
git commit -m "feat: render public player badge showcase"
```

---

### Task 8: Verificación y migrate prod (ops, mismo PR)

**Files:** none required unless tests fail.

- [ ] **Step 1: Full badge-related vitest**

Run: `npx vitest run tests/lib/badges tests/api/org-badges-route.test.ts tests/lib/player-card.test.ts tests/api/player-card-route.test.ts tests/lib/proxy-policy.test.ts`

Expected: PASS. Proxy already allows `/{slug}/jugador/{id}` GET.

- [ ] **Step 2: After merge to main**, apply migration:

```bash
node scripts/prisma-migrate-production.mjs deploy
```

Then in prod UI `/loslunes/admin/badges` turn **Insignias automáticas** on (seed 34 + backfill). Do **not** enable kelme.

- [ ] **Step 3: Manual check** `/loslunes/jugador/{opitzId}` shows vitrina under the card; `/kelme/jugador/{any}` still 404; admin Kelme flag off.

No extra commit unless Step 1 forced a fix; if fix needed, commit `fix: player badge verification`.

---

## Self-review vs spec

| Spec | Task |
|------|------|
| Registry 34 + evaluable flag | 1 |
| Helpers minuto/marcador | 1 |
| Match predicates + hat-trick/poker same night | 2 |
| Own goal ≠ gol | 2 |
| Streaks / career / year + caballero exception | 3 |
| Prisma OrgBadge / PlayerBadge / flag | 4 |
| FINISHED sync + backfill + seed | 5 |
| Admin CRUD + no manual grant | 6 |
| Vitrina + locked + Próximamente | 7 |
| Card row 4 + panel link | 7 |
| Solo loslunes enabled in prod, kelme off | 8 |
| Fuera: XP, share PNG, landing fecha, set infantil | ningún task |
