# Dashboard de analítica por empresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar `/{slug}/admin/estadisticas`, un muro de operación + palmarés + clima por período, sin tocar el home de admin salvo un link.

**Architecture:** Helpers puros en `src/lib/admin-analytics.ts` (testeables) + loader que lee partidos/roster/eventos/MVP de la org + `GET /api/admin/analytics` + cliente que pinta el muro. Un fetch, query `period=7|30|90|all` (default 30).

**Tech Stack:** Next.js 16 App Router, Prisma 7, Vitest, Tailwind v4 (Cancha de noche). Sin librería de charts.

**Spec:** `docs/superpowers/specs/2026-08-24-org-analytics-dashboard-design.md`

## Global Constraints

- UI y copy en español chileno (`es-CL`), tuteo, constante `APP_LOCALE` / `APP_TIMEZONE` (`America/Santiago`).
- No nueva dependencia npm (gráficos = CSS/SVG).
- No migración de schema. Solo lectura de `Match`, `FriendlyMatchPlayer`, `CallUp`, `MatchEvent`, `MatchTeamMvp`.
- Rankings por eventos/roster/MVP del período — nunca `Player.goals`.
- Clima: `formatMatchWeather` de `src/lib/match-weather.ts` (no fetch en vivo).
- Auth: `requireOrgRoleForSlug(org, [ORG_ADMIN])` (incluye bypass de platform admin).
- Cap: 200 partidos más recientes; `truncated: true` si se corta.
- Bloques con array vacío no se renderizan (no tablas huecas).
- El home `/{slug}/admin` no se rediseña; solo se agrega el link “Ver estadísticas”.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/admin-analytics.ts` | Tipos, helpers puros, `getOrgAnalyticsDashboard` |
| `tests/lib/admin-analytics.test.ts` | Unit de helpers |
| `src/app/api/admin/analytics/route.ts` | GET auth + period |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/estadisticas/page.tsx` | Página |
| `src/components/admin/AdminAnalyticsClient.tsx` | Fetch, skeleton, error |
| `src/components/admin/AdminAnalyticsHome.tsx` | Muro |
| `src/lib/tenant-nav.ts` | Item Estadísticas |
| `src/components/admin/AdminDashboardHome.tsx` | Link “Ver estadísticas” |
| `tests/lib/admin-nav.test.ts` | Aserción del link en nav |

---

### Task 1: Helpers de período, cobro, cap y clima

**Files:**
- Create: `src/lib/admin-analytics.ts`
- Test: `tests/lib/admin-analytics.test.ts`

**Interfaces:**
- Consumes: `scheduleInputToIso`, `formatScheduleDateInput` de `src/lib/schedule-datetime.ts`; `APP_TIMEZONE` de `src/lib/locale.ts`
- Produces:
  - `export type AnalyticsPeriod = '7' | '30' | '90' | 'all'`
  - `export function resolveAnalyticsPeriod(raw: string | null | undefined, now?: Date): { period: AnalyticsPeriod; from: Date | null; label: string }`
  - `export function paidRate(paidCount: number, total: number): number | null`
  - `export function applyMatchCap<T>(matches: T[], cap?: number): { rows: T[]; truncated: boolean }`
  - `export function shouldShowBlock(rows: readonly unknown[]): boolean`
  - `export function weatherPeriodSummary(snapshots: Array<{ weatherTempC: number | null; weatherLabel: string | null }>): AnalyticsWeatherPeriod | null`
  - `export type AnalyticsWeatherPeriod = { avgTempC: number; minTempC: number; maxTempC: number; topLabels: string[] }`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/admin-analytics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  applyMatchCap,
  paidRate,
  resolveAnalyticsPeriod,
  shouldShowBlock,
  weatherPeriodSummary,
} from '@/lib/admin-analytics'

describe('resolveAnalyticsPeriod', () => {
  const now = new Date('2026-08-24T16:00:00.000Z')

  it('defaults invalid period to 30', () => {
    const resolved = resolveAnalyticsPeriod('foo', now)
    expect(resolved.period).toBe('30')
    expect(resolved.from).not.toBeNull()
    expect(resolved.label).toBe('últimos 30 días')
  })

  it('returns null from for all', () => {
    const resolved = resolveAnalyticsPeriod('all', now)
    expect(resolved.period).toBe('all')
    expect(resolved.from).toBeNull()
    expect(resolved.label).toBe('todo el historial')
  })
})

