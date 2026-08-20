# Roster unificado por empresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar el roster de cada empresa en `Player` (migrar `FriendlyPlayer`), para que cualquier jugador de la org pueda jugar amistosos, con filtros por equipo/categoría al convocar.

**Architecture:** Corte limpio: backfill SQL mapea `FriendlyPlayer` → `Player`, reapunta participaciones/eventos/MVP, elimina dual-FK. Dominio y UI usan solo `playerId`. Categorías amistosas pasan a join `Player`↔`FriendlyCategory`. Admin queda en una sola pantalla Jugadores.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Zod, Vitest, Auth.js.

**Spec:** `docs/superpowers/specs/2026-08-20-roster-unificado-design.md`

## Global Constraints

- UI copy: español chileno, tú (no voseo).
- Commits: uno por task. No commitear `.env`, `docs/handoff/`, `.superpowers/`, `supabase/.temp/`.
- Tras cambios Prisma: `npx prisma generate` y luego tests.
- Unique indexes en SQL **después** del backfill, **antes** de `SET NOT NULL` cuando aplique.
- App móvil `/api/mobile/v1/*` no cambia contrato (sigue liga).
- Contadores `Player.goals` etc. siguen siendo cache de **liga** solamente.

## File Map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Player fields + PlayerCategory; FriendlyMatchPlayer.playerId; drop FriendlyPlayer |
| `prisma/migrations/20260820120000_unified_roster/` | SQL backfill + drop |
| `scripts/verify-unified-roster.ts` | Conteos pre/post y huérfanos |
| `src/lib/friendly-match-captain.ts` | Roster entry usa `playerId` |
| `src/lib/friendly-match-coach.ts` | Idem |
| `src/lib/friendly-match-roster.ts` | Sync convocatoria con `playerId` |
| `src/lib/player-categories.ts` | Set categorías de un Player |
| `src/lib/person-merge.ts` | Solo Player (sin friendlyOrgIds) |
| `src/app/api/admin/persons/[id]/career/route.ts` | Career vía playerIds + matchType |
| `src/lib/validations/player.ts` | Alta/edición con categorías opcionales |
| `src/app/api/players/route.ts` | Filtros teamId/categoryId/q |
| `src/app/api/players/[id]/route.ts` | Update categorías + perfil |
| `src/lib/validations/match-event.ts` | Sin friendlyPlayerId |
| `src/app/api/matches/[id]/events/route.ts` | Solo playerId |
| `src/components/referee/MatchControlPanel.tsx` | Un camino playerId |
| `src/components/admin/FriendlyMatchConvocationPicker.tsx` | Filtro equipo + agregar todos |
| `src/app/(tenant)/.../admin/players/` | Pantalla unificada |
| `src/app/(tenant)/.../admin/layout.tsx` | Nav sin “Amistosos” pool |
| `src/app/api/friendly-players/**` | Eliminar o 410 |

---

### Task 1: Roster entry usa `playerId` (dominio puro)

**Files:**
- Modify: `src/lib/friendly-match-captain.ts`
- Modify: `src/lib/friendly-match-coach.ts`
- Modify: `tests/lib/friendly-match-captain.test.ts` (o crear si no existe)
- Test: `tests/lib/friendly-roster-entry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { validateFriendlyCaptains, captainsFromRoster } from '@/lib/friendly-match-captain'
import { validateFriendlyRoster } from '@/lib/friendly-match-roster'

describe('friendly roster playerId', () => {
  it('validates captains with playerId', () => {
    const roster = [
      { playerId: 'p1', side: 'A' as const, isCaptain: true },
      { playerId: 'p2', side: 'B' as const, isCaptain: true },
    ]
    expect(validateFriendlyCaptains(roster)).toBeNull()
    expect(captainsFromRoster(roster)).toEqual({
      sideACaptainId: 'p1',
      sideBCaptainId: 'p2',
    })
  })

  it('rejects duplicate playerId', () => {
    expect(
      validateFriendlyRoster([
        { playerId: 'p1', side: 'A', isCaptain: true, isCoach: true },
        { playerId: 'p1', side: 'B', isCaptain: true, isCoach: true },
      ]),
    ).toMatch(/dos veces/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/friendly-roster-entry.test.ts`
Expected: FAIL (property `friendlyPlayerId` still required / missing `playerId`)

- [ ] **Step 3: Update types and validators**

