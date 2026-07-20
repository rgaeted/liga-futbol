# Cronología editable y reloj automático — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reloj automático de partido (pausa en entretiempo) para árbitro y live, más CRUD admin de cronología con recálculo de marcador y stats.

**Architecture:** Timestamps en `Match` (`clockStartedAt`, `secondHalfStartedAt`, `halftimeAt`) + helper `getMatchMinute`. `registerMatchEvent` calcula minuto y actualiza reloj en KICKOFF/HALFTIME/FULLTIME. Admin edita vía PATCH/DELETE con `reconcileMatchState`. Hook `useMatchClock` compartido en árbitro y live.

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, Vitest, Socket.io.

**Spec:** `docs/superpowers/specs/2026-07-20-cronologia-reloj-design.md`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Campos de reloj en `Match` |
| `src/lib/match-clock.ts` | CREAR — `getMatchMinute`, tipos clock |
| `src/lib/match-reconcile.ts` | CREAR — `reconcileMatchState`, `syncLeaguePlayerStats` |
| `src/lib/match-events.ts` | MODIFICAR — auto minute, clock updates |
| `src/lib/validations/match-event.ts` | MODIFICAR — `minute` opcional; schema admin update |
| `src/app/api/matches/[id]/events/route.ts` | MODIFICAR — resolver minute, validar status |
| `src/app/api/matches/[id]/events/[eventId]/route.ts` | CREAR — PATCH/DELETE admin |
| `src/app/api/matches/[id]/clock/route.ts` | CREAR — GET público |
| `src/hooks/useMatchClock.ts` | CREAR — ticker client-side |
| `src/components/referee/MatchControlPanel.tsx` | MODIFICAR — reloj, sin input |
| `src/components/live/LiveScoreboard.tsx` | MODIFICAR — reloj en vivo |
| `src/components/live/MatchClockDisplay.tsx` | CREAR — UI reloj |
| `src/components/admin/MatchTimelineEditor.tsx` | CREAR — CRUD cronología |
| `src/app/(dashboard)/admin/matches/[id]/timeline/page.tsx` | CREAR — página admin |
| `src/app/(dashboard)/admin/matches/page.tsx` | MODIFICAR — link cronología |
| `src/app/(dashboard)/referee/match/[id]/page.tsx` | MODIFICAR — pasar clock fields |
| `src/app/live/[matchId]/page.tsx` | MODIFICAR — pasar clock fields SSR |
| `src/server/socket.ts` | MODIFICAR — clock fields en payload |
| `tests/lib/match-clock.test.ts` | CREAR |
| `tests/lib/match-reconcile.test.ts` | CREAR |
| `tests/api/match-events.test.ts` | MODIFICAR |

---

### Task 1: Schema Prisma + migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260720200000_match_clock/migration.sql`

- [ ] **Step 1: Agregar campos en `Match`**

```prisma
  clockStartedAt      DateTime?
  secondHalfStartedAt DateTime?
  halftimeAt          DateTime?
```

- [ ] **Step 2: Crear migración y aplicar**

Run: `npx prisma migrate dev --name match_clock`

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add match clock timestamp fields"
```

---

### Task 2: Helper getMatchMinute

**Files:**
- Create: `src/lib/match-clock.ts`
- Create: `tests/lib/match-clock.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { getMatchMinute } from '@/lib/match-clock'
import { MatchStatus } from '@prisma/client'

const base = {
  clockStartedAt: null as Date | null,
  secondHalfStartedAt: null as Date | null,
  halftimeAt: null as Date | null,
}

