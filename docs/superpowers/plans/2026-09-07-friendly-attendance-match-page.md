# Friendly attendance match page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El admin crea el amistoso vacío, cada partido tiene `/{slug}/partidos/[id]` pública (encabezado + ¿Quién va?), y después arma equipos partiendo de los que anotaron (puede sumar extras).

**Architecture:** `MatchAttendance` sigue siendo RSVP. `FriendlyMatchPlayer` solo aparece al editar. Create intra omite `players`. Página SSR nueva + proxy público. Landing/panel dejan de montar el board y muestran tarjetas. El asignador admin ordena anotados primero.

**Tech Stack:** Next.js 16 App Router · Prisma 7 · Zod · Vitest · Auth.js

## Global Constraints

- UI y textos: español chileno (tú). Copy de asistencia sin cambio.
- Commits: uno por task. No commitear `.env*`, `docs/handoff/`, `.superpowers/`, `supabase/.temp/`.
- Desafíos (`createFriendlyChallenge`) **no** cambian: siguen exigiendo roster del lado A.
- Liga: `/{slug}/partidos/[id]` → 404.
- Voy **no** crea `FriendlyMatchPlayer`.
- Auth de mutación: org desde `match.organizationId`, no cookie.
- No importar `db` en `'use client'`.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/match-attendance.ts` | Path público, orden de roster por anotados |
| `src/lib/validations/match.ts` | Create intra con `players` vacío |
| `src/app/api/matches/route.ts` | Crear amistoso sin `createMany` si no hay players |
| `src/components/admin/match-create/FriendlyMatchCreateWizard.tsx` | Intra: omitir convocatoria |
| `src/lib/proxy-policy.ts` | GET/HEAD `/{slug}/partidos/:id` público |
| `src/lib/friendly-match-page.ts` | Loader SSR de la página pública |
| `src/app/(tenant)/[organizationSlug]/partidos/[matchId]/page.tsx` | Página encabezado + board |
| `src/components/marketing/FriendlyAttendanceCards.tsx` | Tarjetas landing (sin board) |
| `src/components/marketing/OrgPublicLanding.tsx` | Usa tarjetas |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx` | Links, no board |
| `src/components/admin/FriendlyMatchTeamAssigner.tsx` | Badge “Va” + orden |
| `src/components/admin/MatchActions.tsx` | Pasa IDs anotados al asignador |
| `src/components/admin/AdminMatchCard.tsx` | Link “Ver lista” |
| `tests/lib/match-attendance.test.ts` | Path + orden |
| `tests/lib/validations-match-create-friendly.test.ts` | Create vacío / update extras |
| `tests/lib/proxy-policy.test.ts` | Ruta pública |

---

### Task 1: Helpers de path y orden

**Files:**
- Modify: `src/lib/match-attendance.ts`
- Test: `tests/lib/match-attendance.test.ts`

**Interfaces:**
- `export function friendlyMatchPublicPath(slug: string, matchId: string): string`
- `export function orderRosterByAttendance<T extends { id: string }>(players: T[], attendingPlayerIds: string[]): T[]`

- [ ] **Step 1: Write the failing test**

En `tests/lib/match-attendance.test.ts` agregar:

```ts
import {
  friendlyMatchPublicPath,
  orderRosterByAttendance,
} from '@/lib/match-attendance'

describe('friendlyMatchPublicPath', () => {
  it('builds the public match page path', () => {
    expect(friendlyMatchPublicPath('loslunes', 'm1')).toBe('/loslunes/partidos/m1')
  })
})

describe('orderRosterByAttendance', () => {
  it('puts attendees first in createdAt order, then the rest', () => {
    const players = [{ id: 'c' }, { id: 'a' }, { id: 'b' }, { id: 'd' }]
    expect(orderRosterByAttendance(players, ['a', 'b']).map((row) => row.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/match-attendance.test.ts -t "friendlyMatchPublicPath"`

Expected: FAIL — exports missing.

- [ ] **Step 3: Write minimal implementation**

Al final de `src/lib/match-attendance.ts`:

