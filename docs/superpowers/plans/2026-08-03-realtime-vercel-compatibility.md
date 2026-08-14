# Realtime and Vercel Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-memory Socket.IO live channel with canonical database snapshots plus Supabase Realtime invalidations, and make the Next.js 16 application run on Vercel's standard Node.js 22 runtime.

**Architecture:** PostgreSQL remains the only source of truth. Server mutations publish a minimal `{ matchId }` invalidation through Supabase Realtime REST; browsers respond by fetching and replacing the complete public live snapshot, with debounce, reconnect resync, and visible polling as fallback. Next.js runs through `next dev`, `next build`, and `next start`, while `src/proxy.ts` owns authentication routing and the maintenance/redirect controls required for cutover.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript, Prisma 7, Vitest 4, Node.js 22.x, Supabase Realtime Broadcast, current Node.js 22-compatible `@supabase/supabase-js`.

---

## Global Constraints

- Scope is phase 1 only: canonical live snapshot/API, Realtime invalidation publishing and subscription, browser resync/polling, producer migration, Socket.IO/custom-server removal, package/runtime updates, Next.js Proxy migration, and maintenance/redirect controls.
- Do not modify Prisma schema, migrations, `src/lib/db.ts`, `prisma.config.ts`, `render.yaml`, database URLs, migration scripts, or cutover documentation in this plan.
- Target Node.js 22.x in repository metadata and Vercel project settings.
- Install the current compatible Supabase browser SDK with `npm install @supabase/supabase-js`; do not hard-code a package version in implementation instructions or tests.
- PostgreSQL is the canonical live source. Broadcast payloads contain no scores, events, relations, images, clock fields, or other business data.
- A completed database write must still return success when Realtime configuration, network access, or Supabase is unavailable.
- `SUPABASE_SECRET_KEY` is server-only. Browser code may read only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Missing browser Realtime configuration produces `degraded`, not a render crash.
- Keep the last valid live snapshot when fetch, JSON parsing, or API status fails.
- Poll only while status is `LIVE` or `HALFTIME`, and only while `document.visibilityState === 'visible'`.
- Preserve timeline ordering behavior, including `preferCreatedAtOrder` for legacy matches.
- Preserve every current public `LiveScoreboard` DTO field in the canonical snapshot during this phase. The current JSX directly uses teams, scores, status, clock, timeline ordering/events, weather/location, staff, MVPs, football format, formations, and player highlight IDs. Fields currently used only by Socket.IO merge helpers (`matchType`, team IDs, side names, and `friendlySideByPlayer`) remain in the public DTO until a separate, explicitly tested DTO cleanup.
- Phase 1 owns `src/middleware.ts` → `src/proxy.ts`, `MIGRATION_MAINTENANCE_MODE`, `MIGRATION_REDIRECT_URL`, and `/mantenimiento`. Later phases only configure and activate these controls.
- Keep `render.yaml` for rollback. Its existing `npm start` command will use `next start` after this phase.
- Keep `tsx` because seeds and the Render migration script still consume it; move it from runtime dependencies to `devDependencies`.
- Use current repository imports and types: Prisma enums from `@prisma/client`, `TeamMvpSideView` from `@/lib/match-mvp`, `LineupView` from `@/lib/match-lineup`, and `SerializableClockState` from `@/hooks/useMatchClock`.
- Follow the installed Next.js 16 behavior: use `src/proxy.ts`, export named `proxy`, retain static `config.matcher`, and do not export a Proxy runtime override.
- UI strings remain Chilean Spanish.
- Every implementation task follows red-green TDD and ends in a reviewable commit.

## File Map

### Create

- `src/lib/live-match-snapshot.ts` — canonical Prisma query, public DTO, and serialization.
- `src/app/api/matches/[id]/live/route.ts` — public resync/polling endpoint.
- `src/lib/supabase-realtime-server.ts` — best-effort Realtime REST publisher.
- `src/lib/supabase-realtime-client.ts` — browser-only Supabase client.
- `src/hooks/useMatchRealtime.ts` — channel lifecycle and connection status.
- `src/hooks/useLiveMatchSnapshot.ts` — debounce, canonical fetch, reconnect resync, and polling.
- `src/lib/proxy-policy.ts` — pure public-route and migration-control decisions.
- `src/app/mantenimiento/page.tsx` — public cutover maintenance page.
- `tests/lib/live-match-snapshot.test.ts`
- `tests/api/live-match-snapshot.test.ts`
- `tests/lib/supabase-realtime-server.test.ts`
- `tests/lib/realtime-call-sites.test.ts`
- `tests/lib/supabase-realtime-client.test.ts`
- `tests/hooks/use-match-realtime.test.tsx`
- `tests/hooks/use-live-match-snapshot.test.tsx`
- `tests/lib/proxy-policy.test.ts`
- `tests/lib/vercel-runtime.test.ts`

### Modify

- `src/app/live/[matchId]/page.tsx`
- `src/components/live/LiveScoreboard.tsx`
- `src/components/live/LiveMatchContextBar.tsx`
- `src/lib/match-events.ts`
- `src/lib/match-reconcile.ts`
- `src/app/api/matches/[id]/mvp/route.ts`
- `src/app/api/matches/[id]/mvp/[side]/photo/route.ts`
- `package.json`
- `package-lock.json`
- `.env.example`

### Rename

- `src/middleware.ts` → `src/proxy.ts`

### Delete

- `server.ts`
- `src/server/socket.ts`
- `src/lib/socket-client.ts`

## Interfaces

### Canonical snapshot

```typescript
export type LiveMatchSnapshot = {
  id: string
  matchType: MatchType
  homeTeamId: string | null
  awayTeamId: string | null
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string; crestSrc: string | null; color: string }
  awayTeam: { name: string; crestSrc: string | null; color: string }
  homeScore: number
  awayScore: number
  status: string
  preferCreatedAtOrder: boolean
  friendlySideByPlayer: Record<string, 'A' | 'B'>
  clock: SerializableClockState
  events: LiveMatchEvent[]
  footballFormat: FootballFormat
  teamMvps: TeamMvpSideView[]
  mvpPlayerIds: string[]
  captainPlayerIds: string[]
  homeCaptainLabel: string | null
  awayCaptainLabel: string | null
  homeCoachLabel: string | null
  awayCoachLabel: string | null
  venue: string | null
  locationLabel: string | null
  weather: LiveMatchWeather | null
  formations: LiveMatchFormation[]
}

export function buildLiveMatchSnapshot(match: LiveMatchRecord): LiveMatchSnapshot
export async function getLiveMatchSnapshot(matchId: string): Promise<LiveMatchSnapshot | null>
```

### Public API

```http
GET /api/matches/:id/live
200 LiveMatchSnapshot
404 { "error": "Partido no encontrado" }
500 { "error": "No se pudo cargar el partido en vivo" }
```

### Server publisher

```typescript
export async function publishMatchInvalidation(matchId: string): Promise<void>
```

```json
{
  "messages": [
    {
      "topic": "match:match-1",
      "event": "invalidate",
      "payload": { "matchId": "match-1" }
    }
  ]
}
```