In `friendly-match-captain.ts`, change:

```ts
export type FriendlyRosterEntry = {
  playerId: string
  side: 'A' | 'B'
  isCaptain?: boolean
  isCoach?: boolean
}
```

Replace every `friendlyPlayerId` in that file and `friendly-match-coach.ts` with `playerId`.

In `friendly-match-roster.ts` `validateFriendlyRoster`:

```ts
const ids = players.map((p) => p.playerId)
```

Leave `syncFriendlyMatchRoster` compile-broken until Task 5 (or temporarily dual-read) — prefer updating the type now and fixing sync in Task 5 in the same PR wave. **If TypeScript blocks commits**, update sync in this task to use `playerId` against a still-pending Prisma field by typing via `as any` only as last resort; better: do Task 2 schema additive columns first if needed.

**Recommended order if blocked:** finish Task 2 steps 1–3 (add nullable `playerId` column) before completing this step’s roster sync.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/lib/friendly-roster-entry.test.ts tests/lib/friendly-match-captain.test.ts`
Expected: PASS for unit validators

- [ ] **Step 5: Commit**

```bash
git add src/lib/friendly-match-captain.ts src/lib/friendly-match-coach.ts src/lib/friendly-match-roster.ts tests/lib/friendly-roster-entry.test.ts
git commit -m "refactor: friendly roster entries use playerId"
```

---

### Task 2: Prisma schema — columnas aditivas

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Extend `Player`**

Add optional profile fields and relations:

```prisma
model Player {
  // ...existing fields...
  dominantFoot        DominantFoot?
  primaryPosition     String?
  secondaryPosition   String?
  categories          PlayerCategory[]
  friendlyParticipations FriendlyMatchPlayer[]
}
```

- [ ] **Step 2: Add `PlayerCategory` and wire `FriendlyCategory`**

```prisma
model PlayerCategory {
  playerId           String
  player             Player           @relation(fields: [playerId], references: [id], onDelete: Cascade)
  friendlyCategoryId String
  friendlyCategory   FriendlyCategory @relation(fields: [friendlyCategoryId], references: [id], onDelete: Cascade)
  createdAt          DateTime         @default(now())

  @@id([playerId, friendlyCategoryId])
}

model FriendlyCategory {
  // keep playerMemberships FriendlyPlayerCategory[] until drop
  playerLinks PlayerCategory[]
}
```

- [ ] **Step 3: Add `FriendlyMatchPlayer.playerId` nullable**

```prisma
model FriendlyMatchPlayer {
  // keep friendlyPlayerId temporarily
  playerId String?
  player   Player? @relation(fields: [playerId], references: [id])
}
```

Also add nullable `playerId` remaps nowhere else yet — MatchEvent keeps both FKs until migration.

- [ ] **Step 4: Generate client**

Run: `npx prisma generate`
Expected: success

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add PlayerCategory and FriendlyMatchPlayer.playerId columns"
```

Note: migration SQL is Task 3 (do not `db push` to prod).

---

### Task 3: Migración SQL + backfill

**Files:**
- Create: `prisma/migrations/20260820120000_unified_roster/migration.sql`

- [ ] **Step 1: Write migration SQL (structure)**