describe('paidRate', () => {
  it('returns 75 for 3/4', () => {
    expect(paidRate(3, 4)).toBe(75)
  })

  it('returns null when total is 0', () => {
    expect(paidRate(0, 0)).toBeNull()
  })
})

describe('applyMatchCap', () => {
  it('keeps 200 most recent and flags truncated', () => {
    const matches = Array.from({ length: 201 }, (_, i) => ({ id: i }))
    const result = applyMatchCap(matches, 200)
    expect(result.rows).toHaveLength(200)
    expect(result.truncated).toBe(true)
  })
})

describe('shouldShowBlock', () => {
  it('hides empty rankings', () => {
    expect(shouldShowBlock([])).toBe(false)
    expect(shouldShowBlock([{ playerId: 'p1' }])).toBe(true)
  })
})

describe('weatherPeriodSummary', () => {
  it('returns null with fewer than 2 snapshots', () => {
    expect(weatherPeriodSummary([{ weatherTempC: 14, weatherLabel: 'Nublado' }])).toBeNull()
    expect(weatherPeriodSummary([])).toBeNull()
  })

  it('computes min max avg and top labels', () => {
    const summary = weatherPeriodSummary([
      { weatherTempC: 10, weatherLabel: 'Lluvia' },
      { weatherTempC: 20, weatherLabel: 'Despejado' },
      { weatherTempC: 12, weatherLabel: 'Lluvia' },
    ])
    expect(summary).toEqual({
      avgTempC: 14,
      minTempC: 10,
      maxTempC: 20,
      topLabels: ['Lluvia', 'Despejado'],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/admin-analytics.test.ts`

Expected: FAIL — cannot find module `@/lib/admin-analytics`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/admin-analytics.ts` with the types from the spec plus these helpers. For `from`, use `formatScheduleDateInput` on `now` minus N days, then `scheduleInputToIso(date, '00:00')` so el corte es inicio de día en `America/Santiago`.

```ts
import { formatScheduleDateInput, scheduleInputToIso } from '@/lib/schedule-datetime'

export type AnalyticsPeriod = '7' | '30' | '90' | 'all'

export type AnalyticsWeatherPeriod = {
  avgTempC: number
  minTempC: number
  maxTempC: number
  topLabels: string[]
}

const PERIOD_DAYS: Record<Exclude<AnalyticsPeriod, 'all'>, number> = {
  '7': 7,
  '30': 30,
  '90': 90,
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7': 'últimos 7 días',
  '30': 'últimos 30 días',
  '90': 'últimos 90 días',
  all: 'todo el historial',
}

export function resolveAnalyticsPeriod(
  raw: string | null | undefined,
  now = new Date(),
): { period: AnalyticsPeriod; from: Date | null; label: string } {
  const period: AnalyticsPeriod =
    raw === '7' || raw === '30' || raw === '90' || raw === 'all' ? raw : '30'
  if (period === 'all') {
    return { period, from: null, label: PERIOD_LABELS.all }
  }
  const shifted = new Date(now.getTime() - PERIOD_DAYS[period] * 86_400_000)
  const from = new Date(scheduleInputToIso(formatScheduleDateInput(shifted), '00:00'))
  return { period, from, label: PERIOD_LABELS[period] }
}

export function paidRate(paidCount: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((paidCount / total) * 100)
}

export function applyMatchCap<T>(matches: T[], cap = 200): { rows: T[]; truncated: boolean } {
  if (matches.length <= cap) return { rows: matches, truncated: false }
  return { rows: matches.slice(0, cap), truncated: true }
}

export function shouldShowBlock(rows: readonly unknown[]): boolean {
  return rows.length > 0
}

export function weatherPeriodSummary(
  snapshots: Array<{ weatherTempC: number | null; weatherLabel: string | null }>,
): AnalyticsWeatherPeriod | null {
  const usable = snapshots.filter(
    (s): s is { weatherTempC: number; weatherLabel: string } =>
      s.weatherTempC != null && Boolean(s.weatherLabel),
  )
  if (usable.length < 2) return null
  const temps = usable.map((s) => s.weatherTempC)
  const avgTempC = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
  const counts = new Map<string, number>()
  for (const s of usable) counts.set(s.weatherLabel, (counts.get(s.weatherLabel) ?? 0) + 1)
  const topLabels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, 2)
    .map(([label]) => label)
  return {
    avgTempC,
    minTempC: Math.min(...temps),
    maxTempC: Math.max(...temps),
    topLabels,
  }
}
```

`applyMatchCap` asume que el caller ya ordenó por `scheduledAt` desc (el loader lo hará). El test de 201 items usa `slice(0, 200)` — coherente.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/admin-analytics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-analytics.ts tests/lib/admin-analytics.test.ts
git commit -m "feat: helpers de periodo, cobro y clima para analitica admin"
```

---

### Task 2: Rankings por eventos y apariciones

**Files:**
- Modify: `src/lib/admin-analytics.ts`
- Test: `tests/lib/admin-analytics.test.ts`

**Interfaces:**
- Consumes: `shouldShowBlock` de Task 1
- Produces:
  - `export type AnalyticsPersonStat = { playerId: string; name: string; value: number; meta: string }`
  - `export function rankByCount(counts: Map<string, { name: string; value: number; meta?: string }>, take?: number): AnalyticsPersonStat[]`
  - `export function tallyGoalEvents(events: Array<{ type: string; playerId: string | null; assistPlayerId?: string | null; playerName?: string | null; assistName?: string | null }>): { scorers: AnalyticsPersonStat[]; assists: AnalyticsPersonStat[] }`

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/admin-analytics.test.ts`:

```ts
import { rankByCount, tallyGoalEvents } from '@/lib/admin-analytics'

describe('tallyGoalEvents', () => {
  it('counts GOAL only and ignores OWN_GOAL', () => {
    const { scorers, assists } = tallyGoalEvents([
      { type: 'GOAL', playerId: 'p1', assistPlayerId: 'p2', playerName: 'Ana', assistName: 'Ben' },
      { type: 'GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'OWN_GOAL', playerId: 'p1', playerName: 'Ana' },
      { type: 'YELLOW_CARD', playerId: 'p1', playerName: 'Ana' },
    ])
    expect(scorers).toEqual([{ playerId: 'p1', name: 'Ana', value: 2, meta: '' }])
    expect(assists).toEqual([{ playerId: 'p2', name: 'Ben', value: 1, meta: '' }])
  })
})

describe('rankByCount', () => {
  it('sorts desc and takes 8', () => {
    const counts = new Map(
      Array.from({ length: 9 }, (_, i) => [
        `p${i}`,
        { name: `J${i}`, value: i, meta: '' },
      ]),
    )
    const ranked = rankByCount(counts, 8)
    expect(ranked).toHaveLength(8)
    expect(ranked[0]?.playerId).toBe('p8')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/admin-analytics.test.ts`

Expected: FAIL — `tallyGoalEvents` / `rankByCount` not exported

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/admin-analytics.ts`:

```ts
export type AnalyticsPersonStat = {
  playerId: string
  name: string
  value: number
  meta: string
}

export function rankByCount(
  counts: Map<string, { name: string; value: number; meta?: string }>,
  take = 8,
): AnalyticsPersonStat[] {
  return [...counts.entries()]
    .map(([playerId, row]) => ({
      playerId,
      name: row.name,
      value: row.value,
      meta: row.meta ?? '',
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, take)
}

function bump(
  map: Map<string, { name: string; value: number; meta?: string }>,
  playerId: string | null | undefined,
  name: string | null | undefined,
) {
  if (!playerId) return
  const current = map.get(playerId) ?? { name: name ?? 'Jugador', value: 0, meta: '' }
  current.value += 1
  if (name) current.name = name
  map.set(playerId, current)
}

export function tallyGoalEvents(
  events: Array<{
    type: string
    playerId: string | null
    assistPlayerId?: string | null
    playerName?: string | null
    assistName?: string | null
  }>,
): { scorers: AnalyticsPersonStat[]; assists: AnalyticsPersonStat[] } {
  const goals = new Map<string, { name: string; value: number; meta?: string }>()
  const assists = new Map<string, { name: string; value: number; meta?: string }>()
  for (const event of events) {
    if (event.type !== 'GOAL') continue
    bump(goals, event.playerId, event.playerName)
    bump(assists, event.assistPlayerId, event.assistName)
  }
  return { scorers: rankByCount(goals), assists: rankByCount(assists) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/admin-analytics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-analytics.ts tests/lib/admin-analytics.test.ts
git commit -m "feat: ranking de goles y asistencias por eventos del periodo"
```

---

### Task 3: Loader `getOrgAnalyticsDashboard`

**Files:**
- Modify: `src/lib/admin-analytics.ts`

**Interfaces:**
- Consumes: helpers de Task 1–2; `db` de `@/lib/db`; `playerDisplayName` de `@/lib/person-name`; `matchDisplayName` de `@/lib/match-label`; `formatMatchWeather` de `@/lib/match-weather`; `formatScheduleDateLabel` + `formatScheduleTimeLabel` de `@/lib/schedule-datetime`
- Produces: `export async function getOrgAnalyticsDashboard(organizationId: string, periodRaw?: string | null): Promise<OrgAnalyticsDashboard>`

Tipos a agregar en el mismo archivo (spec §6): `OrgAnalyticsDashboard`, `AnalyticsKpi`, `AnalyticsNextMatch`, `AnalyticsPendingItem`, `AnalyticsWeekBucket`.

- [ ] **Step 1: Add remaining types and weekly helper (test first)**

Append test:

```ts
import { buildWeeklyBuckets } from '@/lib/admin-analytics'

describe('buildWeeklyBuckets', () => {
  it('hides when only one week has data', () => {
    const buckets = buildWeeklyBuckets(
      [{ scheduledAt: new Date('2026-08-10T20:00:00.000Z'), goals: 3, finished: true }],
      new Date('2026-08-24T16:00:00.000Z'),
    )
    expect(buckets.length).toBeLessThan(2)
  })

  it('groups two weeks', () => {
    const buckets = buildWeeklyBuckets(
      [
        { scheduledAt: new Date('2026-08-03T20:00:00.000Z'), goals: 2, finished: true },
        { scheduledAt: new Date('2026-08-17T20:00:00.000Z'), goals: 4, finished: true },
      ],
      new Date('2026-08-24T16:00:00.000Z'),
    )
    expect(buckets.length).toBeGreaterThanOrEqual(2)
    expect(buckets.reduce((n, b) => n + b.matches, 0)).toBe(2)
  })
})
```

`buildWeeklyBuckets` agrupa por semana ISO en `APP_TIMEZONE`. Label: `12–18 ago` vía `Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: APP_TIMEZONE })`. Solo cuenta partidos `finished` para goles; `matches` cuenta todos. Devuelve buckets ordenados cronológicamente; el caller oculta si `length < 2`.

- [ ] **Step 2: Run weekly test — fail then implement `buildWeeklyBuckets` until PASS**

- [ ] **Step 3: Implement `getOrgAnalyticsDashboard`**

Algoritmo (una pasada, sin N+1):

1. `resolveAnalyticsPeriod(periodRaw)`.
2. `db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } })`.
3. `db.match.findMany` where `{ organizationId, scheduledAt: from ? { gte: from } : undefined }`, `orderBy: { scheduledAt: 'desc' }`, `take: 201` (para detectar truncate). Include:
   - `homeTeam: { select: { id, name } }`, `awayTeam: { select: { id, name } }`
   - `friendlyPlayers: { select: { playerId, side, paid, isGalleta, isCoach, player: { include: { person: { include: { user: { select: { name: true } } } } } } }`
   - `callUps: { select: { playerId, player: { include: { person: { include: { user: { select: { name: true } } } } } } }`
   - `events: { select: { type, playerId, assistPlayerId, player: { include: { person: { include: { user: { select: { name: true } } } } }, assistPlayer: { include: { person: { include: { user: { select: { name: true } } } } } } }`
   - `teamMvps: { select: { playerId, player: { include: { person: { include: { user: { select: { name: true } } } } } } }`
   - campos Match: `id, matchType, status, scheduledAt, venue, communeName, homeScore, awayScore, sideAName, sideBName, refereeId, weatherTempC, weatherHumidityPct, weatherWindKmh, weatherLabel`
4. `applyMatchCap(matches, 200)`.
5. Query aparte **próximo partido** (fuera del período OK):

```ts
const next = await db.match.findFirst({
  where: { organizationId, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
  orderBy: { scheduledAt: 'asc' },
  include: { /* same weather + roster + names */ },
})
```

6. Agregar en memoria:
   - KPIs: FINISHED vs SCHEDULED/LIVE/HALFTIME; convocatorias = friendlyPlayers.length + callUps.length; cobro via `paidRate` o card “Jugadores distintos”; goles = suma scores FINISHED.
   - `unpaid`: `paid=false` agrupado por `playerId`, top 8, `meta` = “N partidos”.
   - `pending`:
     - danger: N amistosos del período sin `isCoach` → href `/admin/matches`
     - warn: N sin sede (`!venue && !communeName`) → `/admin/matches`
     - warn: N FINISHED sin MVP con `playerId` → `/admin/matches`
   - Rankings: `tallyGoalEvents` (nombres con `playerDisplayName`); apariciones (union matchId+playerId); galleta; coaches; mvp; cards (`YELLOW_CARD` + `RED_CARD`).
   - `weekly`: `buildWeeklyBuckets`.
   - `weatherPeriod`: `weatherPeriodSummary` sobre el set capado.
   - `league.visible` si algún `matchType === 'LEAGUE'`. Standings: 3 pts victoria / 1 empate sobre FINISHED liga del set; top 8 por pts. Scorers liga = mismos eventos filtrados a esos match ids.
   - `nextMatch`: `matchDisplayName`, `when` = `${formatScheduleDateLabel} · ${formatScheduleTimeLabel}`, `weatherLine` = `formatMatchWeather(next)` (null → UI “Sin clima (falta comuna)”).

7. Return `OrgAnalyticsDashboard` con `matchCount`, `truncated`, `periodLabel`.

No exportar queries sueltas. Si no hay org, `findUniqueOrThrow` basta (la API ya autenticó).

- [ ] **Step 4: Typecheck the new exports**

Run: `npx vitest run tests/lib/admin-analytics.test.ts`

Expected: PASS (helpers). El loader no tiene test de DB en v1.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-analytics.ts tests/lib/admin-analytics.test.ts
git commit -m "feat: loader de analitica admin por periodo"
```

---

### Task 4: `GET /api/admin/analytics`

**Files:**
- Create: `src/app/api/admin/analytics/route.ts`

**Interfaces:**
- Consumes: `getOrgAnalyticsDashboard(organizationId, periodRaw)`
- Produces: JSON `OrgAnalyticsDashboard` o errores 400/401/403/500

- [ ] **Step 1: Implement the route** (no test de API en v1; mismo patrón que `src/app/api/admin/dashboard/route.ts`)

```ts
import { NextResponse } from 'next/server'
import { requireOrgRoleForSlug } from '@/lib/tenant-access'
import { MembershipRole } from '@/lib/membership-role'
import { getOrgAnalyticsDashboard } from '@/lib/admin-analytics'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const organizationSlug = url.searchParams.get('org')
    const period = url.searchParams.get('period')

    if (!organizationSlug) {
      return NextResponse.json({ error: 'Organización requerida' }, { status: 400 })
    }

    const { organizationId } = await requireOrgRoleForSlug(organizationSlug, [
      MembershipRole.ORG_ADMIN,
    ])

    const data = await getOrgAnalyticsDashboard(organizationId, period)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Forbidden') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    console.error('[admin/analytics]', err)
    return NextResponse.json(
      { error: 'No se pudieron cargar las estadísticas' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/analytics/route.ts
git commit -m "feat: endpoint GET /api/admin/analytics"
```

---

### Task 5: Página y muro UI

**Files:**
- Create: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/estadisticas/page.tsx`
- Create: `src/components/admin/AdminAnalyticsClient.tsx`
- Create: `src/components/admin/AdminAnalyticsHome.tsx`
- Create: `src/components/admin/AdminAnalyticsSkeleton.tsx` (opcional; se puede reusar `AdminDashboardSkeleton` si el layout calza — si no, un skeleton de 4 KPI + 2 columnas)

**Interfaces:**
- Consumes: `OrgAnalyticsDashboard`, `shouldShowBlock`
- Produces: UI en `/{slug}/admin/estadisticas?period=`

- [ ] **Step 1: Page**

```tsx
import { Suspense } from 'react'
import { AdminAnalyticsClient } from '@/components/admin/AdminAnalyticsClient'
import { AdminDashboardSkeleton } from '@/components/admin/AdminDashboardSkeleton'

export const dynamic = 'force-dynamic'

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminAnalyticsClient />
    </Suspense>
  )
}
```

- [ ] **Step 2: Client fetch**

Copiar la estructura de `src/components/admin/AdminDashboardClient.tsx`:

- `useSearchParams().get('period')`
- URL: `/api/admin/analytics?org=${organizationSlug}&period=${period || '30'}`
- timeout 25 s, `cache: 'no-store'`
- estados loading / error (“No pudimos cargar las estadísticas”, botón Reintentar, link login si 401) / success → `<AdminAnalyticsHome data={data} />`

- [ ] **Step 3: Home muro**

`AdminAnalyticsHome` usa `DashPageHeader` (`eyebrow="Analítica"`, `title="Estadísticas"`).

**Selector de período:** cuatro links o botones que navegan a `orgPath(\`/admin/estadisticas?period=${p}\`)` con `useOrgPath`. Activo: underline / `bg-org-primary`. Labels: `7 días`, `30 días`, `90 días`, `Todo`.

**Subtítulo:** `${data.organizationName} · ${data.periodLabel} · ${data.matchCount} partidos`. Si `truncated`, línea extra: `Mostrando los 200 partidos más recientes`.

**Empty:** si `data.matchCount === 0`, no pintar KPI/tablas. Card:

```
No hay partidos en estos N días
```

(`N` = 7/30/90 o “en el historial” si `all`) + link `orgPath('/admin/matches')` “Ir a partidos”. Sí se puede mostrar `nextMatch` si existe.

**KPI grid:** `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`, cards como el home (`border-[#2A3A32] bg-[#121A18]`, `font-data` para el número).

**Operación:** `grid gap-4 lg:grid-cols-2`.
- Next match card → `Link` a `orgPath(\`/live/${id}\`)`. Si `weatherLine` es null: “Sin clima (falta comuna)”.
- Pendientes: `tone === 'danger'` punto `#b91c1c`, `warn` `#f59e0b`. Impagos: lista top 8, link `orgPath('/admin/players')`.

**Tendencia:** si `data.weekly.length >= 2`, barras CSS. Alto relativo a `max(matches, 1)`. Dos series (partidos / goles) o una barra apilada simple. `font-data` en el número.

**Clima período:** si `data.weatherPeriod`, tres números (promedio / min / max) + chips de `topLabels`.

**Palmarés:** `grid gap-4 md:grid-cols-2`. Componente local `RankingTable({ title, rows })` que retorna `null` si `!shouldShowBlock(rows)`. Cada fila `Link` a `orgPath('/admin/players')`. Títulos: Goleadores, Asistencias, Más partidos, Galleta, MVP, DTs, Fair play.

**Liga:** si `data.league.visible`, panel “Liga en el período” con tabla pts/GF/GC + goleadores.

Tokens: `#0B1210` `#121A18` `#2A3A32` `#E8E4D8` `#8A938C`. No `bg-red-100`.

- [ ] **Step 4: Smoke typecheck**

Run: `npx vitest run tests/lib/admin-analytics.test.ts`

Expected: PASS. Si el IDE marca imports, corregir antes del commit.

- [ ] **Step 5: Commit**

```bash
git add src/app/(tenant)/[organizationSlug]/(dashboard)/admin/estadisticas/page.tsx src/components/admin/AdminAnalyticsClient.tsx src/components/admin/AdminAnalyticsHome.tsx src/components/admin/AdminAnalyticsSkeleton.tsx
git commit -m "feat: pagina admin de estadisticas por empresa"
```

---

### Task 6: Nav + link en el home

**Files:**
- Modify: `src/lib/tenant-nav.ts` (función `adminNavGroups`, primer grupo “Administración”)
- Modify: `src/components/admin/AdminDashboardHome.tsx`
- Modify: `tests/lib/admin-nav.test.ts`

**Interfaces:**
- Consumes: `orgPath` / `useOrgPath`
- Produces: item nav `Estadísticas` → `/{slug}/admin/estadisticas`; botón en home

- [ ] **Step 1: Write the failing nav test**

Append to `tests/lib/admin-nav.test.ts`:

```ts
  it('links Estadísticas in the admin group', () => {
    const navSource = readFileSync(
      resolve(process.cwd(), 'src/lib/tenant-nav.ts'),
      'utf8',
    )
    expect(navSource).toContain("base('/admin/estadisticas')")
    expect(navSource).toContain("label: 'Estadísticas'")
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/admin-nav.test.ts`

Expected: FAIL — string not found

- [ ] **Step 3: Add nav item**

In `adminNavGroups`, grupo Administración:

```ts
{
  label: 'Administración',
  items: [
    { href: base('/admin'), label: 'Resumen', icon: 'IN' },
    {
      href: base('/admin/estadisticas'),
      label: 'Estadísticas',
      icon: 'ES',
      activePrefixes: [base('/admin/estadisticas')],
    },
  ],
},
```

- [ ] **Step 4: Home link**

In `AdminDashboardHome`, junto a “Exportar”:

```tsx
<Link
  href={orgPath('/admin/estadisticas')}
  className="inline-flex h-[42px] items-center rounded-xl border border-[#2A3A32] bg-transparent px-4 font-ui text-sm font-bold text-[#E8E4D8] hover:bg-[#121A18]"
>
  Ver estadísticas
</Link>
```

No cambiar KPIs ni `AdminDashboardPanels`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/lib/admin-nav.test.ts tests/lib/admin-analytics.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/tenant-nav.ts src/components/admin/AdminDashboardHome.tsx tests/lib/admin-nav.test.ts
git commit -m "feat: acceso a estadisticas desde nav y home admin"
```

---

### Task 7: Verificación manual (Los Lunes)

**Files:** ninguno nuevo.

- [ ] **Step 1: Login como platform admin, Ingresar a `loslunes`**

- [ ] **Step 2: Abrir `/loslunes/admin/estadisticas`**

Comprobar:
- Default 30 días con KPIs de amistosos (cobro visible).
- Selector 7 / 90 / Todo cambia subtítulo y números.
- Próximo partido muestra clima o “Sin clima (falta comuna)”.
- Palmarés no usa goles de ficha (`Player.goals`); un DT/galleta aparece si hay flags.
- Bloque Liga **no** aparece si no hay `LEAGUE`.
- Nav “Estadísticas” queda activo.

- [ ] **Step 3: Abrir `/kelme/admin/estadisticas` (o liga-demo)**

Comprobar: card cobro se reemplaza por jugadores distintos si no hay roster amistoso; bloque Liga visible si hay partidos liga en el período.

- [ ] **Step 4: Empty state**

`?period=7` en una org sin partidos recientes → copy + link a partidos. No crash.

Si algo falla, fix + commit en esta misma task:

```bash
git add -u
git commit -m "fix: ajustes analitica admin tras verificacion"
```

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| Página `/{slug}/admin/estadisticas` | 5 |
| Nav Estadísticas | 6 |
| GET `/api/admin/analytics` + auth | 4 |
| `getOrgAnalyticsDashboard` | 3 |
| Period 7/30/90/all, default 30, Santiago | 1, 3 |
| Cap 200 + `truncated` | 1, 3, 5 |
| KPIs, operación, tendencia, palmarés, liga condicional | 3, 5 |
| Clima próximo + período | 1, 3, 5 |
| Rankings por eventos (no `Player.goals`) | 2, 3 |
| Ocultar bloques vacíos | 1, 5 |
| Link home “Ver estadísticas” | 6 |
| Tests helper (period, paid, goals, empty, weather, cap) | 1, 2 |
| Sin fetch clima en vivo, sin charts lib, sin CSV | Global |

No quedan requisitos de la spec sin task.