### Browser subscription

```typescript
export type MatchRealtimeStatus = 'connecting' | 'connected' | 'degraded'

export function useMatchRealtime(options: {
  matchId: string
  enabled: boolean
  onInvalidate: () => void
}): MatchRealtimeStatus
```

### Browser snapshot lifecycle

```typescript
export function useLiveMatchSnapshot(options: {
  initialSnapshot: LiveMatchSnapshot
}): {
  snapshot: LiveMatchSnapshot
  realtimeStatus: MatchRealtimeStatus
  resync: () => Promise<void>
}
```

### Proxy policy

```typescript
export function isPublicRequest(method: string, pathname: string): boolean

export function decideMigrationRequest(input: {
  method: string
  pathname: string
  search: string
  accept: string | null
  rsc: string | null
  maintenanceMode: string | undefined
  redirectUrl: string | undefined
}): MigrationDecision | null
```

---

### Task 1: Establish the canonical live snapshot

**Files:**
- Create: `src/lib/live-match-snapshot.ts`
- Create: `tests/lib/live-match-snapshot.test.ts`
- Modify: `src/components/live/LiveMatchContextBar.tsx`

- [ ] **Step 1: Write the failing snapshot tests**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FootballFormat, MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import {
  buildLiveMatchSnapshot,
  getLiveMatchSnapshot,
  type LiveMatchRecord,
} from '@/lib/live-match-snapshot'

vi.mock('@/lib/db', () => ({
  db: { match: { findUnique: vi.fn() } },
}))

const match = {
  id: 'match-1',
  matchType: MatchType.LEAGUE,
  footballFormat: FootballFormat.FUTBOL_7,
  homeTeamId: 'home',
  awayTeamId: 'away',
  sideAName: null,
  sideBName: null,
  sideAColor: null,
  sideBColor: null,
  homeScore: 2,
  awayScore: 1,
  status: MatchStatus.LIVE,
  clockStartedAt: new Date('2026-08-03T20:00:00.000Z'),
  secondHalfStartedAt: null,
  halftimeAt: null,
  venue: 'Cancha Central',
  regionName: 'Región Metropolitana de Santiago',
  communeName: 'Santiago',
  weatherTempC: 18,
  weatherHumidityPct: 55,
  weatherWindKmh: 9,
  weatherLabel: 'Despejado',
  homeTeam: {
    id: 'home',
    name: 'Local',
    color: '#CD212A',
    crestMimeType: null,
    crestData: null,
    coach: { name: 'DT Local' },
  },
  awayTeam: {
    id: 'away',
    name: 'Visita',
    color: '#008C45',
    crestMimeType: null,
    crestData: null,
    coach: { name: 'DT Visita' },
  },
  formations: [],
  callUps: [],
  friendlyPlayers: [],
  teamMvps: [],
  events: [
    {
      id: 'event-1',
      type: 'GOAL',
      minute: 12,
      createdAt: new Date('2026-08-03T20:12:00.000Z'),
      teamId: 'home',
      side: null,
      friendlyPlayerId: null,
      player: {
        teamId: 'home',
        user: { name: 'Jugador Local' },
        team: { id: 'home', name: 'Local' },
      },
      friendlyPlayer: null,
      assistPlayer: { user: { name: 'Asistente Local' } },
      assistFriendlyPlayer: null,
    },
  ],
} as unknown as LiveMatchRecord

describe('live match snapshot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when the match does not exist', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue(null)
    await expect(getLiveMatchSnapshot('missing')).resolves.toBeNull()
  })

  it('preserves the complete public LiveScoreboard DTO', () => {
    const snapshot = buildLiveMatchSnapshot(match)

    expect(snapshot).toMatchObject({
      id: 'match-1',
      matchType: MatchType.LEAGUE,
      homeTeamId: 'home',
      awayTeamId: 'away',
      sideAName: null,
      sideBName: null,
      preferCreatedAtOrder: false,
      friendlySideByPlayer: {},
      homeScore: 2,
      awayScore: 1,
      homeTeam: { name: 'Local', color: '#CD212A', crestSrc: null },
      awayTeam: { name: 'Visita', color: '#008C45', crestSrc: null },
      clock: {
        status: MatchStatus.LIVE,
        clockStartedAt: '2026-08-03T20:00:00.000Z',
        secondHalfStartedAt: null,
        halftimeAt: null,
      },
      events: [
        {
          id: 'event-1',
          playerName: 'Jugador Local',
          assistName: 'Asistente Local',
          teamName: 'Local',
          teamColor: '#CD212A',
        },
      ],
      homeCoachLabel: 'DT Local',
      awayCoachLabel: 'DT Visita',
      venue: 'Cancha Central',
      locationLabel: 'Santiago, Región Metropolitana de Santiago',
      weather: {
        label: 'Despejado',
        tempC: 18,
        humidityPct: 55,
        windKmh: 9,
      },
    })
  })
})
```

- [ ] **Step 2: Run the test and verify red**

Run:

```bash
npx vitest run tests/lib/live-match-snapshot.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/live-match-snapshot'`.

- [ ] **Step 3: Create the snapshot module with the current query**

Create `src/lib/live-match-snapshot.ts` with the existing include tree from `src/app/live/[matchId]/page.tsx`, these public types, and the current serialization logic:

```typescript
import { MatchType, type FootballFormat, type Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { SerializableClockState } from '@/hooks/useMatchClock'
import { formatChileLocation } from '@/lib/chile-locations'
import {
  friendlyCaptainPlayerIds,
  resolveFriendlyCaptains,
} from '@/lib/friendly-match-captain'
import { resolveFriendlyCoaches } from '@/lib/friendly-match-coach'
import { matchSideNames, resolveEventTeamCrest, resolveEventTeamLabel } from '@/lib/match-label'
import { buildMatchFormationSides } from '@/lib/match-formations'
import { matchSideCrestUrl, matchSideHasCrest } from '@/lib/match-side-crest'
import {
  buildMatchTeamMvps,
  MATCH_MVP_INCLUDE,
  teamMvpPlayerIds,
  type TeamMvpSideView,
} from '@/lib/match-mvp'
import { sortTimelineEvents, timelineUsesCreatedAtOrder } from '@/lib/match-timeline-sort'
import { teamCrestUrl, teamHasCrest } from '@/lib/team-crest'
import {
  resolveEventTeamColor,
  resolveMatchSideColor,
  resolveTeamColor,
} from '@/lib/team-color'
import type { LineupView } from '@/lib/match-lineup'

export type LiveMatchWeather = {
  label: string
  tempC: number
  humidityPct: number
  windKmh: number
}

export type LiveMatchEvent = {
  id: string
  type: string
  minute: number
  createdAt: string
  playerName: string | null
  assistName: string | null
  teamName: string | null
  teamCrestSrc: string | null
  teamColor: string | null
}

export type LiveMatchFormation = {
  label: string
  crestSrc: string | null
  color?: string
  coachLabel: string | null
  lineup: LineupView | null
}

export type LiveMatchSnapshot = {
  id: string
  matchType: MatchType
  homeTeamId: string | null
  awayTeamId: string | null
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string; crestSrc: string | null; color: string }
  awayTeam: { name: string; crestSrc: string | null; color: string }
  homeScore: number
  awayScore: number
  status: string
  preferCreatedAtOrder: boolean
  friendlySideByPlayer: Record<string, 'A' | 'B'>
  clock: SerializableClockState
  events: LiveMatchEvent[]
  footballFormat: FootballFormat
  teamMvps: TeamMvpSideView[]
  mvpPlayerIds: string[]
  captainPlayerIds: string[]
  homeCaptainLabel: string | null
  awayCaptainLabel: string | null
  homeCoachLabel: string | null
  awayCoachLabel: string | null
  venue: string | null
  locationLabel: string | null
  weather: LiveMatchWeather | null
  formations: LiveMatchFormation[]
}

const LIVE_MATCH_INCLUDE = {
  homeTeam: { include: { coach: { select: { name: true } } } },
  awayTeam: { include: { coach: { select: { name: true } } } },
  formations: true,
  callUps: {
    include: {
      player: {
        include: {
          user: { select: { name: true } },
          team: { select: { id: true } },
        },
      },
    },
  },
  friendlyPlayers: {
    include: {
      friendlyPlayer: {
        select: { firstName: true, lastName: true, photoMimeType: true },
      },
    },
  },
  teamMvps: { include: MATCH_MVP_INCLUDE },
  events: {
    include: {
      player: {
        include: {
          user: { select: { name: true } },
          team: { select: { id: true, name: true } },
        },
      },
      friendlyPlayer: { select: { firstName: true, lastName: true } },
      assistPlayer: { include: { user: { select: { name: true } } } },
      assistFriendlyPlayer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.MatchInclude

export type LiveMatchRecord = Prisma.MatchGetPayload<{
  include: typeof LIVE_MATCH_INCLUDE
}>

export function buildLiveMatchSnapshot(match: LiveMatchRecord): LiveMatchSnapshot {
  const sides = matchSideNames(match)
  const preferCreatedAtOrder = timelineUsesCreatedAtOrder(match.clockStartedAt)
  const events = sortTimelineEvents(match.events, {
    preferCreatedAt: preferCreatedAtOrder,
  })
  const friendlySideByPlayer = new Map(
    match.friendlyPlayers.map((player) => [player.friendlyPlayerId, player.side])
  )
  const formationSides = buildMatchFormationSides({
    matchType: match.matchType,
    footballFormat: match.footballFormat,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    formations: match.formations,
    callUps: match.callUps.map((callUp) => ({
      playerId: callUp.playerId,
      slotKey: callUp.slotKey,
      player: {
        teamId: callUp.player.teamId,
        user: callUp.player.user,
      },
    })),
    friendlyPlayers: match.friendlyPlayers.map((player) => ({
      friendlyPlayerId: player.friendlyPlayerId,
      side: player.side,
      slotKey: player.slotKey,
      friendlyPlayer: player.friendlyPlayer,
    })),
  })
  const homeCrestSrc =
    match.matchType === MatchType.FRIENDLY
      ? matchSideHasCrest(match, 'A')
        ? matchSideCrestUrl(match.id, 'A')
        : null
      : match.homeTeam && teamHasCrest(match.homeTeam)
        ? teamCrestUrl(match.homeTeam.id)
        : null
  const awayCrestSrc =
    match.matchType === MatchType.FRIENDLY
      ? matchSideHasCrest(match, 'B')
        ? matchSideCrestUrl(match.id, 'B')
        : null
      : match.awayTeam && teamHasCrest(match.awayTeam)
        ? teamCrestUrl(match.awayTeam.id)
        : null
  const homeColor =
    match.matchType === MatchType.FRIENDLY
      ? resolveMatchSideColor(match.sideAColor, sides.home)
      : match.homeTeam
        ? resolveTeamColor(match.homeTeam.color, match.homeTeam.name)
        : resolveTeamColor(null, sides.home)
  const awayColor =
    match.matchType === MatchType.FRIENDLY
      ? resolveMatchSideColor(match.sideBColor, sides.away)
      : match.awayTeam
        ? resolveTeamColor(match.awayTeam.color, match.awayTeam.name)
        : resolveTeamColor(null, sides.away)
  const teamVisual = {
    homeName: sides.home,
    awayName: sides.away,
    homeCrestSrc,
    awayCrestSrc,
    homeColor,
    awayColor,
  }
  const teamContext = {
    matchType: match.matchType,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  }
  const teamMvps = buildMatchTeamMvps({
    matchId: match.id,
    homeLabel: sides.home,
    awayLabel: sides.away,
    rows: match.teamMvps,
  })
  const friendlyCaptains =
    match.matchType === MatchType.FRIENDLY
      ? resolveFriendlyCaptains(match.friendlyPlayers)
      : []
  const friendlyCoaches =
    match.matchType === MatchType.FRIENDLY
      ? resolveFriendlyCoaches(match.friendlyPlayers)
      : []
  const homeCaptainLabel =
    friendlyCaptains.find((captain) => captain.side === 'A')?.label ?? null
  const awayCaptainLabel =
    friendlyCaptains.find((captain) => captain.side === 'B')?.label ?? null
  const homeCoachLabel =
    match.matchType === MatchType.FRIENDLY
      ? friendlyCoaches.find((coach) => coach.side === 'A')?.label ?? null
      : match.homeTeam?.coach?.name ?? null
  const awayCoachLabel =
    match.matchType === MatchType.FRIENDLY
      ? friendlyCoaches.find((coach) => coach.side === 'B')?.label ?? null
      : match.awayTeam?.coach?.name ?? null
  const weather =
    match.weatherTempC !== null &&
    match.weatherHumidityPct !== null &&
    match.weatherWindKmh !== null &&
    match.weatherLabel
      ? {
          label: match.weatherLabel,
          tempC: match.weatherTempC,
          humidityPct: match.weatherHumidityPct,
          windKmh: match.weatherWindKmh,
        }
      : null

  return {
    id: match.id,
    matchType: match.matchType,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: { name: sides.home, crestSrc: homeCrestSrc, color: homeColor },
    awayTeam: { name: sides.away, crestSrc: awayCrestSrc, color: awayColor },
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    preferCreatedAtOrder,
    friendlySideByPlayer: Object.fromEntries(friendlySideByPlayer) as Record<
      string,
      'A' | 'B'
    >,
    clock: {
      status: match.status,
      clockStartedAt: match.clockStartedAt?.toISOString() ?? null,
      secondHalfStartedAt: match.secondHalfStartedAt?.toISOString() ?? null,
      halftimeAt: match.halftimeAt?.toISOString() ?? null,
    },
    events: events.map((event) => {
      const teamName = resolveEventTeamLabel(
        {
          teamId: event.teamId,
          side: event.side,
          playerTeamId: event.player?.team?.id ?? event.player?.teamId ?? null,
          playerTeamName: event.player?.team?.name ?? null,
          friendlyPlayerId: event.friendlyPlayerId,
          friendlySide: event.friendlyPlayerId
            ? friendlySideByPlayer.get(event.friendlyPlayerId) ?? null
            : null,
        },
        teamContext
      )
      return {
        id: event.id,
        type: event.type,
        minute: event.minute,
        createdAt: event.createdAt.toISOString(),
        playerName: event.friendlyPlayer
          ? `${event.friendlyPlayer.firstName} ${event.friendlyPlayer.lastName}`
          : event.player?.user.name ?? null,
        assistName: event.assistFriendlyPlayer
          ? `${event.assistFriendlyPlayer.firstName} ${event.assistFriendlyPlayer.lastName}`
          : event.assistPlayer?.user.name ?? null,
        teamName,
        teamCrestSrc: resolveEventTeamCrest(teamName, teamVisual),
        teamColor: resolveEventTeamColor(teamName, teamVisual),
      }
    }),
    footballFormat: match.footballFormat,
    teamMvps,
    mvpPlayerIds: teamMvpPlayerIds(teamMvps),
    captainPlayerIds: friendlyCaptainPlayerIds(friendlyCaptains),
    homeCaptainLabel,
    awayCaptainLabel,
    homeCoachLabel,
    awayCoachLabel,
    venue: match.venue,
    locationLabel: formatChileLocation(match.regionName, match.communeName),
    weather,
    formations: formationSides.map((side) => ({
      label: side.label,
      lineup: side.lineup,
      crestSrc:
        side.label === sides.home
          ? homeCrestSrc
          : side.label === sides.away
            ? awayCrestSrc
            : null,
      color:
        side.label === sides.home
          ? homeColor
          : side.label === sides.away
            ? awayColor
            : undefined,
      coachLabel:
        side.label === sides.home
          ? homeCoachLabel
          : side.label === sides.away
            ? awayCoachLabel
            : null,
    })),
  }
}

export async function getLiveMatchSnapshot(
  matchId: string
): Promise<LiveMatchSnapshot | null> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: LIVE_MATCH_INCLUDE,
  })
  return match ? buildLiveMatchSnapshot(match) : null
}
```