```sql
-- 1) Additive columns
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "dominantFoot" "DominantFoot";
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "primaryPosition" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "secondaryPosition" TEXT;

CREATE TABLE IF NOT EXISTS "PlayerCategory" (
  "playerId" TEXT NOT NULL,
  "friendlyCategoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerCategory_pkey" PRIMARY KEY ("playerId", "friendlyCategoryId")
);

ALTER TABLE "FriendlyMatchPlayer" ADD COLUMN IF NOT EXISTS "playerId" TEXT;

-- 2) Map table
CREATE TEMP TABLE fp_map (
  "friendlyPlayerId" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL
);

-- 3) Reuse existing Player when same person+org
INSERT INTO fp_map ("friendlyPlayerId", "playerId")
SELECT fp."id", p."id"
FROM "FriendlyPlayer" fp
JOIN "Player" p
  ON p."personId" = fp."personId"
 AND p."organizationId" = fp."organizationId";

-- 4) Create Player for FriendlyPlayer without league ficha
INSERT INTO "Player" (
  "id", "organizationId", "personId", "teamId",
  "dominantFoot", "primaryPosition", "secondaryPosition",
  "goals", "assists", "yellowCards", "redCards",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, -- if cuid required, use extension or app script; prefer cuid via prisma $execute in script
  fp."organizationId",
  fp."personId",
  NULL,
  fp."dominantFoot",
  fp."primaryPosition",
  fp."secondaryPosition",
  0, 0, 0, 0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "FriendlyPlayer" fp
WHERE NOT EXISTS (
  SELECT 1 FROM "Player" p
  WHERE p."personId" = fp."personId" AND p."organizationId" = fp."organizationId"
);

-- Re-insert map for newly created (same join as step 3 covering all)
TRUNCATE fp_map;
INSERT INTO fp_map ("friendlyPlayerId", "playerId")
SELECT fp."id", p."id"
FROM "FriendlyPlayer" fp
JOIN "Player" p
  ON p."personId" = fp."personId"
 AND p."organizationId" = fp."organizationId";

-- 5) Copy Person photo from FriendlyPlayer when Person empty
UPDATE "Person" pe
SET
  "photoMimeType" = fp."photoMimeType",
  "photoData" = fp."photoData"
FROM "FriendlyPlayer" fp
WHERE pe."id" = fp."personId"
  AND pe."photoData" IS NULL
  AND fp."photoData" IS NOT NULL;

-- 6) Categories
INSERT INTO "PlayerCategory" ("playerId", "friendlyCategoryId", "createdAt")
SELECT m."playerId", fpc."friendlyCategoryId", CURRENT_TIMESTAMP
FROM "FriendlyPlayerCategory" fpc
JOIN fp_map m ON m."friendlyPlayerId" = fpc."friendlyPlayerId"
ON CONFLICT DO NOTHING;

-- 7) Participations: set playerId
UPDATE "FriendlyMatchPlayer" fmp
SET "playerId" = m."playerId"
FROM fp_map m
WHERE fmp."friendlyPlayerId" = m."friendlyPlayerId";

-- Collapse duplicate (matchId, playerId): keep richest row
-- (implement DELETE USING window or script — must be explicit)

-- 8) MatchEvent remap
UPDATE "MatchEvent" e
SET "playerId" = COALESCE(e."playerId", m."playerId")
FROM fp_map m
WHERE e."friendlyPlayerId" = m."friendlyPlayerId";

UPDATE "MatchEvent" e
SET "assistPlayerId" = COALESCE(e."assistPlayerId", m."playerId")
FROM fp_map m
WHERE e."assistFriendlyPlayerId" = m."friendlyPlayerId";

-- 9) MVP remap
UPDATE "MatchTeamMvp" mvp
SET "playerId" = COALESCE(mvp."playerId", m."playerId")
FROM fp_map m
WHERE mvp."friendlyPlayerId" = m."friendlyPlayerId";

-- 10) NOT NULL + FKs + drop legacy (after verify counts in Task 4 on staging)
ALTER TABLE "FriendlyMatchPlayer" ALTER COLUMN "playerId" SET NOT NULL;
-- drop friendlyPlayerId column, FriendlyPlayerCategory, FriendlyPlayer, event friendly FKs
```

**Important:** Prefer generating Player ids with `cuid()` from a Node backfill script if SQL `gen_random_uuid` breaks id conventions. Acceptable approach: migration only adds columns; `scripts/migrate-unified-roster.ts` does mapping with Prisma; second migration drops legacy. Document which path you take in the commit message.

- [ ] **Step 2: Preferred implementation — Node backfill script**

Create `scripts/migrate-unified-roster.ts` that:
1. Loads all FriendlyPlayer with categories
2. For each, findOrCreate Player
3. Writes PlayerCategory, updates FriendlyMatchPlayer.playerId, remaps events/MVP
4. Prints counts
5. Does **not** drop tables (Task 4 verify, Task 5 drop)

- [ ] **Step 3: Dry-run locally**

