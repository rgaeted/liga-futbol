# Jugador único Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce `Person` as the stable identity so one human can be a league player and/or friendly player across organizations, with career stats and a manual merge, without rewriting MatchEvent/live.

**Architecture:** Keep `Player` and `FriendlyPlayer` as org-scoped participations. Both gain required `personId`. Drop `Player.userId` and `FriendlyPlayer.userId`; login hangs off `Person.userId`. Career aggregates MatchEvents via those fichas. Dual FKs on MatchEvent stay.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Auth.js, Zod 4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-08-14-jugador-unico-design.md`

## Global Constraints

- UI copy: español chileno, tú.
- Do not change match clock, formations, MVP, realtime payloads, or `/api/mobile/v1/leagues/[slug]/*` response shapes.
- MatchEvent keeps `playerId` / `friendlyPlayerId`.
- Commits: one per task. Do not commit `.env` or `docs/handoff/`.
- Read `node_modules/next/dist/docs/` before adding App Router pages.
- After Prisma schema changes: `npx prisma generate` then run tests.
- Unique indexes in SQL **after** backfill, **before** `SET NOT NULL` (lesson from organizations migration).

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/person-name.ts` | Split `User.name` → firstName/lastName |
| `src/lib/person.ts` | find-or-create Person, uniqueness, sync names |
| `src/lib/person-merge.ts` | Org-local and platform merge |
| `src/lib/person-career.ts` | Aggregate league vs friendly vs total |
| `prisma/schema.prisma` | Person + FKs |
| `prisma/migrations/20260814140000_persons/` | SQL + backfill |
| `src/app/api/players/route.ts` | Create Player via Person |
| `src/app/api/friendly-players/route.ts` | Create FriendlyPlayer via Person |
| `src/app/api/friendly-players/claim/route.ts` | Claim sets Person.userId |
| `src/app/api/admin/persons/[id]/career/route.ts` | Career JSON |
| `src/app/api/admin/persons/merge/route.ts` | Org merge |
| `src/app/api/plataforma/persons/merge/route.ts` | Platform merge |
| `src/lib/friendly-player-categories.ts` | Stop creating Player via userId |

---

### Task 1: Split display names

**Files:**
- Create: `src/lib/person-name.ts`
- Test: `tests/lib/person-name.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { splitPersonName } from '@/lib/person-name'

describe('splitPersonName', () => {
  it('splits first token as firstName', () => {
    expect(splitPersonName('Juan Pérez Soto')).toEqual({
      firstName: 'Juan',
      lastName: 'Pérez Soto',
    })
  })

  it('uses Sin nombre when empty', () => {
    expect(splitPersonName('')).toEqual({ firstName: 'Sin nombre', lastName: '' })
    expect(splitPersonName('   ')).toEqual({ firstName: 'Sin nombre', lastName: '' })
  })

  it('keeps a single token as firstName', () => {
    expect(splitPersonName('Pelé')).toEqual({ firstName: 'Pelé', lastName: '' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/person-name.test.ts`

Expected: FAIL with cannot find module `@/lib/person-name`

- [ ] **Step 3: Write minimal implementation**

```ts
export function splitPersonName(raw: string): { firstName: string; lastName: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { firstName: 'Sin nombre', lastName: '' }
  const space = trimmed.indexOf(' ')
  if (space === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  }
}

export function joinPersonName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/person-name.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/person-name.test.ts src/lib/person-name.ts
git commit -m "feat: split display names into Person first/last"
```

---

### Task 2: Person helpers (find-or-create, uniqueness)

**Files:**
- Create: `src/lib/person.ts`
- Test: `tests/lib/person.test.ts`

These helpers are pure against a tx-like interface so tests do not need Postgres. Use a fake in-memory store in the test file **or** mock `@/lib/db`. Prefer exporting functions that take `tx` with the Prisma methods they need.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PersonConflictError, assertPersonFichaAvailable } from '@/lib/person'

describe('assertPersonFichaAvailable', () => {
  it('throws 409 when league ficha already exists in org', () => {
    expect(() =>
      assertPersonFichaAvailable({
        existingPlayerOrgIds: ['org-1'],
        existingFriendlyOrgIds: [],
        organizationId: 'org-1',
        kind: 'league',
      }),
    ).toThrow(PersonConflictError)
  })

  it('allows league ficha when person only has friendly in that org', () => {
    expect(() =>
      assertPersonFichaAvailable({
        existingPlayerOrgIds: [],
        existingFriendlyOrgIds: ['org-1'],
        organizationId: 'org-1',
        kind: 'league',
      }),
    ).not.toThrow()
  })

  it('allows same person league in another org', () => {
    expect(() =>
      assertPersonFichaAvailable({
        existingPlayerOrgIds: ['org-1'],
        existingFriendlyOrgIds: [],
        organizationId: 'org-2',
        kind: 'league',
      }),
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/person.test.ts`

Expected: FAIL cannot find module

- [ ] **Step 3: Write implementation**

```ts
export class PersonConflictError extends Error {
  readonly status = 409
  constructor(message: string) {
    super(message)
    this.name = 'PersonConflictError'
  }
}

export function assertPersonFichaAvailable(input: {
  existingPlayerOrgIds: string[]
  existingFriendlyOrgIds: string[]
  organizationId: string
  kind: 'league' | 'friendly'
}) {
  if (input.kind === 'league' && input.existingPlayerOrgIds.includes(input.organizationId)) {
    throw new PersonConflictError('Esta persona ya es jugador de liga en esta organización')
  }
  if (input.kind === 'friendly' && input.existingFriendlyOrgIds.includes(input.organizationId)) {
    throw new PersonConflictError('Esta persona ya está en el pool amistoso de esta organización')
  }
}
```

Also export (used by later tasks):

```ts
export async function loadPersonFichaOrgIds(
  tx: { player: { findMany: Function }; friendlyPlayer: { findMany: Function } },
  personId: string,
) {
  const [players, friendlies] = await Promise.all([
    tx.player.findMany({ where: { personId }, select: { organizationId: true } }),
    tx.friendlyPlayer.findMany({ where: { personId }, select: { organizationId: true } }),
  ])
  return {
    existingPlayerOrgIds: players.map((p: { organizationId: string }) => p.organizationId),
    existingFriendlyOrgIds: friendlies.map((p: { organizationId: string }) => p.organizationId),
  }
}
```

Type `tx` as `Prisma.TransactionClient | typeof db` once Prisma Client has `Person`. Until Task 3, keep the structural type above so Task 2 tests pass without generate.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/person.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/person.ts tests/lib/person.test.ts
git commit -m "feat: guard unique Person fichas per organization"
```

---

### Task 3: Prisma Person + backfill migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260814140000_persons/migration.sql`

- [ ] **Step 1: Update schema**

On `User`, replace `player Player?` and `friendlyPlayer FriendlyPlayer?` with:

```prisma
person Person?
```

Add model `Person` exactly as the spec (id, userId optional unique, firstName, lastName, photoMimeType, photoData, timestamps, players[], friendlyPlayers[]).

On `Player`:

- Add `organizationId String` + relation to Organization
- Add `personId String` + relation to Person
- Remove `userId` and `user` relation
- `@@unique([personId, organizationId])`
- `@@index([organizationId])`

On `FriendlyPlayer`:

- Add `personId String` + relation to Person
- Remove `userId` and `user` relation
- Keep `firstName`, `lastName`, photo fields
- `@@unique([personId, organizationId])`

Add `players Player[]` on `Organization`.

- [ ] **Step 2: Write migration.sql**

Order (do not invert):

1. `CREATE TYPE` not needed.
2. `CREATE TABLE "Person" (...)`
3. `CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId")` (Postgres allows multiple NULLs).
4. `ALTER TABLE "Player" ADD COLUMN "organizationId" TEXT;` `ADD COLUMN "personId" TEXT;`
5. `ALTER TABLE "FriendlyPlayer" ADD COLUMN "personId" TEXT;`
6. Backfill Persons from Player ⋈ User using `split` in SQL:

```sql
INSERT INTO "Person" ("id", "userId", "firstName", "lastName", "createdAt", "updatedAt")
SELECT
  'psn_' || p."id",
  p."userId",
  CASE
    WHEN btrim(u."name") = '' THEN 'Sin nombre'
    WHEN position(' ' in btrim(u."name")) = 0 THEN btrim(u."name")
    ELSE split_part(btrim(u."name"), ' ', 1)
  END,
  CASE
    WHEN btrim(u."name") = '' THEN ''
    WHEN position(' ' in btrim(u."name")) = 0 THEN ''
    ELSE btrim(substr(btrim(u."name"), position(' ' in btrim(u."name")) + 1))
  END,
  NOW(),
  NOW()
FROM "Player" p
JOIN "User" u ON u."id" = p."userId";
```

7. `UPDATE "Player" SET "personId" = 'psn_' || "id";`
8. `UPDATE "Player" p SET "organizationId" = t."organizationId" FROM "Team" t WHERE p."teamId" = t."id";`
9. Remaining null `Player.organizationId`: membership PLAYER of that user, else Kelme org id.
10. FriendlyPlayer with userId that already has Person: `SET personId` from Person.userId.
11. FriendlyPlayer with userId without Person: insert Person id `psn_fp_` || fp.id then set personId.
12. FriendlyPlayer without userId: insert Person from firstName/lastName (`psn_fp_` || id), set personId.
13. `CREATE UNIQUE INDEX "Player_personId_organizationId_key" ...`
14. `CREATE UNIQUE INDEX "FriendlyPlayer_personId_organizationId_key" ...`
15. `ALTER COLUMN personId SET NOT NULL` (both tables); `Player.organizationId SET NOT NULL`
16. FKs + drop `Player.userId`, `FriendlyPlayer.userId` and their unique indexes.

- [ ] **Step 3: Generate client**

Run: `npx prisma generate`

Expected: client includes `person`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260814140000_persons
git commit -m "feat: add Person and backfill league/friendly fichas"
```

Do **not** run migrate deploy against production from this task. Local: `npx prisma migrate deploy` if the engineer has a local DB.

---

### Task 4: Career aggregation

**Files:**
- Create: `src/lib/person-career.ts`
- Test: `tests/lib/person-career.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { EventType, MatchType } from '@prisma/client'
import { buildPersonCareer } from '@/lib/person-career'

describe('buildPersonCareer', () => {
  it('keeps league goals out of friendly totals', () => {
    const career = buildPersonCareer({
      person: { id: 'p1', firstName: 'Ana', lastName: 'Rojas', userId: 'u1' },
      leagueMatchIds: ['m1'],
      friendlyMatchIds: ['m2'],
      events: [
        { matchId: 'm1', matchType: MatchType.LEAGUE, type: EventType.GOAL, isAssist: false },
        { matchId: 'm1', matchType: MatchType.LEAGUE, type: EventType.GOAL, isAssist: true },
        { matchId: 'm2', matchType: MatchType.FRIENDLY, type: EventType.GOAL, isAssist: false },
        { matchId: 'm2', matchType: MatchType.FRIENDLY, type: EventType.YELLOW_CARD, isAssist: false },
      ],
      leagueMvpCount: 1,
      friendlyMvpCount: 0,
    })
    expect(career.league.goals).toBe(1)
    expect(career.league.assists).toBe(1)
    expect(career.friendly.goals).toBe(1)
    expect(career.friendly.yellowCards).toBe(1)
    expect(career.total.goals).toBe(2)
    expect(career.total.matches).toBe(2)
    expect(career.person.hasAccount).toBe(true)
  })
})
```

`isAssist: true` means this row is an assist credit (the GOAL event counted for another player). `buildPersonCareer` treats `isAssist` as +1 assist and does not increment goals.

- [ ] **Step 2: Run to fail**

Run: `npx vitest run tests/lib/person-career.test.ts`

Expected: FAIL module not found

- [ ] **Step 3: Implement**

```ts
import { EventType, MatchType } from '@prisma/client'

export type CareerBucket = {
  matches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  mvps: number
}

export type PersonCareer = {
  person: { id: string; firstName: string; lastName: string; hasAccount: boolean }
  league: CareerBucket
  friendly: CareerBucket
  total: CareerBucket
}

function emptyBucket(): CareerBucket {
  return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, mvps: 0 }
}

function add(a: CareerBucket, b: CareerBucket): CareerBucket {
  return {
    matches: a.matches + b.matches,
    goals: a.goals + b.goals,
    assists: a.assists + b.assists,
    yellowCards: a.yellowCards + b.yellowCards,
    redCards: a.redCards + b.redCards,
    mvps: a.mvps + b.mvps,
  }
}

export function buildPersonCareer(input: {
  person: { id: string; firstName: string; lastName: string; userId: string | null }
  leagueMatchIds: string[]
  friendlyMatchIds: string[]
  events: Array<{
    matchId: string
    matchType: MatchType
    type: EventType
    isAssist: boolean
  }>
  leagueMvpCount: number
  friendlyMvpCount: number
}): PersonCareer {
  const league = emptyBucket()
  const friendly = emptyBucket()
  league.matches = new Set(input.leagueMatchIds).size
  friendly.matches = new Set(input.friendlyMatchIds).size
  league.mvps = input.leagueMvpCount
  friendly.mvps = input.friendlyMvpCount

  for (const event of input.events) {
    const bucket = event.matchType === MatchType.FRIENDLY ? friendly : league
    if (event.isAssist) {
      bucket.assists += 1
      continue
    }
    if (event.type === EventType.GOAL) bucket.goals += 1
    if (event.type === EventType.YELLOW_CARD) bucket.yellowCards += 1
    if (event.type === EventType.RED_CARD) bucket.redCards += 1
  }

  return {
    person: {
      id: input.person.id,
      firstName: input.person.firstName,
      lastName: input.person.lastName,
      hasAccount: Boolean(input.person.userId),
    },
    league,
    friendly,
    total: add(league, friendly),
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/person-career.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/person-career.ts tests/lib/person-career.test.ts
git commit -m "feat: aggregate Person career league vs friendly"
```

---

### Task 5: Merge helpers

**Files:**
- Create: `src/lib/person-merge.ts`
- Test: `tests/lib/person-merge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PersonConflictError } from '@/lib/person'
import { planOrgMerge, planPlatformMerge } from '@/lib/person-merge'

describe('planOrgMerge', () => {
  it('rejects when dest already has same ficha type in org', () => {
    expect(() =>
      planOrgMerge({
        organizationId: 'org-1',
        source: { id: 's', userId: null, playerOrgIds: ['org-1'], friendlyOrgIds: [] },
        dest: { id: 'd', userId: 'u1', playerOrgIds: ['org-1'], friendlyOrgIds: [] },
      }),
    ).toThrow(PersonConflictError)
  })

  it('moves only fichas of this org', () => {
    const plan = planOrgMerge({
      organizationId: 'org-1',
      source: { id: 's', userId: null, playerOrgIds: ['org-1', 'org-2'], friendlyOrgIds: [] },
      dest: { id: 'd', userId: 'u1', playerOrgIds: [], friendlyOrgIds: ['org-1'] },
    })
    expect(plan.movePlayerOrgIds).toEqual(['org-1'])
    expect(plan.deleteSourcePerson).toBe(false)
  })
})

describe('planPlatformMerge', () => {
  it('rejects two accounts', () => {
    expect(() =>
      planPlatformMerge({
        source: { id: 's', userId: 'u1', playerOrgIds: ['org-1'], friendlyOrgIds: [] },
        dest: { id: 'd', userId: 'u2', playerOrgIds: [], friendlyOrgIds: [] },
      }),
    ).toThrow(PersonConflictError)
  })
})
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run tests/lib/person-merge.test.ts`

Expected: FAIL module not found

- [ ] **Step 3: Implement**

```ts
import { PersonConflictError } from '@/lib/person'

export type PersonMergeSnapshot = {
  id: string
  userId: string | null
  playerOrgIds: string[]
  friendlyOrgIds: string[]
}

export function planOrgMerge(input: {
  organizationId: string
  source: PersonMergeSnapshot
  dest: PersonMergeSnapshot
}) {
  const orgId = input.organizationId
  if (
    !input.source.playerOrgIds.includes(orgId) &&
    !input.source.friendlyOrgIds.includes(orgId)
  ) {
    throw new PersonConflictError('El origen no tiene ficha en esta organización')
  }
  if (
    !input.dest.playerOrgIds.includes(orgId) &&
    !input.dest.friendlyOrgIds.includes(orgId)
  ) {
    throw new PersonConflictError('El destino no tiene ficha en esta organización')
  }
  if (input.source.playerOrgIds.includes(orgId) && input.dest.playerOrgIds.includes(orgId)) {
    throw new PersonConflictError('Ambas personas ya son jugadores de liga aquí')
  }
  if (input.source.friendlyOrgIds.includes(orgId) && input.dest.friendlyOrgIds.includes(orgId)) {
    throw new PersonConflictError('Ambas personas ya están en el pool amistoso aquí')
  }

  const remainingPlayer = input.source.playerOrgIds.filter((id) => id !== orgId)
  const remainingFriendly = input.source.friendlyOrgIds.filter((id) => id !== orgId)
  return {
    movePlayerOrgIds: input.source.playerOrgIds.filter((id) => id === orgId),
    moveFriendlyOrgIds: input.source.friendlyOrgIds.filter((id) => id === orgId),
    deleteSourcePerson:
      remainingPlayer.length === 0 && remainingFriendly.length === 0 && !input.source.userId,
  }
}

export function planPlatformMerge(input: {
  source: PersonMergeSnapshot
  dest: PersonMergeSnapshot
}) {
  if (input.source.userId && input.dest.userId && input.source.userId !== input.dest.userId) {
    throw new PersonConflictError(
      'No se pueden unir dos cuentas distintas; pide a plataforma que revise',
    )
  }
  const conflictOrgs = [
    ...input.source.playerOrgIds.filter((id) => input.dest.playerOrgIds.includes(id)),
    ...input.source.friendlyOrgIds.filter((id) => input.dest.friendlyOrgIds.includes(id)),
  ]
  if (conflictOrgs.length > 0) {
    throw new PersonConflictError(`Conflicto de fichas en organizaciones: ${conflictOrgs.join(', ')}`)
  }
  return {
    movePlayerOrgIds: input.source.playerOrgIds,
    moveFriendlyOrgIds: input.source.friendlyOrgIds,
    moveUserId: input.source.userId && !input.dest.userId ? input.source.userId : null,
    deleteSourcePerson: true,
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/person-merge.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/person-merge.ts tests/lib/person-merge.test.ts
git commit -m "feat: plan Person merge without colliding fichas"
```

---

### Task 6: Wire Player create/list to Person

**Files:**
- Modify: `src/app/api/players/route.ts`
- Modify: `src/app/api/players/[id]/route.ts`
- Modify: `src/lib/friendly-player-categories.ts` (`createUserForFriendlyPlayer` must create Person + Player with `personId`/`organizationId`, not `userId`)
- Test: `tests/api/players-person.test.ts` — mock `db` and `requireOrgRole` like `tests/api/live-match-snapshot.test.ts`

- [ ] **Step 1: Write failing API test for POST**

Mock `requireOrgRole` to `{ organizationId: 'org-1' }`. Mock `db.$transaction` to execute the callback with a fake tx. Assert `tx.person.create` is called and `tx.player.create` receives `{ personId, organizationId, teamId, ... }` and never `userId`.

- [ ] **Step 2: Run to fail**

Run: `npx vitest run tests/api/players-person.test.ts`

Expected: FAIL (player.create still uses userId)

- [ ] **Step 3: Implement POST**

Inside the existing transaction after `user.create` + membership:

```ts
const { firstName, lastName } = splitPersonName(name)
const person = await tx.person.create({
  data: { userId: user.id, firstName, lastName },
})
return tx.player.create({
  data: { personId: person.id, organizationId, teamId, jerseyNumber, position },
  include: {
    person: { include: { user: { select: { name: true, email: true } } } },
    team: { select: { name: true } },
  },
})
```

GET: `where: { organizationId }`, include `person.user` instead of `user`. Map a compatibility `user: player.person.user` in the JSON if existing admin tables expect `player.user.name` — **do map it** so `PlayersTable` keeps working:

```ts
return NextResponse.json(
  players.map((player) => ({
    ...player,
    user: player.person.user,
  })),
)
```

DELETE in `[id]/route.ts`: stop `db.user.delete({ where: { id: player.userId } })`. Load `person.userId`; delete Player; if Person has no remaining fichas, delete Person then User if `userId` set.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/api/players-person.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/players src/lib/friendly-player-categories.ts tests/api/players-person.test.ts
git commit -m "feat: create league players through Person"
```

---

### Task 7: Wire FriendlyPlayer + claim

**Files:**
- Modify: `src/app/api/friendly-players/route.ts`
- Modify: `src/app/api/friendly-players/[id]/route.ts`
- Modify: `src/app/api/friendly-players/claim/route.ts`
- Modify: `src/app/api/friendly-players/[id]/stats/route.ts` (`isOwner` via `person.userId`)
- Test: `tests/api/friendly-player-claim-person.test.ts`

- [ ] **Step 1: Failing claim tests**

1. Claim with new email → creates User, Person.userId set, membership PLAYER, and a league Player ficha in that org (same as today).
2. Claim when Person already has a different userId → 409 `'Este perfil ya fue reclamado'`
3. Claim when the new user would need a Person but email exists → keep 400 `'Ya existe un usuario con ese email'`
4. Extra: if `db.person.findUnique({ where: { userId } })` would find another Person (simulate by mocking person lookup after user create is not possible for existing user — instead test helper `canClaimPerson(person, existingUserPersonId)`):

```ts
export function canClaimPerson(
  personUserId: string | null,
  claimantExistingPersonId: string | null,
  personId: string,
): { ok: true } | { ok: false; status: 409; error: string } {
  if (personUserId) return { ok: false, status: 409, error: 'Este perfil ya fue reclamado' }
  if (claimantExistingPersonId && claimantExistingPersonId !== personId) {
    return {
      ok: false,
      status: 409,
      error: 'Esa cuenta ya está ligada a otra persona; pide a un admin que fusione',
    }
  }
  return { ok: true }
}
```

Put `canClaimPerson` in `src/lib/person.ts` with a unit test in `tests/lib/person.test.ts`.

- [ ] **Step 2: Implement claim transaction**

```ts
const person = await tx.person.findUniqueOrThrow({ where: { id: friendlyPlayer.personId } })
const gate = canClaimPerson(person.userId, null, person.id)
if (!gate.ok) throw Object.assign(new Error(gate.error), { status: gate.status })
const user = await tx.user.create({ data: { email, passwordHash, name } })
await tx.person.update({ where: { id: person.id }, data: { userId: user.id } })
await tx.organizationMembership.create({ ... role PLAYER })
await tx.player.create({
  data: { personId: person.id, organizationId: friendlyPlayer.organizationId },
})
```

Do **not** write `friendlyPlayer.userId`.

Create FriendlyPlayer POST: `tx.person.create({ firstName, lastName, userId? })` then `friendlyPlayer.create({ personId, organizationId, firstName, lastName, ... })`. If email/password, create user + set person.userId. Call `assertPersonFichaAvailable` when linking an existing `personId` from body (optional field `personId` in schema — add optional `personId` to `createFriendlyPlayerSchema`; if absent, create Person). When firstName/lastName/photo change on FriendlyPlayer, write the same fields onto `Person` (spec: Person is source of truth; denormalized copy stays in sync).

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/lib/person.test.ts tests/api/friendly-player-claim-person.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/person.ts src/app/api/friendly-players tests/lib/person.test.ts tests/api/friendly-player-claim-person.test.ts
git commit -m "feat: claim and create friendly players via Person"
```

---

### Task 8: Career and merge API routes

**Files:**
- Create: `src/app/api/admin/persons/[id]/career/route.ts`
- Create: `src/app/api/admin/persons/merge/route.ts`
- Create: `src/app/api/plataforma/persons/merge/route.ts`
- Test: `tests/api/person-career-route.test.ts`

- [ ] **Step 1: Failing tests**

Career GET: mock requireOrgRole org-1; person has no ficha in org-1 → 403 `{ error: 'No puedes ver esta persona' }`.

Merge POST org: body `{ sourcePersonId, destPersonId }`; dest without ficha in org → 403.

Platform merge: mock requirePlatformAdmin; two userIds → 409.

- [ ] **Step 2: Implement career GET**

`requireOrgRole([ORG_ADMIN])`. Load person with players and friendlyPlayers. If none have `organizationId === organizationId` → 403.

Query MatchEvents where `playerId in leagueFichaIds` OR `friendlyPlayerId in friendlyFichaIds`, include `match.matchType`. Build `isAssist` from `assistPlayerId` / `assistFriendlyPlayerId` matching those ids (separate pass: events where assist* matches). Match ids from CallUp + FriendlyMatchPlayer + events.

MVP counts: `matchTeamMvp` where playerId/friendlyPlayerId in those ids, join match.matchType.

Return `buildPersonCareer(...)`.

- [ ] **Step 3: Implement merge POST**

Org: load both persons' ficha org ids; `planOrgMerge`; in transaction `player.updateMany({ where: { personId: source, organizationId }, data: { personId: dest } })` same for friendlyPlayer; delete source Person if plan says so.

Platform: `requirePlatformAdmin`; `planPlatformMerge`; updateMany all fichas; optionally move userId; delete source.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/api/person-career-route.test.ts tests/lib/person-merge.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/persons src/app/api/plataforma/persons/merge tests/api/person-career-route.test.ts
git commit -m "feat: Person career and merge APIs"
```

---

### Task 9: Admin UI career + merge

**Files:**
- Create: `src/components/admin/PersonCareerBlock.tsx`
- Create: `src/components/admin/PersonMergeDialog.tsx`
- Modify: admin player detail / friendly player edit pages that already show the ficha (find `FriendlyPlayersTable` and player edit form; add the block).
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx` to show career for the org-active Person (ORG scoped). If the page lists matches only, add a small stats strip using the same `buildPersonCareer` via a server query — do not expose other orgs.

- [ ] **Step 1: PersonCareerBlock** (client)

Fetch `GET /api/admin/persons/${personId}/career`. Render three columns Liga / Amistosos / Total with goles, asistencias, amarillas, rojas, MVP, partidos. Copy: “Carrera en esta plataforma (vista de tu organización)”.

- [ ] **Step 2: PersonMergeDialog**

Inputs: dest person id from a select of other fichas in this org (load from current players list + friendly list with `personId`). Submit POST `/api/admin/persons/merge`. On 409 show `error` string. Button label: “Fusionar con otra ficha”.

- [ ] **Step 3: Mount**

On `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/players/page.tsx` and friendly-players page, pass `personId` into the tables. If tables are large, add merge only on the edit page `admin/friendly-players` row actions.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/PersonCareerBlock.tsx src/components/admin/PersonMergeDialog.tsx src/app
git commit -m "feat: show Person career and merge in admin"
```

---

### Task 10: Seed + compile fix remaining userId

**Files:**
- Grep `userId` on `player.create` / `friendlyPlayer.create` / `include: { user:` under Player.
- Modify: `prisma/seed.ts`, `prisma/seed-demo.ts`, any script still using `Player.userId`.

- [ ] **Step 1: Grep**

Run: `rg "player.create|Player.userId|friendlyPlayer.userId" --glob '!docs/**' --glob '!.worktrees/**'`

Fix every remaining compile break. Typical include becomes:

```ts
player: { include: { person: { include: { user: { select: { name: true } } } } } }
```

Live snapshot and referee events use `event.player.user.name` — keep a small helper:

```ts
export function playerDisplayName(player: {
  person: { firstName: string; lastName: string; user: { name: string } | null }
}): string {
  if (player.person.user?.name) return player.person.user.name
  return `${player.person.firstName} ${player.person.lastName}`.trim()
}
```

Put it in `src/lib/player-name.ts` next to `personInitials` if that file exists; otherwise `src/lib/person-name.ts`.

Update `LIVE_MATCH_INCLUDE` player.user to player.person.user so live keeps working.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit --pretty false`

Expected: 0 errors in `src/` (ignore `.worktrees`).

- [ ] **Step 3: Run focused tests**

Run: `npx vitest run tests/lib/person-name.test.ts tests/lib/person.test.ts tests/lib/person-career.test.ts tests/lib/person-merge.test.ts tests/lib/live-match-snapshot.test.ts tests/api/live-match-snapshot.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts prisma/seed-demo.ts src
git commit -m "fix: compile Player includes through Person"
```

---

### Task 11: Verification

- [ ] **Step 1: Unit tests listed in spec §9**

Confirm coverage:

| Spec test | Where |
|-----------|--------|
| Same user Player+FriendlyPlayer → one Person | migration SQL + optional comment in Task 3 |
| Two homonym FriendlyPlayers → two Persons | migration step 12 uses distinct ids |
| Person league org A + friendly org B | Task 2 unit |
| Second Player same org | unique + Task 2 |
| League goal not in friendly.goals | Task 4 |
| Org merge does not move other org | Task 5 `movePlayerOrgIds` |
| Claim 409 other Person | Task 7 |
| Live still 200 | Task 10 live tests |

- [ ] **Step 2: Run**

Run: `npx vitest run tests/lib/person-name.test.ts tests/lib/person.test.ts tests/lib/person-career.test.ts tests/lib/person-merge.test.ts tests/lib/live-match-snapshot.test.ts`

Expected: all PASS

- [ ] **Step 3: Commit only if verification drove extra fixes**

```bash
git add -u
git commit -m "fix: person identity verification gaps"
```

Skip commit if working tree clean.