In `src/components/live/LiveMatchContextBar.tsx`, replace the local `LiveMatchWeather` declaration with:

```typescript
import type { LiveMatchWeather } from '@/lib/live-match-snapshot'
export type { LiveMatchWeather } from '@/lib/live-match-snapshot'
```

The re-export keeps the current `LiveScoreboard` type import valid until Task 6 updates that component.

- [ ] **Step 4: Run the focused test and typecheck**

```bash
npx vitest run tests/lib/live-match-snapshot.test.ts
npx tsc --noEmit
```

Expected: both commands PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/live-match-snapshot.ts src/components/live/LiveMatchContextBar.tsx tests/lib/live-match-snapshot.test.ts
git commit -m "refactor: centralize canonical live match snapshot"
```

### Task 2: Expose the public snapshot API and SSR consumer

**Files:**
- Create: `src/app/api/matches/[id]/live/route.ts`
- Create: `tests/api/live-match-snapshot.test.ts`
- Modify: `src/app/live/[matchId]/page.tsx`

- [ ] **Step 1: Write failing API tests**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLiveMatchSnapshot } from '@/lib/live-match-snapshot'
import { GET } from '@/app/api/matches/[id]/live/route'

vi.mock('@/lib/live-match-snapshot', () => ({
  getLiveMatchSnapshot: vi.fn(),
}))

describe('GET /api/matches/[id]/live', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with the snapshot', async () => {
    vi.mocked(getLiveMatchSnapshot).mockResolvedValue({
      id: 'match-1',
      status: 'LIVE',
    } as never)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'match-1' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: 'match-1', status: 'LIVE' })
  })

  it('returns 404 for a missing match', async () => {
    vi.mocked(getLiveMatchSnapshot).mockResolvedValue(null)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Partido no encontrado' })
  })

  it('returns a generic 500 response', async () => {
    vi.mocked(getLiveMatchSnapshot).mockRejectedValue(new Error('database detail'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'match-1' }),
    })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'No se pudo cargar el partido en vivo',
    })
  })
})
```

- [ ] **Step 2: Verify red**

```bash
npx vitest run tests/api/live-match-snapshot.test.ts
```

Expected: FAIL because the route module does not exist.

- [ ] **Step 3: Implement the public route**

```typescript
import { NextResponse } from 'next/server'
import { getLiveMatchSnapshot } from '@/lib/live-match-snapshot'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const snapshot = await getLiveMatchSnapshot(id)
    if (!snapshot) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('live_match_snapshot_failed', {
      matchId: id,
      reason: error instanceof Error ? error.message : 'unknown_error',
    })
    return NextResponse.json(
      { error: 'No se pudo cargar el partido en vivo' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Replace the live page with the shared SSR consumer**

```typescript
import { notFound } from 'next/navigation'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
import { getLiveMatchSnapshot } from '@/lib/live-match-snapshot'

export const dynamic = 'force-dynamic'

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const snapshot = await getLiveMatchSnapshot(matchId)
  if (!snapshot) notFound()
  return <LiveScoreboard initialMatch={snapshot} />
}
```

- [ ] **Step 5: Verify green**

```bash
npx vitest run tests/lib/live-match-snapshot.test.ts tests/api/live-match-snapshot.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/matches/[id]/live/route.ts" "src/app/live/[matchId]/page.tsx" tests/api/live-match-snapshot.test.ts
git commit -m "feat: expose canonical live snapshot API"
```

### Task 3: Implement the best-effort Realtime REST publisher

**Files:**
- Create: `src/lib/supabase-realtime-server.ts`
- Create: `tests/lib/supabase-realtime-server.test.ts`

- [ ] **Step 1: Write failing publisher tests**

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { publishMatchInvalidation } from '@/lib/supabase-realtime-server'

describe('publishMatchInvalidation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('publishes only matchId', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co/')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await publishMatchInvalidation('match-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/realtime/v1/api/broadcast',
      expect.objectContaining({
        method: 'POST',
        headers: {
          apikey: 'server-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              topic: 'match:match-1',
              event: 'invalidate',
              payload: { matchId: 'match-1' },
            },
          ],
        }),
      })
    )
  })

  it('degrades without configuration', async () => {
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(publishMatchInvalidation('match-1')).resolves.toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not reject after an HTTP failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(publishMatchInvalidation('match-1')).resolves.toBeUndefined()
    expect(JSON.stringify(log.mock.calls)).not.toContain('server-secret')
  })
})
```

- [ ] **Step 2: Verify red**

```bash
npx vitest run tests/lib/supabase-realtime-server.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the publisher**

```typescript
const BROADCAST_TIMEOUT_MS = 5_000