Run against preview/local DB: `npx tsx scripts/migrate-unified-roster.ts`
Expected: log `friendlyPlayers=N mapped=N participationsUpdated=... eventsUpdated=...`

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations scripts/migrate-unified-roster.ts prisma/schema.prisma
git commit -m "feat: migrate FriendlyPlayer rows onto Player roster"
```

---

### Task 4: Verify script + collapse duplicates

**Files:**
- Create: `scripts/verify-unified-roster.ts`
- Test: `tests/scripts/unified-roster-map.test.ts` (pure helpers extracted from script)

- [ ] **Step 1: Extract pure helper + test**

```ts
// src/lib/unified-roster-map.ts
export function pickParticipationWinner<T extends {
  paid: boolean
  isGalleta: boolean
  isCaptain: boolean
  isCoach: boolean
}>(rows: T[]): T {
  return [...rows].sort((a, b) => {
    const score = (r: T) =>
      Number(r.isCaptain) * 8 + Number(r.isCoach) * 4 + Number(r.paid) * 2 + Number(r.isGalleta)
    return score(b) - score(a)
  })[0]
}
```

```ts
import { describe, expect, it } from 'vitest'
import { pickParticipationWinner } from '@/lib/unified-roster-map'

it('prefers captain/paid rows', () => {
  const winner = pickParticipationWinner([
    { paid: false, isGalleta: true, isCaptain: false, isCoach: false },
    { paid: true, isGalleta: false, isCaptain: true, isCoach: false },
  ])
  expect(winner.isCaptain).toBe(true)
})
```

- [ ] **Step 2: Verify script checks**

- `FriendlyMatchPlayer` with null `playerId` = 0
- Count participations == count distinct (matchId, playerId) after collapse
- Events with friendlyPlayerId set either 0 (post-drop) or all remapped to playerId
- Every former FriendlyPlayer person+org has a Player

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/scripts/unified-roster-map.test.ts`  
(or `tests/lib/unified-roster-map.test.ts`)

- [ ] **Step 4: Commit**

```bash
git add src/lib/unified-roster-map.ts tests/lib/unified-roster-map.test.ts scripts/verify-unified-roster.ts
git commit -m "feat: verify unified roster migration integrity"
```

---

### Task 5: Sync convocatoria + drop dual columns in schema

**Files:**
- Modify: `src/lib/friendly-match-roster.ts`
- Modify: `prisma/schema.prisma` (remove FriendlyPlayer model and friendly FKs)
- Create: `prisma/migrations/20260820130000_unified_roster_drop/migration.sql`

- [ ] **Step 1: Update `syncFriendlyMatchRoster`**

Replace all `friendlyPlayerId` with `playerId` in create/update/delete and in `matchEvent.updateMany` filters:

```ts
await tx.matchEvent.updateMany({
  where: { matchId, playerId: entry.playerId },
  data: { side: entry.side },
})
```

- [ ] **Step 2: Drop schema models/fields**

- Remove `FriendlyPlayer`, `FriendlyPlayerCategory`
- Remove `MatchEvent.friendlyPlayerId`, `assistFriendlyPlayerId`
- Remove `MatchTeamMvp.friendlyPlayerId`
- Remove `FriendlyMatchPlayer.friendlyPlayerId`
- Remove `Person.friendlyPlayers`, `Organization.friendlyPlayers`
- Keep `FriendlyCategory` + `PlayerCategory`

- [ ] **Step 3: SQL drop migration** mirroring schema

- [ ] **Step 4: `npx prisma generate` + compile**

Run: `npx tsc --noEmit` (or project’s typecheck) and fix breakages only in files touched this task if small; otherwise leave intentional failures for following tasks.

- [ ] **Step 5: Commit**

```bash
git add prisma src/lib/friendly-match-roster.ts
git commit -m "feat: drop FriendlyPlayer dual-FK after roster cutover"
```

---

### Task 6: Person merge + career API

**Files:**
- Modify: `src/lib/person-merge.ts`
- Modify: `tests/lib/person-merge.test.ts`
- Modify: `src/app/api/admin/persons/merge/route.ts`
- Modify: `src/app/api/plataforma/persons/merge/route.ts`
- Modify: `src/app/api/admin/persons/[id]/career/route.ts`
- Modify: `tests/lib/person-career.test.ts` (if query helpers change)

- [ ] **Step 1: Failing merge test — no friendlyOrgIds**

```ts
it('plans org merge using only player fichas', () => {
  expect(
    planOrgMerge({
      organizationId: 'org-1',
      source: { id: 'a', userId: null, playerOrgIds: ['org-1'] },
      dest: { id: 'b', userId: null, playerOrgIds: [] },
    }).movePlayerOrgIds,
  ).toEqual(['org-1'])
})
```

Update `PersonMergeSnapshot` to drop `friendlyOrgIds`. Conflict when both have Player in org.