```ts
export function friendlyMatchPublicPath(slug: string, matchId: string): string {
  return `/${slug}/partidos/${matchId}`
}

export function orderRosterByAttendance<T extends { id: string }>(
  players: T[],
  attendingPlayerIds: string[]
): T[] {
  const rank = new Map(attendingPlayerIds.map((id, index) => [id, index]))
  return [...players].sort((left, right) => {
    const leftRank = rank.get(left.id) ?? Number.POSITIVE_INFINITY
    const rightRank = rank.get(right.id) ?? Number.POSITIVE_INFINITY
    if (leftRank !== rightRank) return leftRank - rightRank
    return 0
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/match-attendance.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-attendance.ts tests/lib/match-attendance.test.ts
git commit -m "feat: add public friendly match path and attendance roster order"
```

---

### Task 2: Create friendly without players

**Files:**
- Modify: `src/lib/validations/match.ts`
- Modify: `src/app/api/matches/route.ts`
- Test: `tests/lib/validations-match-create-friendly.test.ts`

- [ ] **Step 1: Write the failing test**

Crear `tests/lib/validations-match-create-friendly.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createFriendlyMatchSchema, updateMatchSchema } from '@/lib/validations/match'

const baseFriendly = {
  matchType: 'FRIENDLY' as const,
  friendlyCategoryId: 'cat1',
  sideAName: 'Blancos',
  sideBName: 'Negros',
  scheduledAt: '2026-09-14T21:00:00.000Z',
}

describe('createFriendlyMatchSchema', () => {
  it('accepts an intra friendly without players', () => {
    expect(createFriendlyMatchSchema.safeParse(baseFriendly).success).toBe(true)
    expect(createFriendlyMatchSchema.safeParse({ ...baseFriendly, players: [] }).success).toBe(true)
  })

  it('still rejects a partial roster on create', () => {
    expect(
      createFriendlyMatchSchema.safeParse({
        ...baseFriendly,
        players: [{ playerId: 'p1', side: 'A' }],
      }).success
    ).toBe(false)
  })
})

describe('updateMatchSchema players', () => {
  it('accepts a full roster that includes a non-attendee extra', () => {
    const players = [
      { playerId: 'p1', side: 'A' as const, isCaptain: true, isCoach: true },
      { playerId: 'p2', side: 'B' as const, isCaptain: true, isCoach: true },
      { playerId: 'extra', side: 'A' as const },
    ]
    expect(updateMatchSchema.safeParse({ players }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations-match-create-friendly.test.ts`

Expected: FAIL — `players` min(2) rechaza body sin players.

- [ ] **Step 3: Write minimal implementation**

En `src/lib/validations/match.ts`, `createFriendlyMatchSchema`:

```ts
    players: z.array(rosterPlayerEntry).optional().default([]),
```

Y el `superRefine` de create (reemplazar `.superRefine(refineFriendlyPlayers)`):

```ts
  .superRefine((data, ctx) => {
    if (data.players.length > 0) refineFriendlyPlayers({ players: data.players }, ctx)
  })
  .superRefine(refineChileLocation)
```

En `src/app/api/matches/route.ts` `createFriendlyMatch`, después de validar categoría:

```ts
  const players = data.players ?? []
  const playerIds = players.map((player) => player.playerId)
  if (playerIds.length > 0) {
    const rosterPlayers = await db.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, organizationId: true },
    })
    if (rosterPlayers.length !== playerIds.length) {
      return NextResponse.json({ error: 'Uno o más jugadores no existen' }, { status: 400 })
    }
    if (rosterPlayers.some((player) => player.organizationId !== organizationId)) {
      return NextResponse.json(
        { error: 'Los jugadores deben pertenecer a tu organización' },
        { status: 400 }
      )
    }
  }

  const match = await db.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        organizationId,
        matchType: 'FRIENDLY',
        friendlyCategoryId: data.friendlyCategoryId,
        footballFormat: data.footballFormat,
        sideAName: data.sideAName,
        sideBName: data.sideBName,
        sideAColor: deriveTeamColor(data.sideAName),
        sideBColor: deriveTeamColor(data.sideBName),
        refereeId: data.refereeId,
        refereeEventTypes: normalizeRefereeEventTypes(
          data.refereeEventTypes ?? DEFAULT_REFEREE_EVENT_TYPES
        ),
        venue: data.venue,
        scheduledAt: new Date(data.scheduledAt),
        ...locationFields,
      },
    })
    if (players.length > 0) {
      await tx.friendlyMatchPlayer.createMany({
        data: players.map((player) => ({
          matchId: created.id,
          playerId: player.playerId,
          side: player.side,
          isCaptain: player.isCaptain ?? false,
          isCoach: player.isCoach ?? false,
        })),
      })
    }
    return tx.match.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        friendlyCategory: { select: { id: true, name: true } },
        friendlyPlayers: {
          include: { player: { select: playerSummarySelect } },
        },
        referee: { select: { id: true, name: true } },
        guestOrganization: { select: { id: true, slug: true, name: true } },
      },
    })
  })
```

Borrar el bloque viejo que siempre hacía `data.players.map` / `createMany`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/validations-match-create-friendly.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/match.ts src/app/api/matches/route.ts tests/lib/validations-match-create-friendly.test.ts
git commit -m "feat: allow creating intra friendlies without a roster"
```

---

### Task 3: Wizard intra sin convocatoria

**Files:**
- Modify: `src/components/admin/match-create/FriendlyMatchCreateWizard.tsx`

- [ ] **Step 1: Skip roster validation and payload for intra**

En `handleSubmit`, reemplazar el bloque `validateRoster` + payload intra:

```ts
    if (data.friendlyMode === 'challenge') {
      const rosterError = validateRoster(data)
      if (rosterError) {
        setError(rosterError)
        setOpenStep(4)
        patch({ rosterPhase: 'teams' })
        return
      }
    }
```

En el payload intra (`else` de challenge), **omitir** `players`:

```ts
        : {
            matchType: 'FRIENDLY' as const,
            friendlyCategoryId: data.categoryId,
            footballFormat: data.footballFormat,
            sideAName: data.sideAName,
            sideBName: data.sideBName,
            refereeId: data.refereeId || undefined,
            refereeEventTypes: data.refereeEventTypes,
            venue: data.venue || undefined,
            regionCode: data.regionCode || undefined,
            communeCode: data.communeCode || undefined,
            scheduledAt,
          }
```

- [ ] **Step 2: Hide step 4 for intra**

Envolver el `WizardStep` de “Convocatoria y equipos” (`step={4}`) así:

```tsx
      {data.friendlyMode === 'challenge' ? (
      <WizardStep
        step={4}
        title="Convocatoria y equipos"
        subtitle="Jugadores, lados, capitán y DT"
        isOpen={data.openStep === 4}
        onToggle={() => setOpenStep(4)}
      >
        {/* contenido actual del step 4 sin cambios */}
      </WizardStep>
      ) : (
        <p className="rounded-lg border border-kelme-border bg-kelme-surface px-4 py-3 text-sm text-kelme-gray-600">
          Después de crear el partido, comparte el link de asistencia. Los equipos se arman al editar, con los que anotaron.
        </p>
      )}
```

Si al crear intra `openStep === 4` quedó en un draft viejo, en `handleSubmit` no importa. Opcional: `if (data.friendlyMode === 'intra' && data.openStep === 4) patch({ openStep: 5 })` al hidratar no es obligatorio.

- [ ] **Step 3: After create, send admin to the public list URL (optional copy)**

Tras `result.ok`, el push a `/admin/matches` se mantiene. El link “Ver lista” llega en Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/match-create/FriendlyMatchCreateWizard.tsx
git commit -m "feat: create intra friendlies without convocation step"
```

---

### Task 4: Proxy público `/{slug}/partidos/:id`

**Files:**
- Modify: `src/lib/proxy-policy.ts`
- Test: `tests/lib/proxy-policy.test.ts`