export async function publishMatchInvalidation(matchId: string): Promise<void> {
  const normalizedMatchId = matchId.trim()
  if (!normalizedMatchId) {
    console.error('supabase_realtime_publish_failed', {
      matchId: null,
      reason: 'empty_match_id',
    })
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    console.error('supabase_realtime_publish_failed', {
      matchId: normalizedMatchId,
      reason: 'missing_configuration',
    })
    return
  }

  try {
    const response = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `match:${normalizedMatchId}`,
            event: 'invalidate',
            payload: { matchId: normalizedMatchId },
          },
        ],
      }),
      signal: AbortSignal.timeout(BROADCAST_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error('supabase_realtime_publish_failed', {
        matchId: normalizedMatchId,
        reason: 'http_error',
        status: response.status,
      })
    }
  } catch (error) {
    console.error('supabase_realtime_publish_failed', {
      matchId: normalizedMatchId,
      reason: error instanceof Error ? error.name : 'unknown_error',
    })
  }
}
```

- [ ] **Step 4: Verify green and commit**

```bash
npx vitest run tests/lib/supabase-realtime-server.test.ts
git add src/lib/supabase-realtime-server.ts tests/lib/supabase-realtime-server.test.ts
git commit -m "feat: publish live invalidations through Supabase"
```

Expected: tests PASS and commit succeeds.

### Task 4: Replace all Socket.IO producer calls

**Files:**
- Create: `tests/lib/realtime-call-sites.test.ts`
- Modify: `src/lib/match-events.ts`
- Modify: `src/lib/match-reconcile.ts`
- Modify: `src/app/api/matches/[id]/mvp/route.ts`
- Modify: `src/app/api/matches/[id]/mvp/[side]/photo/route.ts`

- [ ] **Step 1: Write the failing producer contract**

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const expectedCalls = new Map([
  ['src/lib/match-events.ts', 1],
  ['src/lib/match-reconcile.ts', 1],
  ['src/app/api/matches/[id]/mvp/route.ts', 1],
  ['src/app/api/matches/[id]/mvp/[side]/photo/route.ts', 2],
])

describe('Realtime mutation producers', () => {
  it.each([...expectedCalls])('%s awaits invalidation', (path, count) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8')
    expect(source).toContain(
      "import { publishMatchInvalidation } from '@/lib/supabase-realtime-server'"
    )
    expect(source.match(/await publishMatchInvalidation\(/g)).toHaveLength(count)
    expect(source).not.toContain('emitMatchUpdate')
    expect(source).not.toContain('@/server/socket')
  })
})
```

- [ ] **Step 2: Verify red**

```bash
npx vitest run tests/lib/realtime-call-sites.test.ts
```

Expected: FAIL in all four files.

- [ ] **Step 3: Replace each producer**

In each file, use:

```typescript
import { publishMatchInvalidation } from '@/lib/supabase-realtime-server'
```

In `src/lib/match-events.ts`, after stat synchronization:

```typescript
await publishMatchInvalidation(matchId)
return { event, match: updatedMatch }
```

In `src/lib/match-reconcile.ts`, after stat synchronization:

```typescript
await publishMatchInvalidation(matchId)
return updatedMatch
```

In the MVP `PUT` route, remove the redundant `fullMatch` query and emission, then use:

```typescript
await publishMatchInvalidation(id)
return NextResponse.json({ side: updatedSide, teamMvps })
```

In MVP photo `POST`:

```typescript
await publishMatchInvalidation(id)
return NextResponse.json({
  ok: true,
  photoUrl: matchMvpPhotoUrl(id, side),
  teamMvps,
})
```

In MVP photo `DELETE`:

```typescript
await publishMatchInvalidation(id)
return NextResponse.json({ ok: true, teamMvps })
```

- [ ] **Step 4: Run focused regressions**

```bash
npx vitest run tests/lib/realtime-call-sites.test.ts tests/lib/match-reconcile.test.ts tests/api/match-events.test.ts tests/lib/match-mvp.test.ts tests/lib/match-mvp-photo.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-events.ts src/lib/match-reconcile.ts "src/app/api/matches/[id]/mvp/route.ts" "src/app/api/matches/[id]/mvp/[side]/photo/route.ts" tests/lib/realtime-call-sites.test.ts
git commit -m "refactor: invalidate live snapshots after mutations"
```

### Task 5: Add the current Supabase browser client and subscription hook

**Files:**
- Create: `src/lib/supabase-realtime-client.ts`
- Create: `src/hooks/useMatchRealtime.ts`
- Create: `tests/lib/supabase-realtime-client.test.ts`
- Create: `tests/hooks/use-match-realtime.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the current Node.js 22-compatible SDK**

```bash
npm install @supabase/supabase-js
```

Expected: npm selects the current compatible release and updates `package.json` and `package-lock.json`. Do not replace npm's selected range with a manually chosen version.

- [ ] **Step 2: Write failing client and hook tests**

`tests/lib/supabase-realtime-client.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRealtimeClient } from '@/lib/supabase-realtime-client'

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

describe('Supabase Realtime browser client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('returns null without public configuration', () => {
    expect(getSupabaseRealtimeClient()).toBeNull()
  })

  it('disables Supabase Auth persistence', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')
    vi.mocked(createClient).mockReturnValue({} as never)
    getSupabaseRealtimeClient()
    expect(createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )
  })
})
```

`tests/hooks/use-match-realtime.test.tsx`:

```typescript
// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseRealtimeClient } from '@/lib/supabase-realtime-client'
import { useMatchRealtime, type MatchRealtimeStatus } from '@/hooks/useMatchRealtime'

vi.mock('@/lib/supabase-realtime-client', () => ({
  getSupabaseRealtimeClient: vi.fn(),
}))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function Probe({
  onInvalidate,
  onStatus,
}: {
  onInvalidate: () => void
  onStatus: (status: MatchRealtimeStatus) => void
}) {
  const status = useMatchRealtime({
    matchId: 'match-1',
    enabled: true,
    onInvalidate,
  })
  useEffect(() => onStatus(status), [onStatus, status])
  return null
}