- [ ] **Step 2: Implement merge snapshot/API without FriendlyPlayer updates**

- [ ] **Step 3: Career route**

Load person’s `players` for org; collect player ids; query:

```ts
events where playerId|assistPlayerId in ids
participations where playerId in ids (friendly matches)
mvp where playerId in ids
```

Classify league vs friendly by `match.matchType`.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/lib/person-merge.test.ts tests/lib/person-career.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/person-merge.ts src/app/api/admin/persons src/app/api/plataforma/persons tests/lib/person-merge.test.ts
git commit -m "refactor: person merge and career use unified Player roster"
```

---

### Task 7: Validaciones y categorías de Player

**Files:**
- Create: `src/lib/player-categories.ts`
- Modify: `src/lib/validations/player.ts`
- Modify: `src/lib/validations/friendly-player.ts` (delete or re-export deprecated)
- Test: `tests/lib/player-categories.test.ts`

- [ ] **Step 1: Failing test for setPlayerCategories**

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (fn) => fn({
      playerCategory: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    })),
  },
}))

import { setPlayerCategories } from '@/lib/player-categories'
import { db } from '@/lib/db'

it('replaces category set', async () => {
  const tx = {
    playerCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
  }
  vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(tx as never))
  await setPlayerCategories('player-1', ['cat-1', 'cat-2'])
  expect(tx.playerCategory.deleteMany).toHaveBeenCalledWith({ where: { playerId: 'player-1' } })
  expect(tx.playerCategory.createMany).toHaveBeenCalled()
})
```

- [ ] **Step 2: Implement `setPlayerCategories`**

- [ ] **Step 3: Extend Zod**

```ts
export const updatePlayerSchema = z.object({
  teamId: id.nullable().optional(),
  jerseyNumber: z.number().int().min(1).max(99).nullable().optional(),
  position: z.string().nullable().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  dominantFoot: z.enum(['LEFT', 'RIGHT', 'BOTH']).nullable().optional(),
  primaryPosition: z.string().nullable().optional(),
  secondaryPosition: z.string().nullable().optional(),
  categoryIds: z.array(id).optional(),
})

export const createPlayerSchema = z.object({
  // keep account path OR name-only path:
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  teamId: id.optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().optional(),
  categoryIds: z.array(id).optional(),
}).superRefine((val, ctx) => {
  const hasAccount = Boolean(val.email && val.password && val.name)
  const hasNames = Boolean(val.firstName)
  if (!hasAccount && !hasNames) {
    ctx.addIssue({ code: 'custom', message: 'Indica nombre o cuenta de acceso' })
  }
})
```

- [ ] **Step 4: Run tests + commit**

```bash
git add src/lib/player-categories.ts src/lib/validations/player.ts tests/lib/player-categories.test.ts
git commit -m "feat: player category tags and unified player validation"
```

---

### Task 8: API `/api/players` con filtros

**Files:**
- Modify: `src/app/api/players/route.ts`
- Modify: `src/app/api/players/[id]/route.ts`
- Test: `tests/api/players-filters.test.ts` (mock db) o integration if available

- [ ] **Step 1: GET supports query**

```ts
export async function GET(req: Request) {
  const { organizationId } = await requireOrgRole([
    MembershipRole.ORG_ADMIN,
    MembershipRole.COACH,
    MembershipRole.FRIENDLY_COACH, // if they need roster for friendlies
  ])
  const url = new URL(req.url)
  const teamId = url.searchParams.get('teamId')
  const categoryId = url.searchParams.get('categoryId')
  const q = url.searchParams.get('q')?.trim()

  const players = await db.player.findMany({
    where: {
      organizationId,
      ...(teamId ? { teamId } : {}),
      ...(categoryId ? { categories: { some: { friendlyCategoryId: categoryId } } } : {}),
      ...(q
        ? {
            OR: [
              { person: { firstName: { contains: q, mode: 'insensitive' } } },
              { person: { lastName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      person: { include: { user: { select: { name: true, email: true } } } },
      team: { select: { id: true, name: true } },
      categories: { include: { friendlyCategory: { select: { id: true, name: true } } } },
    },
    orderBy: [{ person: { firstName: 'asc' } }, { person: { lastName: 'asc' } }],
  })
  return NextResponse.json(players.map(mapPlayer))
}
```

- [ ] **Step 2: POST supports name-only Player (no account)** for amistoso-style alta