- [ ] **Step 1: Write the failing test**

En `tests/lib/proxy-policy.test.ts`:

```ts
  it('treats friendly match pages as public GET only', () => {
    expect(isPublicRequest('GET', '/loslunes/partidos/match-1')).toBe(true)
    expect(isPublicRequest('HEAD', '/loslunes/partidos/match-1')).toBe(true)
    expect(isPublicRequest('POST', '/loslunes/partidos/match-1')).toBe(false)
    expect(isPublicRequest('GET', '/plataforma/partidos/match-1')).toBe(false)
  })
```

`plataforma` no es slug de org (`parseOrganizationSlug`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/proxy-policy.test.ts -t "treats friendly match pages"`

Expected: FAIL — GET es `false`.

- [ ] **Step 3: Write minimal implementation**

En `src/lib/proxy-policy.ts`, junto a `tenantAyuda`:

```ts
function isTenantFriendlyMatchPageGet(method: string, pathname: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false
  const match = /^\/([^/]+)\/partidos\/[^/]+$/.exec(pathname)
  if (!match) return false
  return parseOrganizationSlug(match[1]).ok
}
```

Incluir `isTenantFriendlyMatchPageGet(method, pathname)` en el `return` de `isPublicRequest`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/proxy-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/proxy-policy.ts tests/lib/proxy-policy.test.ts
git commit -m "feat: allow public GET of friendly match attendance pages"
```

---

### Task 5: Loader + página `/{slug}/partidos/[id]`

**Files:**
- Create: `src/lib/friendly-match-page.ts`
- Create: `src/app/(tenant)/[organizationSlug]/partidos/[matchId]/page.tsx`
- Test: `tests/lib/friendly-match-page.test.ts`

**Interfaces:**
- `export type FriendlyMatchPage = { matchId: string; organizationSlug: string; status: string; dateLine: string; time: string; venue: string; home: string; away: string; sidesReady: boolean; open: boolean; attendees: MatchAttendanceEntry[] }`
- `export async function getFriendlyMatchPage(slug: string, matchId: string): Promise<FriendlyMatchPage | null>`

- [ ] **Step 1: Write a pure helper test (no db)**

`tests/lib/friendly-match-page.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canShowFriendlyMatchLiveLink } from '@/lib/friendly-match-page'

describe('canShowFriendlyMatchLiveLink', () => {
  it('shows live link after the match starts', () => {
    expect(canShowFriendlyMatchLiveLink('SCHEDULED')).toBe(false)
    expect(canShowFriendlyMatchLiveLink('LIVE')).toBe(true)
    expect(canShowFriendlyMatchLiveLink('HALFTIME')).toBe(true)
    expect(canShowFriendlyMatchLiveLink('FINISHED')).toBe(true)
    expect(canShowFriendlyMatchLiveLink('CANCELLED')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/friendly-match-page.test.ts`

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implement loader + page**

`src/lib/friendly-match-page.ts`:

```ts
import { MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import {
  canOpenMatchAttendance,
  MATCH_ATTENDANCE_INCLUDE,
  serializeMatchAttendance,
} from '@/lib/match-attendance'
import { matchSideNames } from '@/lib/match-label'
import { sidesAreReady } from '@/lib/org-public-landing'
import { formatScheduleDateLabel, formatScheduleTimeLabel } from '@/lib/schedule-datetime'

export function canShowFriendlyMatchLiveLink(status: string): boolean {
  return (
    status === MatchStatus.LIVE ||
    status === MatchStatus.HALFTIME ||
    status === MatchStatus.FINISHED
  )
}

export async function getFriendlyMatchPage(slug: string, matchId: string) {
  const org = await db.organization.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: { id: true, slug: true },
  })
  if (!org) return null

  const match = await db.match.findFirst({
    where: {
      id: matchId,
      organizationId: org.id,
      matchType: MatchType.FRIENDLY,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      venue: true,
      communeName: true,
      matchType: true,
      sideAName: true,
      sideBName: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      attendances: {
        orderBy: { createdAt: 'asc' },
        include: MATCH_ATTENDANCE_INCLUDE,
      },
    },
  })
  if (!match) return null

  const sides = matchSideNames(match)
  return {
    matchId: match.id,
    organizationSlug: org.slug,
    status: match.status,
    dateLine: formatScheduleDateLabel(match.scheduledAt),
    time: formatScheduleTimeLabel(match.scheduledAt),
    venue: match.venue ?? match.communeName ?? 'Sin sede',
    home: sides.home,
    away: sides.away,
    sidesReady: sidesAreReady(sides.home, sides.away),
    open: canOpenMatchAttendance(match),
    attendees: serializeMatchAttendance(match.attendances),
  }
}
```

`src/app/(tenant)/[organizationSlug]/partidos/[matchId]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  canShowFriendlyMatchLiveLink,
  getFriendlyMatchPage,
} from '@/lib/friendly-match-page'
import { MatchAttendanceBoard } from '@/components/match-attendance/MatchAttendanceBoard'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { friendlyMatchPublicPath } from '@/lib/match-attendance'
import { matchStatusLabel } from '@/lib/match-status-ui'

export const dynamic = 'force-dynamic'

export default async function FriendlyMatchPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; matchId: string }>
}) {
  const { organizationSlug, matchId } = await params
  const data = await getFriendlyMatchPage(organizationSlug, matchId)
  if (!data) notFound()

  const session = await auth()
  const loginHref = `/login?callbackUrl=${friendlyMatchPublicPath(organizationSlug, matchId)}`
  let viewer = {
    signedIn: false,
    canSign: false,
    myPlayerId: null as string | null,
    loginHref,
  }
  if (session?.user?.id) {
    const org = await db.organization.findUnique({
      where: { slug: organizationSlug },
      select: { id: true },
    })
    if (org) {
      const player = await findPlayerInOrganization(session.user.id, org.id)
      viewer = {
        signedIn: true,
        canSign: Boolean(player),
        myPlayerId: player?.id ?? null,
        loginHref,
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f4f5f2]">
      <div className="mx-auto w-[min(720px,calc(100%-32px))] py-10">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-org-primary">
          {data.dateLine} · {data.time}
        </p>
        <h1 className="mt-2 font-display text-[34px] font-semibold uppercase tracking-[-0.04em]">
          {data.sidesReady ? `${data.home} vs ${data.away}` : 'El partido se juega.'}
        </h1>
        <p className="mt-2 text-sm text-[#9ca59f]">
          {data.venue} · {matchStatusLabel(data.status)}
        </p>
        {canShowFriendlyMatchLiveLink(data.status) ? (
          <Link
            href={`/${organizationSlug}/live/${data.matchId}`}
            className="btn-kelme mt-4 inline-flex"
          >
            Ver en vivo
          </Link>
        ) : null}
        <div className="mt-10">
          <MatchAttendanceBoard
            matchId={data.matchId}
            open={data.open}
            attendees={data.attendees}
            viewer={viewer}
            matchLabel={data.sidesReady ? `${data.home} vs ${data.away}` : undefined}
            dateLine={`${data.dateLine} · ${data.time}`}
          />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/friendly-match-page.test.ts tests/lib/match-attendance.test.ts`

Expected: PASS. `npx tsc --noEmit` no debe fallar en la page.

- [ ] **Step 5: Commit**

```bash
git add src/lib/friendly-match-page.ts "src/app/(tenant)/[organizationSlug]/partidos/[matchId]/page.tsx" tests/lib/friendly-match-page.test.ts
git commit -m "feat: add public friendly match page with attendance"
```

---

### Task 6: Landing y panel — tarjetas, no board

**Files:**
- Create: `src/components/marketing/FriendlyAttendanceCards.tsx`
- Modify: `src/components/marketing/OrgPublicLanding.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx`

- [ ] **Step 1: Cards component**

`src/components/marketing/FriendlyAttendanceCards.tsx`:

```tsx
import Link from 'next/link'
import { attendanceCountLabel, friendlyMatchPublicPath } from '@/lib/match-attendance'

export type AttendanceCard = {
  matchId: string
  matchLabel: string
  dateLine: string
  attendees: Array<{ playerId: string }>
}

export function FriendlyAttendanceCards({
  slug,
  boards,
}: {
  slug: string
  boards: AttendanceCard[]
}) {
  if (boards.length === 0) return null
  return (
    <section id="asistencia" className="scroll-mt-24 py-[26px]">
      <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-org-primary">
          Lista del grupo
        </p>
        <h2 className="mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em]">
          ¿Quién va?
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boards.map((board) => (
            <Link
              key={board.matchId}
              href={friendlyMatchPublicPath(slug, board.matchId)}
              className="rounded-[18px] border border-[#2a302d] bg-[#131615] p-5 transition hover:border-[#414943]"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-org-primary">
                {board.dateLine}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold uppercase">
                {board.matchLabel}
              </h3>
              <p className="mt-2 text-sm text-[#9ca59f]">
                {attendanceCountLabel(board.attendees.length)}
              </p>
              <p className="mt-4 text-sm font-bold text-org-primary">Ver quién va →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Swap landing board for cards**

En `OrgPublicLanding.tsx`:

- Quitar import de `MatchAttendanceBoard` y `attendanceSectionId`.
- Quitar prop `attendanceViewer` del componente **y** de `src/app/(tenant)/[organizationSlug]/page.tsx` (ya no hace falta viewer en landing).
- Reemplazar el bloque `{data.attendances.length > 0 ? ( ... MatchAttendanceBoard ... )}` por:

```tsx
        <FriendlyAttendanceCards slug={slug} boards={data.attendances} />
```

- [ ] **Step 3: Player panel links**

En `player/page.tsx`, reemplazar el map de `MatchAttendanceBoard` por:

```tsx
      {scheduledFriendlies.length > 0 ? (
        <div className="mb-8 space-y-3">
          <h2 className="text-lg font-semibold">¿Quién va?</h2>
          {scheduledFriendlies.map((match) => {
            const board = toMatchAttendanceBoard(match)
            return (
              <Link
                key={board.matchId}
                href={friendlyMatchPublicPath(organizationSlug, board.matchId)}
                className="block rounded-xl border border-kelme-border bg-kelme-surface px-4 py-3"
              >
                <p className="text-xs text-kelme-gray-500">{board.dateLine}</p>
                <p className="font-semibold">{board.matchLabel}</p>
              </Link>
            )
          })}
        </div>
      ) : null}
```

Importar `friendlyMatchPublicPath`. Quitar imports del board / `attendanceViewerFromPlayer` / `attendanceSectionId` si quedan unused.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/match-attendance.test.ts tests/lib/org-public-landing.test.ts`

Expected: PASS. `npx tsc --noEmit` OK (page.tsx ya no pasa `attendanceViewer`).

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/FriendlyAttendanceCards.tsx src/components/marketing/OrgPublicLanding.tsx "src/app/(tenant)/[organizationSlug]/page.tsx" "src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx"
git commit -m "feat: link landing and player panel to per-match attendance pages"
```

---

### Task 7: Admin — anotados primero + link Ver lista

**Files:**
- Modify: `src/components/admin/FriendlyMatchTeamAssigner.tsx`
- Modify: `src/components/admin/MatchActions.tsx`
- Modify: `src/components/admin/AdminMatchCard.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/page.tsx`

- [ ] **Step 1: Assigner badge + attending order**

Agregar prop `attendingPlayerIds?: string[]` a `FriendlyMatchTeamAssigner`.

En el render, **no** reordenar por apellido si hay anotados. Usar:

```ts
import { orderRosterByAttendance } from '@/lib/match-attendance'

  const attending = attendingPlayerIds ?? []
  const attendingSet = new Set(attending)
  const sortedConvoked = orderRosterByAttendance(convoked, attending)
```

En cada `<li>`, si `attendingSet.has(p.id)`:

```tsx
              {attendingSet.has(p.id) ? (
                <span className="rounded-full bg-[#0B1210] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3D8B6E] ring-1 ring-[#3D8B6E]/35">
                  Va
                </span>
              ) : null}
```

- [ ] **Step 2: Pass IDs from admin list**

En `admin/matches/page.tsx`, además de `attendanceNames`, pasar:

```ts
              attendancePlayerIds={
                match.matchType === MatchType.FRIENDLY
                  ? match.attendances.map((row) => row.playerId)
                  : []
              }
              organizationSlug={organizationSlug}
```

En `AdminMatchCard` Props: `attendancePlayerIds?: string[]`, `organizationSlug: string`.

Junto al conteo de anotados, link:

```tsx
        {matchType === MatchType.FRIENDLY ? (
          <p className="mt-2 text-xs text-kelme-gray-600">
            {attendanceCountLabel(attendanceNames.length)}
            {attendanceNames.length > 0 ? `: ${attendanceNames.join(', ')}` : ''}
            {' · '}
            <Link
              href={`/${organizationSlug}/partidos/${match.id}`}
              className="font-semibold text-kelme-red hover:underline"
            >
              Ver lista
            </Link>
          </p>
        ) : null}
```

Quitar el condicional `status === 'SCHEDULED'` del bloque de conteo (el link sirve también después; Voy ya está cerrado en la página pública). Si prefieres no mostrar nombres en LIVE, deja el link igual.

Pasar `attendancePlayerIds` y `organizationSlug` a `MatchActions` (o al assigner dentro de `MatchActions`).

En `MatchActions`, props nuevas `attendingPlayerIds: string[]` → `FriendlyMatchTeamAssigner attendingPlayerIds={attendingPlayerIds}`.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/FriendlyMatchTeamAssigner.tsx src/components/admin/MatchActions.tsx src/components/admin/AdminMatchCard.tsx "src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/page.tsx"
git commit -m "feat: prioritize attendees when assigning friendly sides"
```

---

## Verificación final

```bash
npx vitest run tests/lib/match-attendance.test.ts tests/lib/validations-match-create-friendly.test.ts tests/lib/proxy-policy.test.ts tests/lib/friendly-match-page.test.ts tests/lib/org-public-landing.test.ts
npx tsc --noEmit
```

Manual (`loslunes`):

1. Admin crea amistoso intra **sin** convocar → aparece en la lista.
2. Landing muestra tarjeta → `/{slug}/partidos/{id}`.
3. Sin sesión: lista + “Ingresa para anotar tu nombre”.
4. Jugador con ficha: Voy / Ya no voy.
5. Admin edita: anotados arriba con badge **Va**; puede convocar un extra y asignar lados + capitán + DT.
6. Partido LIVE: Voy cerrado; “Ver en vivo” aparece en la página del partido.
7. Un partido de liga no abre `/partidos/{id}`.

Prod: no hay migración nueva. Deploy con `npx vercel deploy --prod --yes` (push a `main` no publica). Actualizar `docs/handoff/SESSION-CONTEXT.md` en la sesión de prod.

---

## Spec coverage

| Requisito | Task |
|-----------|------|
| Crear intra vacío | 2, 3 |
| Página pública encabezado + board | 5 |
| Proxy GET público | 4 |
| Landing tarjetas | 6 |
| Panel jugador links | 6 |
| Nav `#asistencia` | 6 (id en cards) |
| Admin Ver lista + anotados primero + extras | 7 |
| Create schema players opcional | 2 |
| Update extras válidos | 2 (test) |
| Liga 404 | 5 (`matchType: FRIENDLY`) |
| Desafíos intactos | 2–3 no tocan challenge schema |

## Placeholder scan

Sin TBD ni “similar a Task N”. Firmas `friendlyMatchPublicPath`, `orderRosterByAttendance`, `getFriendlyMatchPage`, `canShowFriendlyMatchLiveLink` coinciden entre tasks.

## Type consistency

- Path: `/${slug}/partidos/${matchId}`.
- `attendingPlayerIds: string[]` en assigner y admin card.
- Landing deja de recibir `attendanceViewer`.