describe('useMatchRealtime', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('subscribes, invalidates, and removes its channel', async () => {
    let broadcast: ((message: { payload: { matchId: string } }) => void) | undefined
    let subscribe: ((status: string) => void) | undefined
    const channel = {
      on: vi.fn((_type, _filter, callback) => {
        broadcast = callback
        return channel
      }),
      subscribe: vi.fn((callback) => {
        subscribe = callback
        return channel
      }),
    }
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    }
    vi.mocked(getSupabaseRealtimeClient).mockReturnValue(client as never)
    const onInvalidate = vi.fn()
    const onStatus = vi.fn()
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onInvalidate={onInvalidate} onStatus={onStatus} />)
    })
    await act(async () => subscribe?.('SUBSCRIBED'))
    await act(async () => broadcast?.({ payload: { matchId: 'match-1' } }))

    expect(client.channel).toHaveBeenCalledWith('match:match-1', {
      config: { broadcast: { self: false } },
    })
    expect(onStatus).toHaveBeenLastCalledWith('connected')
    expect(onInvalidate).toHaveBeenCalledOnce()

    await act(async () => root.unmount())
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
  })
})
```

- [ ] **Step 3: Verify red**

```bash
npx vitest run tests/lib/supabase-realtime-client.test.ts tests/hooks/use-match-realtime.test.tsx
```

Expected: FAIL because the local client and hook modules do not exist.

- [ ] **Step 4: Implement the browser client**

```typescript
'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let realtimeClient: SupabaseClient | null = null

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return null

  realtimeClient ??= createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return realtimeClient
}
```

- [ ] **Step 5: Implement the subscription hook**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getSupabaseRealtimeClient } from '@/lib/supabase-realtime-client'

export type MatchRealtimeStatus = 'connecting' | 'connected' | 'degraded'

const SUBSCRIPTION_TIMEOUT_MS = 10_000

export function useMatchRealtime({
  matchId,
  enabled,
  onInvalidate,
}: {
  matchId: string
  enabled: boolean
  onInvalidate: () => void
}): MatchRealtimeStatus {
  const [status, setStatus] = useState<MatchRealtimeStatus>('connecting')

  useEffect(() => {
    if (!enabled) {
      setStatus('degraded')
      return
    }
    const client = getSupabaseRealtimeClient()
    if (!client) {
      setStatus('degraded')
      return
    }

    let active = true
    setStatus('connecting')
    const timeout = window.setTimeout(() => {
      if (active) setStatus('degraded')
    }, SUBSCRIPTION_TIMEOUT_MS)

    const channel = client
      .channel(`match:${matchId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'invalidate' }, ({ payload }) => {
        if (active && payload?.matchId === matchId) onInvalidate()
      })
      .subscribe((subscriptionStatus) => {
        if (!active) return
        if (subscriptionStatus === 'SUBSCRIBED') {
          window.clearTimeout(timeout)
          setStatus('connected')
        } else if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT' ||
          subscriptionStatus === 'CLOSED'
        ) {
          setStatus('degraded')
        }
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
      void client.removeChannel(channel)
    }
  }, [enabled, matchId, onInvalidate])

  return status
}
```

- [ ] **Step 6: Verify green and commit**

```bash
npx vitest run tests/lib/supabase-realtime-client.test.ts tests/hooks/use-match-realtime.test.tsx
npx tsc --noEmit
git add package.json package-lock.json src/lib/supabase-realtime-client.ts src/hooks/useMatchRealtime.ts tests/lib/supabase-realtime-client.test.ts tests/hooks/use-match-realtime.test.tsx
git commit -m "feat: subscribe live matches to Supabase Realtime"
```

Expected: tests and typecheck PASS; commit succeeds.

### Task 6: Replace partial Socket.IO merging with canonical resync and polling

**Files:**
- Create: `src/hooks/useLiveMatchSnapshot.ts`
- Create: `tests/hooks/use-live-match-snapshot.test.tsx`
- Modify: `src/components/live/LiveScoreboard.tsx`

- [ ] **Step 1: Write the failing lifecycle test**

```typescript
// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMatchRealtime } from '@/hooks/useMatchRealtime'
import { useLiveMatchSnapshot } from '@/hooks/useLiveMatchSnapshot'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'

vi.mock('@/hooks/useMatchRealtime', () => ({ useMatchRealtime: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const initial = {
  id: 'match-1',
  status: 'LIVE',
  homeScore: 0,
  awayScore: 0,
} as LiveMatchSnapshot

function Probe({ onSnapshot }: { onSnapshot: (value: LiveMatchSnapshot) => void }) {
  const { snapshot } = useLiveMatchSnapshot({ initialSnapshot: initial })
  useEffect(() => onSnapshot(snapshot), [onSnapshot, snapshot])
  return null
}

describe('useLiveMatchSnapshot', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('debounces invalidations and preserves the last valid snapshot', async () => {
    vi.useFakeTimers()
    let invalidate: (() => void) | undefined
    vi.mocked(useMatchRealtime).mockImplementation((options) => {
      invalidate = options.onInvalidate
      return 'connected'
    })
    const fresh = { ...initial, homeScore: 1 }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fresh), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const values: LiveMatchSnapshot[] = []
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onSnapshot={(value) => values.push(value)} />)
      await Promise.resolve()
    })
    expect(values.at(-1)?.homeScore).toBe(1)

    await act(async () => {
      invalidate?.()
      invalidate?.()
      invalidate?.()
      vi.advanceTimersByTime(250)
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(values.at(-1)?.homeScore).toBe(1)
    await act(async () => root.unmount())
  })
})
```

- [ ] **Step 2: Verify red**

```bash
npx vitest run tests/hooks/use-live-match-snapshot.test.tsx
```

Expected: FAIL because the hook is missing.

- [ ] **Step 3: Implement canonical fetch, reconnect resync, debounce, and polling**

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useMatchRealtime,
  type MatchRealtimeStatus,
} from '@/hooks/useMatchRealtime'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'

const INVALIDATION_DEBOUNCE_MS = 250
const POLL_INTERVAL_MS = 15_000

export async function fetchLiveMatchSnapshot(
  matchId: string,
  signal?: AbortSignal
): Promise<LiveMatchSnapshot> {
  const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}/live`, {
    cache: 'no-store',
    signal,
  })
  if (!response.ok) throw new Error(`live_snapshot_http_${response.status}`)
  const snapshot = (await response.json()) as LiveMatchSnapshot
  if (snapshot.id !== matchId) throw new Error('live_snapshot_match_id_mismatch')
  return snapshot
}

export function useLiveMatchSnapshot({
  initialSnapshot,
}: {
  initialSnapshot: LiveMatchSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestRef = useRef(0)
  const previousStatusRef = useRef<MatchRealtimeStatus>('connecting')

  const resync = useCallback(async () => {
    const requestId = ++requestRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const next = await fetchLiveMatchSnapshot(initialSnapshot.id, controller.signal)
      if (requestId === requestRef.current) setSnapshot(next)
    } catch {
      // The last valid snapshot remains visible.
    }
  }, [initialSnapshot.id])

  const scheduleResync = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      void resync()
    }, INVALIDATION_DEBOUNCE_MS)
  }, [resync])

  const realtimeStatus = useMatchRealtime({
    matchId: initialSnapshot.id,
    enabled: true,
    onInvalidate: scheduleResync,
  })

  useEffect(() => {
    if (realtimeStatus === 'connected' && previousStatusRef.current !== 'connected') {
      void resync()
    }
    previousStatusRef.current = realtimeStatus
  }, [realtimeStatus, resync])

  useEffect(() => {
    if (snapshot.status !== 'LIVE' && snapshot.status !== 'HALFTIME') return
    const poll = () => {
      if (document.visibilityState === 'visible') void resync()
    }
    const interval = window.setInterval(poll, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [resync, snapshot.status])

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    },
    []
  )

  return { snapshot, realtimeStatus, resync }
}
```

- [ ] **Step 4: Update `LiveScoreboard` without shrinking its DTO**

Remove `getSocket`, `joinMatchRoom`, `RawSocketEvent`, `LiveMatchPayload`, `eventPlayerName`, `eventAssistName`, `toIso`, `toEventCreatedAt`, `teamVisualLookup`, and the Socket.IO `useEffect`.

Keep `useMemo`, `sortTimelineEvents`, and all JSX. Replace the local `Match` type and state setup with:

```typescript
import { useMemo } from 'react'
import { useLiveMatchSnapshot } from '@/hooks/useLiveMatchSnapshot'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'