- [ ] **Step 3: PATCH calls `setPlayerCategories` when `categoryIds` present**

- [ ] **Step 4: Manual smoke / unit test mocks**

- [ ] **Step 5: Commit**

```bash
git add src/app/api/players
git commit -m "feat: filter and update unified org players API"
```

---

### Task 9: Match create, events, MVP, formations — solo `playerId`

**Files:**
- Modify: `src/lib/validations/match.ts` (roster entries)
- Modify: `src/lib/validations/match-event.ts`
- Modify: `src/lib/validations/mvp.ts`
- Modify: `src/app/api/matches/route.ts`
- Modify: `src/app/api/matches/[id]/events/route.ts`
- Modify: `src/app/api/matches/[id]/events/[eventId]/route.ts`
- Modify: `src/app/api/matches/[id]/mvp/route.ts`
- Modify: `src/lib/match-events.ts` (friendly scoring still uses `side`)
- Modify: `src/lib/match-mvp.ts`
- Modify: `src/lib/live-match-snapshot.ts`
- Modify: `tests/api/match-events.test.ts`

- [ ] **Step 1: Update Zod**

```ts
// match-event create
playerId: id.optional(),
assistPlayerId: id.optional(),
side: z.enum(['A', 'B']).optional(),
// remove friendlyPlayerId / assistFriendlyPlayerId
```

Friendly roster in match payload:

```ts
z.object({ playerId: id, side: z.enum(['A','B']), isCaptain: z.boolean().optional(), isCoach: z.boolean().optional() })
```

- [ ] **Step 2: Events route FRIENDLY branch**

Require `playerId` + participation row; set `side` from participation; reject foreign org players unless guest challenge side B rules.

- [ ] **Step 3: Update tests that send friendlyPlayerId**

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations src/app/api/matches src/lib/match-events.ts src/lib/match-mvp.ts src/lib/live-match-snapshot.ts tests
git commit -m "feat: friendly match APIs use playerId only"
```

---

### Task 10: Panel árbitro + timeline admin

**Files:**
- Modify: `src/components/referee/MatchControlPanel.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/referee/match/[id]/page.tsx`
- Modify: `src/components/admin/MatchTimelineEditor.tsx`
- Modify: related pages under `admin/matches/[id]/timeline`

- [ ] **Step 1: Referee page loads FriendlyMatchPlayer → players via Person name**

```ts
homeTeam.players = sideA.map((p) => ({
  id: p.playerId,
  label: playerDisplayName(p.player),
}))
```

Always `matchType` may stay FRIENDLY for UI labels, but submit body always uses `playerId`.

- [ ] **Step 2: MatchControlPanel — remove FRIENDLY branch that sends friendlyPlayerId**

Use one body shape:

```ts
{
  type,
  playerId: playerId || undefined,
  teamId: matchType === 'LEAGUE' ? team?.id : undefined,
  side: matchType === 'FRIENDLY' ? (teamSide === 'home' ? 'A' : 'B') : undefined,
  assistPlayerId: ...
}
```

For FRIENDLY, `homeTeam.id` can remain `'A'`/`'B'` as side markers (already true).

- [ ] **Step 3: Timeline editor uses playerId for both types**

- [ ] **Step 4: Smoke typecheck + commit**

```bash
git commit -m "feat: referee and timeline use unified playerId"
```

---

### Task 11: Convocatoria — filtro equipo + “agregar todos”

**Files:**
- Modify: `src/components/admin/FriendlyMatchConvocationPicker.tsx`
- Modify: `src/lib/friendly-match-roster-ui.ts`
- Modify: `src/components/admin/match-create/FriendlyMatchCreateWizard.tsx`
- Modify: `src/components/admin/MatchActions.tsx`
- Test: `tests/lib/friendly-match-roster-ui.test.ts`

- [ ] **Step 1: Helper**

```ts
export function playersOfTeam<T extends { id: string; teamId?: string | null }>(
  players: T[],
  teamId: string,
): T[] {
  return players.filter((p) => p.teamId === teamId)
}