describe('getMatchMinute', () => {
  it('returns 0 when scheduled', () => {
    expect(getMatchMinute({ ...base, status: MatchStatus.SCHEDULED }, new Date())).toBe(0)
  })

  it('counts first half minutes', () => {
    const now = new Date('2026-07-20T15:23:00Z')
    const started = new Date('2026-07-20T15:00:00Z')
    expect(
      getMatchMinute(
        { ...base, status: MatchStatus.LIVE, clockStartedAt: started },
        now
      )
    ).toBe(23)
  })

  it('freezes at halftime', () => {
    const started = new Date('2026-07-20T15:00:00Z')
    const halftime = new Date('2026-07-20T15:45:00Z')
    const now = new Date('2026-07-20T16:00:00Z')
    expect(
      getMatchMinute(
        {
          ...base,
          status: MatchStatus.HALFTIME,
          clockStartedAt: started,
          halftimeAt: halftime,
        },
        now
      )
    ).toBe(45)
  })

  it('counts second half from 45', () => {
    const second = new Date('2026-07-20T16:00:00Z')
    const now = new Date('2026-07-20T16:12:00Z')
    expect(
      getMatchMinute(
        {
          ...base,
          status: MatchStatus.LIVE,
          clockStartedAt: new Date('2026-07-20T15:00:00Z'),
          secondHalfStartedAt: second,
        },
        now
      )
    ).toBe(57)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/lib/match-clock.test.ts`

- [ ] **Step 3: Implement**

```typescript
import { MatchStatus } from '@prisma/client'

export type MatchClockFields = {
  status: MatchStatus
  clockStartedAt: Date | null
  secondHalfStartedAt: Date | null
  halftimeAt: Date | null
}

export function getMatchMinute(match: MatchClockFields, now: Date = new Date()): number {
  if (match.status === MatchStatus.HALFTIME && match.clockStartedAt && match.halftimeAt) {
    const ms = match.halftimeAt.getTime() - match.clockStartedAt.getTime()
    return Math.max(0, Math.floor(ms / 60_000))
  }

  if (match.status === MatchStatus.LIVE) {
    if (match.secondHalfStartedAt) {
      const ms = now.getTime() - match.secondHalfStartedAt.getTime()
      return 45 + Math.max(0, Math.floor(ms / 60_000))
    }
    if (match.clockStartedAt) {
      const ms = now.getTime() - match.clockStartedAt.getTime()
      return Math.max(0, Math.floor(ms / 60_000))
    }
  }

  return 0
}

export function formatMatchMinute(minute: number): string {
  return `${minute}'`
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

---

### Task 3: reconcileMatchState + syncLeaguePlayerStats

**Files:**
- Create: `src/lib/match-reconcile.ts`
- Create: `tests/lib/match-reconcile.test.ts`

- [ ] **Step 1: Implement `computeScoresFromEvents` (pure function, testable)**

```typescript
import { EventType, MatchType, type MatchEvent } from '@prisma/client'

export function computeScoresFromEvents(
  matchType: MatchType,
  homeTeamId: string | null,
  awayTeamId: string | null,
  events: Pick<MatchEvent, 'type' | 'teamId' | 'side'>[]
): { homeScore: number; awayScore: number } {
  let homeScore = 0
  let awayScore = 0

  for (const e of events) {
    if (matchType === MatchType.FRIENDLY) {
      if (e.type === EventType.GOAL && e.side === 'A') homeScore += 1
      if (e.type === EventType.GOAL && e.side === 'B') awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.side === 'A') awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.side === 'B') homeScore += 1
    } else {
      if (e.type === EventType.GOAL && e.teamId === homeTeamId) homeScore += 1
      if (e.type === EventType.GOAL && e.teamId === awayTeamId) awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.teamId === homeTeamId) awayScore += 1
      if (e.type === EventType.OWN_GOAL && e.teamId === awayTeamId) homeScore += 1
    }
  }

  return { homeScore, awayScore }
}
```

- [ ] **Step 2: Tests for computeScoresFromEvents**

- [ ] **Step 3: Implement `syncLeaguePlayerStats(playerId)` and `reconcileMatchState(matchId)`**

Uses `db.matchEvent.count` filtered by `match.matchType LEAGUE` for goals/cards.

- [ ] **Step 4: Commit**

---

### Task 4: registerMatchEvent — auto minute + clock

**Files:**
- Modify: `src/lib/match-events.ts`
- Modify: `src/lib/validations/match-event.ts`

- [ ] **Step 1: Make `minute` optional in schema**

```typescript
minute: z.number().int().min(0).max(130).optional(),
```

- [ ] **Step 2: Update registerMatchEvent signature**

Add param `options?: { minuteOverride?: number }`. Resolve:

```typescript
const minute = options?.minuteOverride ?? getMatchMinute(match, new Date())
```

- [ ] **Step 3: Clock updates on control events**

```typescript
const clockUpdate: Partial<Match> = {}
if (input.type === EventType.KICKOFF) {
  if (match.status === MatchStatus.SCHEDULED) clockUpdate.clockStartedAt = new Date()
  if (match.status === MatchStatus.HALFTIME) clockUpdate.secondHalfStartedAt = new Date()
}
if (input.type === EventType.HALFTIME) clockUpdate.halftimeAt = new Date()
```

Merge into `db.match.update`.

- [ ] **Step 4: Extend socket payload with clock fields**

- [ ] **Step 5: Commit**

---

### Task 5: API events POST + clock GET + PATCH/DELETE

**Files:**
- Modify: `src/app/api/matches/[id]/events/route.ts`
- Create: `src/app/api/matches/[id]/events/[eventId]/route.ts`
- Create: `src/app/api/matches/[id]/clock/route.ts`

- [ ] **Step 1: POST — reject game events if not LIVE (referee only)**

- [ ] **Step 2: POST — pass minute from body only if ADMIN**

- [ ] **Step 3: PATCH admin with updateMatchEventSchema**

```typescript
export const updateMatchEventSchema = z.object({
  type: z.nativeEnum(EventType).optional(),
  minute: z.number().int().min(0).max(130).optional(),
  playerId: id.optional().nullable(),
  teamId: id.optional().nullable(),
  friendlyPlayerId: id.optional().nullable(),
  side: z.enum(['A', 'B']).optional().nullable(),
  description: z.string().optional().nullable(),
})
```

- [ ] **Step 4: DELETE admin → reconcileMatchState**

- [ ] **Step 5: GET clock — public JSON**

- [ ] **Step 6: Commit**

---

### Task 6: useMatchClock + MatchClockDisplay

**Files:**
- Create: `src/hooks/useMatchClock.ts`
- Create: `src/components/live/MatchClockDisplay.tsx`

- [ ] **Step 1: Hook ticks every second when LIVE**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { getMatchMinute, type MatchClockFields } from '@/lib/match-clock'

export function useMatchClock(match: MatchClockFields) {
  const [minute, setMinute] = useState(() => getMatchMinute(match))

  useEffect(() => {
    setMinute(getMatchMinute(match))
    if (match.status !== 'LIVE' && match.status !== 'HALFTIME') return
    const id = setInterval(() => setMinute(getMatchMinute(match)), 1000)
    return () => clearInterval(id)
  }, [match.status, match.clockStartedAt, match.secondHalfStartedAt, match.halftimeAt])

  return minute
}
```

Note: pass serializable dates from server as ISO strings, parse in component.

- [ ] **Step 2: MatchClockDisplay component**

- [ ] **Step 3: Commit**

---

### Task 7: MatchControlPanel — reloj automático

**Files:**
- Modify: `src/components/referee/MatchControlPanel.tsx`
- Modify: `src/app/(dashboard)/referee/match/[id]/page.tsx`

- [ ] **Step 1: Remove minute input; add clock props**

Props add: `clockStartedAt`, `secondHalfStartedAt`, `halftimeAt` (ISO strings | null)

- [ ] **Step 2: Dynamic KICKOFF label**

`status === 'HALFTIME' ? '▶ 2.º tiempo' : '▶ Inicio'`

- [ ] **Step 3: POST body without minute**

- [ ] **Step 4: Commit**

---

### Task 8: LiveScoreboard — reloj público

**Files:**
- Modify: `src/components/live/LiveScoreboard.tsx`
- Modify: `src/app/live/[matchId]/page.tsx`
- Modify: `src/server/socket.ts`

- [ ] **Step 1: Pass clock fields in SSR match object**

- [ ] **Step 2: Show MatchClockDisplay when LIVE/HALFTIME**

- [ ] **Step 3: Update socket handler to merge clock fields from payload**

- [ ] **Step 4: Commit**

---

### Task 9: Admin timeline UI

**Files:**
- Create: `src/components/admin/MatchTimelineEditor.tsx`
- Create: `src/app/(dashboard)/admin/matches/[id]/timeline/page.tsx`
- Modify: `src/app/(dashboard)/admin/matches/page.tsx`

- [ ] **Step 1: Server page loads match + events + rosters**

- [ ] **Step 2: MatchTimelineEditor — table, edit, delete, add form**

Texts es-CL: «Editar cronología», «Guardar», «Eliminar evento», confirmación.

- [ ] **Step 3: Link «Cronología» en lista admin**

- [ ] **Step 4: Commit**

---

### Task 10: Tests finales + verificación

- [ ] **Step 1: Update match-events validation tests (minute optional)**

- [ ] **Step 2: Run full suite**

Run: `npx vitest run && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: editable match timeline and automatic match clock"
```