export function LiveScoreboard({
  initialMatch,
}: {
  initialMatch: LiveMatchSnapshot
}) {
  const { snapshot: match } = useLiveMatchSnapshot({
    initialSnapshot: initialMatch,
  })

  const sortedEvents = useMemo(
    () =>
      sortTimelineEvents(match.events, {
        preferCreatedAt: match.preferCreatedAtOrder,
      }),
    [match.events, match.preferCreatedAtOrder]
  )

  const isLive = match.status === 'LIVE'
  const hasFormations = match.formations.some((formation) => formation.lineup)
```

- [ ] **Step 5: Verify focused behavior**

```bash
npx vitest run tests/hooks/use-match-realtime.test.tsx tests/hooks/use-live-match-snapshot.test.tsx tests/lib/live-match-snapshot.test.ts tests/api/live-match-snapshot.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLiveMatchSnapshot.ts src/components/live/LiveScoreboard.tsx tests/hooks/use-live-match-snapshot.test.tsx
git commit -m "feat: resync live matches with debounce and polling"
```

### Task 7: Migrate Middleware to Proxy with cutover controls

**Files:**
- Create: `src/lib/proxy-policy.ts`
- Create: `tests/lib/proxy-policy.test.ts`
- Rename/modify: `src/middleware.ts` → `src/proxy.ts`
- Create: `src/app/mantenimiento/page.tsx`

- [ ] **Step 1: Write failing policy tests**

```typescript
import { describe, expect, it } from 'vitest'
import { decideMigrationRequest, isPublicRequest } from '@/lib/proxy-policy'

describe('proxy policy', () => {
  it('makes only GET live snapshots public', () => {
    expect(isPublicRequest('GET', '/api/matches/match-1/live')).toBe(true)
    expect(isPublicRequest('POST', '/api/matches/match-1/live')).toBe(false)
  })

  it('blocks mutations during maintenance', () => {
    expect(
      decideMigrationRequest({
        method: 'POST',
        pathname: '/api/matches/match-1/events',
        search: '',
        accept: 'application/json',
        rsc: null,
        maintenanceMode: 'true',
        redirectUrl: undefined,
      })
    ).toEqual({
      kind: 'json',
      status: 503,
      body: { error: 'Sitio en mantenimiento por migración' },
    })
  })

  it('redirects private pages during maintenance', () => {
    expect(
      decideMigrationRequest({
        method: 'GET',
        pathname: '/admin',
        search: '',
        accept: 'text/html',
        rsc: null,
        maintenanceMode: 'true',
        redirectUrl: undefined,
      })
    ).toEqual({ kind: 'redirect', location: '/mantenimiento' })
  })

  it('preserves path and query in the Render redirect', () => {
    expect(
      decideMigrationRequest({
        method: 'GET',
        pathname: '/live/match-1',
        search: '?view=compact',
        accept: 'text/html',
        rsc: null,
        maintenanceMode: undefined,
        redirectUrl: 'https://torneos-kelme.vercel.app',
      })
    ).toEqual({
      kind: 'redirect',
      location: 'https://torneos-kelme.vercel.app/live/match-1?view=compact',
    })
  })
})
```

- [ ] **Step 2: Verify red**

```bash
npx vitest run tests/lib/proxy-policy.test.ts
```

Expected: FAIL because the policy module is missing.

- [ ] **Step 3: Implement the pure policy**

```typescript
export type MigrationDecision =
  | { kind: 'redirect'; location: string }
  | { kind: 'json'; status: 503; body: { error: string } }

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isPublicRequest(method: string, pathname: string): boolean {
  const isPhotoGet =
    method === 'GET' && /^\/api\/friendly-players\/[^/]+\/photo$/.test(pathname)
  const isTeamCrestGet =
    method === 'GET' && /^\/api\/teams\/[^/]+\/crest$/.test(pathname)
  const isMatchCrestGet =
    method === 'GET' && /^\/api\/matches\/[^/]+\/crest\/[AB]$/.test(pathname)
  const isMatchMvpPhotoGet =
    method === 'GET' &&
    /^\/api\/matches\/[^/]+\/mvp\/(home|away)\/photo$/.test(pathname)
  const isFormationsGet =
    method === 'GET' && /^\/api\/matches\/[^/]+\/formations$/.test(pathname)
  const isLiveSnapshotGet =
    method === 'GET' && /^\/api\/matches\/[^/]+\/live$/.test(pathname)
  const isClaimPost =
    method === 'POST' && pathname === '/api/friendly-players/claim'

  return (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/ayuda') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/mantenimiento') ||
    pathname.startsWith('/api/auth') ||
    isPhotoGet ||
    isTeamCrestGet ||
    isMatchCrestGet ||
    isMatchMvpPhotoGet ||
    isFormationsGet ||
    isLiveSnapshotGet ||
    isClaimPost
  )
}

export function decideMigrationRequest(input: {
  method: string
  pathname: string
  search: string
  accept: string | null
  rsc: string | null
  maintenanceMode: string | undefined
  redirectUrl: string | undefined
}): MigrationDecision | null {
  const isApi = input.pathname.startsWith('/api/')
  const isNavigation =
    input.method === 'GET' &&
    !isApi &&
    (input.accept?.includes('text/html') === true || input.rsc === '1')

  if (input.redirectUrl && isNavigation) {
    try {
      const target = new URL(input.redirectUrl)
      target.pathname = input.pathname
      target.search = input.search
      return { kind: 'redirect', location: target.toString() }
    } catch {
      return null
    }
  }

  if (input.maintenanceMode !== 'true') return null
  if (!SAFE_METHODS.has(input.method)) {
    return {
      kind: 'json',
      status: 503,
      body: { error: 'Sitio en mantenimiento por migración' },
    }
  }
  if (isNavigation && !isPublicRequest(input.method, input.pathname)) {
    return { kind: 'redirect', location: '/mantenimiento' }
  }
  return null
}
```

- [ ] **Step 4: Rename and implement Proxy**

```bash
git mv src/middleware.ts src/proxy.ts
```

Use:

```typescript
import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import authConfig from '@/lib/auth.config'
import { decideMigrationRequest, isPublicRequest } from '@/lib/proxy-policy'
import { canAccess, getDashboardPath, type Role } from '@/lib/roles'