export function mergeTeamOntoSide(
  current: Array<{ playerId: string; side: 'A' | 'B' }>,
  teamPlayerIds: string[],
  side: 'A' | 'B',
): Array<{ playerId: string; side: 'A' | 'B' }> {
  const without = current.filter((p) => !teamPlayerIds.includes(p.playerId))
  const additions = teamPlayerIds
    .filter((id) => !without.some((p) => p.playerId === id))
    .map((playerId) => ({ playerId, side }))
  return [...without, ...additions]
}
```

- [ ] **Step 2: UI — select team + button “Agregar todo el equipo al lado A/B”**

Pool prop type becomes org `Player[]` with `teamId`, categories, label from Person.

- [ ] **Step 3: Fetch `/api/players` instead of `/api/friendly-players`**

- [ ] **Step 4: Tests + commit**

```bash
git commit -m "feat: add team bulk-add to friendly convocation picker"
```

---

### Task 12: Admin Jugadores unificado

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/players/page.tsx`
- Modify/Create components under `src/components/admin/` absorbing FriendlyPlayerForm fields (categorías, pie, posiciones)
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/layout.tsx` — remove Amistosos pool nav item; keep `friendly-categories` under Jugadores or Competición
- Redirect: `admin/friendly-players` → `admin/players`

- [ ] **Step 1: Page lists all Player with team + category chips + filters**

- [ ] **Step 2: Form create/edit with optional team + category checkboxes + optional account**

Reuse `FriendlyCategoryCheckboxes` pointed at player categories.

- [ ] **Step 3: Nav**

```ts
{ href: base('/admin/players'), label: 'Jugadores', icon: 'JU',
  activePrefixes: [base('/admin/players'), base('/admin/friendly-categories')] },
// remove friendly-players item; link categorías from players page
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: unify admin players directory and retire friendly-players UI"
```

---

### Task 13: Retirar APIs `/api/friendly-players*`

**Files:**
- Delete or stub 410: `src/app/api/friendly-players/**`
- Update claim/register to create `Player`
- Update imports across codebase (`rg friendly-players`)

- [ ] **Step 1: `rg "friendly-players|FriendlyPlayer|friendlyPlayerId" src tests`** — zero remaining production references

- [ ] **Step 2: Claim route** creates/links Player + Person.userId

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove friendly-players API after roster unification"
```

---

### Task 14: Desafíos (guest roster)

**Files:**
- Modify: `src/components/admin/GuestChallengeRosterEditor.tsx`
- Modify: challenge pages/APIs that list guest friendly players
- Modify: `src/app/(tenant)/.../admin/challenges/[id]/page.tsx`

- [ ] **Step 1: Guest loads `/api/players` scoped to guest org cookie/session**

- [ ] **Step 2: Same team bulk-add helper**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: challenge guest roster uses unified Player pool"
```

---

### Task 15: Seeds, demos, docs handoff

**Files:**
- Modify: `prisma/seed.ts`, `prisma/seed-demo.ts` — no FriendlyPlayer creates
- Modify: `docs/superpowers/specs/2026-08-20-roster-unificado-design.md` — link plan
- Update `docs/handoff/SESSION-CONTEXT.md` only when deploying to prod (per repo rule)

- [ ] **Step 1: Fix seeds**

- [ ] **Step 2: Run full relevant suite**

```bash
npm test -- tests/lib/friendly-roster-entry.test.ts tests/lib/person-merge.test.ts tests/lib/unified-roster-map.test.ts tests/api/match-events.test.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: align seeds with unified org roster"
```

---

### Task 16: Deploy checklist (manual)

- [ ] Run migrate + `migrate-unified-roster.ts` + `verify-unified-roster.ts` on preview DB
- [ ] Smoke: admin jugadores, crear amistoso, agregar equipo a lado A, árbitro gol, desafío guest
- [ ] Prod: same scripts during deploy window; then `vercel deploy --prod` when user asks

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Un solo Player por org | 2–5 |
| Migrar FriendlyPlayer | 3–4 |
| PlayerCategory tags | 2, 7–8, 12 |
| Todos elegibles amistoso | 8, 11 |
| Filtro equipo + bulk add | 11, 14 |
| Lados A/B libres | 11 (unchanged match model) |
| Admin una pantalla | 12 |
| APIs players / drop friendly-players | 8, 13 |
| Eventos/MVP solo playerId | 9–10 |
| Career/merge | 6 |
| Desafíos guest | 14 |
| Verify/backfill conflicts | 4 |
| League goal cache unchanged | 9 note + match-events |

## Placeholder scan

No TBD steps; SQL notes prefer Node cuid script when UUID style conflicts — choose explicitly in Task 3 commit.