const { auth } = NextAuth(authConfig)

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl
  const migrationDecision = decideMigrationRequest({
    method: req.method,
    pathname,
    search,
    accept: req.headers.get('accept'),
    rsc: req.headers.get('rsc'),
    maintenanceMode: process.env.MIGRATION_MAINTENANCE_MODE,
    redirectUrl: process.env.MIGRATION_REDIRECT_URL,
  })

  if (migrationDecision?.kind === 'json') {
    return NextResponse.json(migrationDecision.body, {
      status: migrationDecision.status,
    })
  }
  if (migrationDecision?.kind === 'redirect') {
    return NextResponse.redirect(new URL(migrationDecision.location, req.url))
  }
  if (isPublicRequest(req.method, pathname)) return NextResponse.next()

  if (!req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = req.auth.user.role as Role
  const area = pathname.split('/')[1] as 'admin' | 'player' | 'coach' | 'referee'
  if (
    ['admin', 'player', 'coach', 'referee'].includes(area) &&
    !canAccess(role, area)
  ) {
    return NextResponse.redirect(new URL(getDashboardPath(role), req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Create the public maintenance page**

```typescript
import Link from 'next/link'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-kelme-gray-100 px-4">
      <section className="w-full max-w-lg rounded-2xl border border-kelme-border bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <KelmeLogo size="md" />
        </div>
        <h1 className="font-display text-3xl font-bold text-kelme-gray-900">
          Estamos realizando una mejora
        </h1>
        <p className="mt-4 font-body text-kelme-gray-600">
          Torneos Kelme está en una breve ventana de mantenimiento. Vuelve a
          intentarlo en unos minutos.
        </p>
        <Link href="/" className="btn-kelme mt-6 inline-flex">
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}
```

- [ ] **Step 6: Verify green and commit**

```bash
npx vitest run tests/lib/proxy-policy.test.ts
npx tsc --noEmit
npm run build
git add src/proxy.ts src/lib/proxy-policy.ts src/app/mantenimiento/page.tsx tests/lib/proxy-policy.test.ts
git commit -m "feat: migrate request controls to Next.js proxy"
```

Expected: tests, typecheck, and build PASS; build recognizes `src/proxy.ts`.

### Task 8: Remove the custom server and standardize Node.js 22

**Files:**
- Create: `tests/lib/vercel-runtime.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Delete: `server.ts`
- Delete: `src/server/socket.ts`
- Delete: `src/lib/socket-client.ts`

- [ ] **Step 1: Write the failing runtime contract**

```typescript
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
) as {
  engines: Record<string, string>
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

describe('Vercel runtime contract', () => {
  it('targets Node.js 22 and standard Next.js commands', () => {
    expect(packageJson.engines.node).toBe('22.x')
    expect(packageJson.scripts.dev).toBe('next dev')
    expect(packageJson.scripts.build).toBe('prisma generate && next build')
    expect(packageJson.scripts.start).toBe('next start')
  })

  it('keeps the selected Supabase SDK and removes Socket.IO', () => {
    expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined()
    expect(packageJson.dependencies['socket.io']).toBeUndefined()
    expect(packageJson.dependencies['socket.io-client']).toBeUndefined()
    expect(packageJson.devDependencies.tsx).toBeDefined()
  })

  it('removes custom runtime files', () => {
    expect(existsSync(resolve(process.cwd(), 'server.ts'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/server/socket.ts'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/lib/socket-client.ts'))).toBe(false)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
npx vitest run tests/lib/vercel-runtime.test.ts
```

Expected: FAIL for old engines, scripts, dependencies, and files.

- [ ] **Step 3: Update runtime dependencies**

```bash
npm uninstall socket.io socket.io-client
npm install --save-dev "tsx@^4.20.3" @types/node@22
```

Expected: Socket.IO is absent, `tsx` is under `devDependencies`, Node types target 22, and the lockfile is updated.

- [ ] **Step 4: Update package metadata**

Set:

```json
{
  "engines": {
    "node": "22.x"
  },
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:seed:demo": "tsx prisma/seed-demo.ts",
    "db:clear:demo": "tsx prisma/clear-demo.ts",
    "icons": "node scripts/generate-icons.mjs"
  }
}
```

- [ ] **Step 5: Delete obsolete runtime files**

```bash
git rm server.ts src/server/socket.ts src/lib/socket-client.ts
```

- [ ] **Step 6: Update `.env.example`**

```dotenv
# Local (desarrollo)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liga_futbol"
AUTH_SECRET="genera-un-secreto-largo-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Supabase Realtime
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_SECRET_KEY=""

# Controles temporales del corte; mantener desactivados en Vercel
MIGRATION_MAINTENANCE_MODE="false"
MIGRATION_REDIRECT_URL=""

# Producción actual Render + Neon:
#   DATABASE_URL -> cadena de conexión de Neon con ?sslmode=require
#   DIRECT_URL   -> conexión directa usada por Prisma CLI
#   AUTH_SECRET  -> conservar el mismo secreto durante la migración
#   NEXTAUTH_URL -> URL pública del entorno
```

- [ ] **Step 7: Verify no Socket.IO references remain**

```bash
rg "emitMatchUpdate|socket\.io|socket-client|NEXT_PUBLIC_SOCKET_URL|tsx server\.ts" src package.json .env.example
```

Expected: no matches.

- [ ] **Step 8: Verify green and commit**

```bash
npx vitest run tests/lib/vercel-runtime.test.ts
npx tsc --noEmit
npm run build
git add package.json package-lock.json .env.example tests/lib/vercel-runtime.test.ts
git add -u server.ts src/server/socket.ts src/lib/socket-client.ts
git commit -m "refactor: use the standard Node.js 22 Vercel runtime"
```

Expected: tests, typecheck, and build PASS; commit succeeds.

### Task 9: Run phase-1 acceptance

**Files:**
- Verify only; no file changes expected.

- [ ] **Step 1: Run the full automated suite**

```bash
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: all three commands PASS.

- [ ] **Step 2: Start the standard production server**

```bash
npm start
```

Expected: `next start` serves port 3000 without `server.ts` or Socket.IO.

- [ ] **Step 3: Test degraded live behavior**

Run without Supabase variables and open a `LIVE` match.

Expected:
- SSR snapshot renders;
- Realtime status degrades without a crash;
- visible polling refreshes after 15 seconds;
- a failed fetch leaves the previous snapshot visible.

- [ ] **Step 4: Test Realtime with two browser sessions**

Configure the three Supabase variables before rebuilding. Open the same live match in two browser sessions, then create, edit, and delete an event; assign an MVP; upload and delete an MVP photo.

Expected:
- every mutation succeeds;
- each invalidation triggers one debounced snapshot fetch;
- the spectator receives edits and deletions through full-state replacement;
- Broadcast contains only `{ matchId }`.

- [ ] **Step 5: Test maintenance mode**

Set `MIGRATION_MAINTENANCE_MODE=true`.

Expected:
- mutation requests return `503` JSON;
- `/admin` redirects to `/mantenimiento`;
- `/live/<id>` and `GET /api/matches/<id>/live` remain public.

- [ ] **Step 6: Test the Render redirect**

Set `MIGRATION_REDIRECT_URL=https://torneos-kelme.vercel.app`.

Expected:
- browser page navigation preserves path and query on the Vercel host;
- API reads and mutation requests are not redirected.

- [ ] **Step 7: Verify final scope**

```bash
git status --short
git diff --check
```

Expected:
- no uncommitted files after the task commits;
- no whitespace errors;
- no Prisma, database, migration, `render.yaml`, or unrelated UI changes.

## Execution Handoff

Plan complete at `docs/superpowers/plans/2026-08-03-realtime-vercel-compatibility.md`.

Execution options:

1. **Subagent-Driven (recommended)** — use `superpowers:subagent-driven-development`, one task at a time with review between tasks.
2. **Inline Execution** — use `superpowers:executing-plans`, execute in batches with explicit checkpoints.
