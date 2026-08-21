# Temporada por categoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una temporada agrupe categorías del catálogo de la org, un club se inscriba por categoría, y los partidos/tablas de liga no mezclen +35 con +40.

**Architecture:** `SeasonCategory` une temporada y `FriendlyCategory`. `SeasonTeam` pasa a ser club+categoría (`seasonCategoryId` + `teamId`). El partido de liga guarda `seasonCategoryId`. El wizard crea categorías y luego inscribe por bloque. Standings y serialización móvil resuelven el club por `(seasonCategoryId, teamId)`, no solo por `teamId`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Zod, Vitest, Auth.js, `@liga/mobile-contracts`.

**Spec:** `docs/superpowers/specs/2026-08-21-temporada-por-categoria-design.md`

## Global Constraints

- UI copy: español chileno, tú (no voseo).
- Commits: uno por task. No commitear `.env`, `docs/handoff/`, `.superpowers/`, `supabase/.temp/`.
- Tras cambios Prisma: `npx prisma generate` y luego tests.
- No fusionar equipos de Kelme Sur. No renombrar `FriendlyCategory`. No rediseñar Expo más allá del contrato de standings.
- Amistosos no escriben `seasonCategoryId`.
- Unique nuevo `[seasonCategoryId, teamId]` permite varios NULL (legacy).

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/season-enrollment-validation.ts` | Unicidad de jugador **por categoría**; elegibilidad de etiquetas |
| `src/lib/season-category-backfill.ts` | Regla: 0 / 1 / N categorías activas |
| `src/lib/league-match-category.ts` | Local/visita inscritos en la misma `SeasonCategory` |
| `prisma/schema.prisma` | `SeasonCategory`; FKs; unique nuevo |
| `prisma/migrations/20260821120000_season_categories/migration.sql` | DDL + backfill SQL |
| `src/lib/validations/season.ts` | `categoryIds` min 1 |
| `src/lib/validations/mobile-season.ts` | Enrollment con `categoryId` |
| `src/lib/validations/match.ts` | Liga exige `seasonCategoryId` |
| `src/app/api/seasons/route.ts` | Crea `Season` + `SeasonCategory` |
| `src/app/api/admin/seasons/[id]/enrollment/route.ts` | GET agrupado; PUT por categoría |
| `src/app/api/matches/route.ts` | Liga valida inscripción de categoría |
| `src/lib/mobile/standings.ts` | Una tabla por categoría (key `seasonTeamId`) |
| `src/lib/admin-dashboard.ts` | Standings agrupados |
| `packages/mobile-contracts/src/standings.ts` | `{ categories: [...] }` |
| `src/app/api/mobile/v1/leagues/[slug]/standings/route.ts` | Respuesta agrupada |
| `src/lib/mobile/matches.ts` | Mapear `SeasonTeam` por categoría, no solo `teamId` |
| `src/lib/mobile/enrollment-backfill.ts` | Upsert por `seasonCategoryId_teamId` |
| `src/components/admin/season-create/*` | Wizard pasos 2–3 por categoría |
| `src/components/admin/match-create/LeagueMatchCreateWizard.tsx` | Paso categoría |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/new/page.tsx` | Cargar categorías e inscritos |
| `src/components/admin/season-mobile/SeasonRosterEditor.tsx` | Inscripción por categoría |

---

### Task 1: Validación de dominio (inscripción por categoría)

**Files:**
- Modify: `src/lib/season-enrollment-validation.ts`
- Modify: `tests/lib/season-enrollment-validation.test.ts`
- Create: `src/lib/league-match-category.ts`
- Create: `tests/lib/league-match-category.test.ts`
- Create: `src/lib/season-category-backfill.ts`
- Create: `tests/lib/season-category-backfill.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/season-enrollment-validation.test.ts
import { describe, expect, it } from 'vitest'
import {
  validateSeasonEnrollment,
  validateEnrollmentPlayerCategories,
} from '@/lib/season-enrollment-validation'

describe('validateSeasonEnrollment', () => {
  it('rejects players assigned to two clubs in the same category payload', () => {
    expect(
      validateSeasonEnrollment({
        categoryId: 'cat-35',
        teams: [
          { teamId: 't1', displayName: 'Búfalos', playerIds: ['p1'] },
          { teamId: 't2', displayName: 'Cobre Sur', playerIds: ['p1'] },
        ],
      }),
    ).toBe('Un jugador no puede estar inscrito en dos clubes de la misma categoría')
  })
})

describe('validateEnrollmentPlayerCategories', () => {
  it('rejects a player without the category tag', () => {
    expect(validateEnrollmentPlayerCategories(['p1', 'p2'], new Set(['p1']))).toBe(
      'Ese jugador no está en la categoría seleccionada.',
    )
  })

  it('accepts players that all have the tag', () => {
    expect(validateEnrollmentPlayerCategories(['p1'], new Set(['p1', 'p2']))).toBeNull()
  })
})
```

```ts
// tests/lib/league-match-category.test.ts
import { describe, expect, it } from 'vitest'
import { validateLeagueMatchTeams } from '@/lib/league-match-category'

describe('validateLeagueMatchTeams', () => {
  it('rejects home and away equal', () => {
    expect(
      validateLeagueMatchTeams({
        homeTeamId: 't1',
        awayTeamId: 't1',
        enrolledTeamIds: ['t1', 't2'],
      }),
    ).toBe('Local y visita deben ser clubes distintos.')
  })

  it('rejects a club not enrolled in the category', () => {
    expect(
      validateLeagueMatchTeams({
        homeTeamId: 't1',
        awayTeamId: 't3',
        enrolledTeamIds: ['t1', 't2'],
      }),
    ).toBe('Local y visita deben estar inscritos en esta categoría.')
  })

  it('accepts two enrolled clubs', () => {
    expect(
      validateLeagueMatchTeams({
        homeTeamId: 't1',
        awayTeamId: 't2',
        enrolledTeamIds: ['t1', 't2'],
      }),
    ).toBeNull()
  })
})
```

```ts
// tests/lib/season-category-backfill.test.ts
import { describe, expect, it } from 'vitest'
import { resolveBackfillCategoryId } from '@/lib/season-category-backfill'

describe('resolveBackfillCategoryId', () => {
  it('returns none when the org has zero categories', () => {
    expect(resolveBackfillCategoryId([])).toEqual({ kind: 'none' })
  })

  it('returns the only active category', () => {
    expect(resolveBackfillCategoryId(['cat-35'])).toEqual({
      kind: 'single',
      categoryId: 'cat-35',
    })
  })

  it('returns ambiguous when several exist', () => {
    expect(resolveBackfillCategoryId(['cat-35', 'cat-40'])).toEqual({ kind: 'ambiguous' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/season-enrollment-validation.test.ts tests/lib/league-match-category.test.ts tests/lib/season-category-backfill.test.ts`

Expected: FAIL (exports missing / schema without `categoryId`).

- [ ] **Step 3: Implement**

```ts
// src/lib/season-enrollment-validation.ts
import type { SeasonEnrollmentInput } from '@/lib/validations/mobile-season'

export function validateSeasonEnrollment(input: SeasonEnrollmentInput): string | null {
  const playerTeams = new Map<string, string>()
  for (const team of input.teams) {
    for (const playerId of team.playerIds) {
      const existingTeam = playerTeams.get(playerId)
      if (existingTeam && existingTeam !== team.teamId) {
        return 'Un jugador no puede estar inscrito en dos clubes de la misma categoría'
      }
      playerTeams.set(playerId, team.teamId)
    }
  }
  return null
}

export function validateEnrollmentPlayerCategories(
  playerIds: string[],
  eligiblePlayerIds: Set<string>,
): string | null {
  for (const playerId of playerIds) {
    if (!eligiblePlayerIds.has(playerId)) {
      return 'Ese jugador no está en la categoría seleccionada.'
    }
  }
  return null
}

export function countRegisteredTeams(input: SeasonEnrollmentInput): number {
  return input.teams.filter((team) => team.playerIds.length > 0).length
}
```

```ts
// src/lib/league-match-category.ts
export function validateLeagueMatchTeams(input: {
  homeTeamId: string
  awayTeamId: string
  enrolledTeamIds: string[]
}): string | null {
  if (input.homeTeamId === input.awayTeamId) {
    return 'Local y visita deben ser clubes distintos.'
  }
  const enrolled = new Set(input.enrolledTeamIds)
  if (!enrolled.has(input.homeTeamId) || !enrolled.has(input.awayTeamId)) {
    return 'Local y visita deben estar inscritos en esta categoría.'
  }
  return null
}
```

```ts
// src/lib/season-category-backfill.ts
export type BackfillCategoryResult =
  | { kind: 'none' }
  | { kind: 'single'; categoryId: string }
  | { kind: 'ambiguous' }

export function resolveBackfillCategoryId(activeCategoryIds: string[]): BackfillCategoryResult {
  if (activeCategoryIds.length === 0) return { kind: 'none' }
  if (activeCategoryIds.length === 1) {
    return { kind: 'single', categoryId: activeCategoryIds[0]! }
  }
  return { kind: 'ambiguous' }
}
```

Also add `categoryId` to `seasonEnrollmentSchema` in this task **only if** tests import the type — the Zod change is Task 4. Until then, extend the TypeScript type in `season-enrollment-validation.ts` by changing the function to accept `{ categoryId?: string; teams: SeasonEnrollmentInput['teams'] }` **or** update `seasonEnrollmentSchema` here with `categoryId` so `SeasonEnrollmentInput` matches the tests:

In `src/lib/validations/mobile-season.ts` add to `seasonEnrollmentSchema`:

```ts
export const seasonEnrollmentSchema = z.object({
  categoryId: z.string().min(1),
  teams: z.array(seasonEnrollmentTeamSchema).min(1),
})
```

That makes Task 4 smaller; keep Zod enrollment `categoryId` here so the test compiles.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/season-enrollment-validation.test.ts tests/lib/league-match-category.test.ts tests/lib/season-category-backfill.test.ts tests/lib/validations-mobile-season.test.ts`

Expected: PASS. If `validations-mobile-season` enrollment tests exist and omit `categoryId`, add it to those fixtures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/season-enrollment-validation.ts src/lib/league-match-category.ts src/lib/season-category-backfill.ts src/lib/validations/mobile-season.ts tests/lib/season-enrollment-validation.test.ts tests/lib/league-match-category.test.ts tests/lib/season-category-backfill.test.ts
git commit -m "feat: validar inscripción y partidos de liga por categoría"
```

---

### Task 2: Prisma — SeasonCategory y FKs

**Files:**
- Modify: `prisma/schema.prisma` (`Season`, `FriendlyCategory`, `SeasonTeam`, `Match`)

- [ ] **Step 1: Add models and relations**

On `Season` add `seasonCategories SeasonCategory[]`.

On `FriendlyCategory` add `seasonCategories SeasonCategory[]`.

Insert after `model Season { ... }`:

```prisma
model SeasonCategory {
  id         String   @id @default(cuid())
  seasonId   String
  season     Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  categoryId String
  category   FriendlyCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  sortOrder  Int      @default(0)
  seasonTeams SeasonTeam[]
  matches     Match[]
  createdAt  DateTime @default(now())

  @@unique([seasonId, categoryId])
  @@index([seasonId, sortOrder])
}
```

On `SeasonTeam`:
- Add `seasonCategoryId String?`
- Add `seasonCategory SeasonCategory? @relation(fields: [seasonCategoryId], references: [id], onDelete: Restrict)`
- Remove `@@unique([seasonId, teamId])`
- Add `@@unique([seasonCategoryId, teamId])`
- Keep `@@index([seasonId, status])`

On `Match`:
- Add `seasonCategoryId String?`
- Add `seasonCategory SeasonCategory? @relation(fields: [seasonCategoryId], references: [id], onDelete: Restrict)`
- Add `@@index([seasonCategoryId])`

- [ ] **Step 2: Generate client**

Run: `npx prisma generate`

Expected: client generated, no schema errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: modelo SeasonCategory y SeasonTeam por categoría"
```

Do **not** create the SQL migration until Task 3 (so schema and SQL stay in one migration folder). If `prisma generate` is enough, skip `migrate dev` here to avoid a second migration. Task 3 writes the SQL by hand (this repo uses timestamped folders, not interactive migrate).

---

### Task 3: Migración SQL + backfill de una categoría

**Files:**
- Create: `prisma/migrations/20260821120000_season_categories/migration.sql`

- [ ] **Step 1: Write the migration**

```sql
-- CreateTable
CREATE TABLE "SeasonCategory" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeasonCategory_seasonId_categoryId_key" ON "SeasonCategory"("seasonId", "categoryId");
CREATE INDEX "SeasonCategory_seasonId_sortOrder_idx" ON "SeasonCategory"("seasonId", "sortOrder");

ALTER TABLE "SeasonCategory"
  ADD CONSTRAINT "SeasonCategory_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonCategory"
  ADD CONSTRAINT "SeasonCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "FriendlyCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SeasonTeam" ADD COLUMN "seasonCategoryId" TEXT;
ALTER TABLE "Match" ADD COLUMN "seasonCategoryId" TEXT;

CREATE INDEX "Match_seasonCategoryId_idx" ON "Match"("seasonCategoryId");

-- Backfill: org with exactly one FriendlyCategory
INSERT INTO "SeasonCategory" ("id", "seasonId", "categoryId", "sortOrder")
SELECT
  'sc_' || s."id",
  s."id",
  only_cat."id",
  0
FROM "Season" s
INNER JOIN (
  SELECT "organizationId", MIN("id") AS "id"
  FROM "FriendlyCategory"
  WHERE "isActive" = TRUE
  GROUP BY "organizationId"
  HAVING COUNT(*) = 1
) only_cat ON only_cat."organizationId" = s."organizationId"
WHERE EXISTS (
  SELECT 1 FROM "SeasonTeam" st WHERE st."seasonId" = s."id"
)
OR EXISTS (
  SELECT 1 FROM "Match" m WHERE m."seasonId" = s."id" AND m."matchType" = 'LEAGUE'
);

UPDATE "SeasonTeam" st
SET "seasonCategoryId" = sc."id"
FROM "SeasonCategory" sc
WHERE sc."seasonId" = st."seasonId"
  AND st."seasonCategoryId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SeasonCategory" sc2
    WHERE sc2."seasonId" = st."seasonId" AND sc2."id" <> sc."id"
  );

UPDATE "Match" m
SET "seasonCategoryId" = sc."id"
FROM "SeasonCategory" sc
WHERE sc."seasonId" = m."seasonId"
  AND m."matchType" = 'LEAGUE'
  AND m."seasonCategoryId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SeasonCategory" sc2
    WHERE sc2."seasonId" = m."seasonId" AND sc2."id" <> sc."id"
  );

ALTER TABLE "SeasonTeam"
  ADD CONSTRAINT "SeasonTeam_seasonCategoryId_fkey"
  FOREIGN KEY ("seasonCategoryId") REFERENCES "SeasonCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_seasonCategoryId_fkey"
  FOREIGN KEY ("seasonCategoryId") REFERENCES "SeasonCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "SeasonTeam_seasonId_teamId_key";
CREATE UNIQUE INDEX "SeasonTeam_seasonCategoryId_teamId_key" ON "SeasonTeam"("seasonCategoryId", "teamId");
```

If the current unique name in Postgres is different, check with `\d "SeasonTeam"` locally; the init migration used `@@unique([seasonId, teamId])` which Prisma names `SeasonTeam_seasonId_teamId_key`.

- [ ] **Step 2: Do not run migrate against prod from the agent.** Local (when `DATABASE_URL` exists): `npx prisma migrate deploy`. Expected: migration applied.

- [ ] **Step 3: Commit**

```bash
git add prisma/migrations/20260821120000_season_categories/migration.sql
git commit -m "feat: migrar SeasonCategory y backfill de una categoría"
```

---

### Task 4: Zod — temporada, enrollment, partido liga

**Files:**
- Modify: `src/lib/validations/season.ts`
- Modify: `src/lib/validations/match.ts` (`createLeagueMatchSchema`)
- Create: `tests/lib/validations-season-category.test.ts`
- Modify: `tests/lib/validations-match.test.ts` if it exists; otherwise create assertions in the new file

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/validations-season-category.test.ts
import { describe, expect, it } from 'vitest'
import { createSeasonSchema } from '@/lib/validations/season'
import { createLeagueMatchSchema } from '@/lib/validations/match'

describe('createSeasonSchema', () => {
  it('requires at least one categoryId', () => {
    const parsed = createSeasonSchema.safeParse({
      name: 'Apertura 2026',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-11-30T00:00:00.000Z',
      footballFormat: 'FUTBOL_11',
      categoryIds: [],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts categoryIds', () => {
    const parsed = createSeasonSchema.safeParse({
      name: 'Apertura 2026',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-11-30T00:00:00.000Z',
      footballFormat: 'FUTBOL_11',
      categoryIds: ['cat-35', 'cat-40'],
    })
    expect(parsed.success).toBe(true)
  })
})

describe('createLeagueMatchSchema', () => {
  it('requires seasonCategoryId', () => {
    const parsed = createLeagueMatchSchema.safeParse({
      matchType: 'LEAGUE',
      seasonId: 's1',
      homeTeamId: 't1',
      awayTeamId: 't2',
      scheduledAt: '2026-04-01T20:00:00.000Z',
    })
    expect(parsed.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations-season-category.test.ts`

Expected: FAIL (`categoryIds` / `seasonCategoryId` not in schema).

- [ ] **Step 3: Implement schemas**

`createSeasonSchema`:

```ts
export const createSeasonSchema = z.object({
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  footballFormat: footballFormatSchema.default('FUTBOL_11'),
  categoryIds: z.array(z.string().min(1)).min(1, 'Elige al menos una categoría.'),
})
```

`createLeagueMatchSchema` add `seasonCategoryId: id` next to `seasonId`.

Grep tests that POST seasons or league matches without these fields and update fixtures.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/validations-season-category.test.ts tests/lib/validations-match.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/season.ts src/lib/validations/match.ts tests/lib/validations-season-category.test.ts
git commit -m "feat: exigir categorías en temporada y partidos de liga"
```

---

### Task 5: APIs temporada y enrollment

**Files:**
- Modify: `src/app/api/seasons/route.ts`
- Modify: `src/app/api/admin/seasons/[id]/enrollment/route.ts`
- Modify: `src/lib/mobile/enrollment-backfill.ts` (upsert `seasonCategoryId_teamId`)
- Modify: `tests/api/admin-mobile-season.test.ts` (payloads con `categoryId`)

- [ ] **Step 1: POST `/api/seasons`**

After `createSeasonSchema` parse, load `FriendlyCategory` where `id in categoryIds` and `organizationId`. If `found.length !== unique(categoryIds).length` return 400 `'Categoría no válida para esta organización.'`.

Create in a transaction:

```ts
const season = await db.$transaction(async (tx) => {
  const created = await tx.season.create({
    data: {
      organizationId,
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      footballFormat: parsed.data.footballFormat,
    },
  })
  await tx.seasonCategory.createMany({
    data: uniqueIds.map((categoryId, sortOrder) => ({
      seasonId: created.id,
      categoryId,
      sortOrder,
    })),
  })
  return created
})
```

Include `seasonCategories` in the JSON response (`{ ...season, seasonCategories }`) so the wizard can map `categoryId` → `seasonCategory` if needed. Enrollment still uses `categoryId` (FriendlyCategory id).

- [ ] **Step 2: GET enrollment**

Return:

```ts
{
  categories: Array<{
    categoryId: string
    name: string
    teams: Array<{ teamId, name, color, players, selectedPlayerIds }>
  }>
}
```

For each `SeasonCategory` of the season (order `sortOrder`), list org teams; `selectedPlayerIds` from `SeasonTeam` of **that** `seasonCategoryId`. Attach each player’s `categoryIds: string[]` from `PlayerCategory` so the UI can filter.

Keep a deprecated `teams` / `enrollment` flat array **only if** tests/UI still need it during this task; prefer breaking in the same task and updating `SeasonRosterEditor` in Task 10. Minimum: new shape `categories` is required; if GET tests assert the old shape, update them here.

- [ ] **Step 3: PUT enrollment**

`parsed.data.categoryId` must belong to a `SeasonCategory` of this season (same org). Else 400 `'La categoría no pertenece a esta temporada.'`.

Load eligible player ids:

```ts
const eligible = await db.playerCategory.findMany({
  where: { friendlyCategoryId: parsed.data.categoryId },
  select: { playerId: true },
})
```

Run `validateEnrollmentPlayerCategories` on every `playerIds` of the payload. Then `validateSeasonEnrollment`.

Resolve `seasonCategory` row. Upsert `SeasonTeam` with:

```ts
where: {
  seasonCategoryId_teamId: {
    seasonCategoryId: seasonCategory.id,
    teamId: team.teamId,
  },
}
create: {
  seasonId: id,
  seasonCategoryId: seasonCategory.id,
  teamId: team.teamId,
  ...
}
```

Withdraw: `seasonTeam.updateMany` where `seasonCategoryId` and `teamId notIn submitted`.

- [ ] **Step 4: enrollment-backfill**

Change upsert `where` from `seasonId_teamId` to `seasonCategoryId_teamId`. Caller must pass `seasonCategoryId`. If backfill runs on a legacy season without `SeasonCategory`, skip team upserts (leave a comment in code: temporada legacy sin categoría).

Grep `seasonId_teamId` and replace all call sites.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/api/admin-mobile-season.test.ts tests/lib/season-enrollment-validation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/seasons/route.ts src/app/api/admin/seasons/[id]/enrollment/route.ts src/lib/mobile/enrollment-backfill.ts tests/api/admin-mobile-season.test.ts
git commit -m "feat: APIs de temporada e inscripción por categoría"
```

---

### Task 6: POST partido de liga con seasonCategoryId

**Files:**
- Modify: `src/app/api/matches/route.ts`
- Create: `tests/lib/league-match-create-rules.test.ts` (domain already tested; add a small helper used by the route if needed)
- Modify: any `tests/api/matches*.test.ts`

- [ ] **Step 1: In `LEAGUE` branch, after org check**

```ts
const seasonCategory = await db.seasonCategory.findFirst({
  where: {
    id: data.seasonCategoryId,
    seasonId: data.seasonId,
  },
})
if (!seasonCategory) {
  return NextResponse.json(
    { error: 'La categoría no pertenece a esta temporada.' },
    { status: 400 },
  )
}
const enrolled = await db.seasonTeam.findMany({
  where: {
    seasonCategoryId: seasonCategory.id,
    status: 'REGISTERED',
  },
  select: { teamId: true },
})
const teamError = validateLeagueMatchTeams({
  homeTeamId: data.homeTeamId,
  awayTeamId: data.awayTeamId,
  enrolledTeamIds: enrolled.map((row) => row.teamId),
})
if (teamError) {
  return NextResponse.json({ error: teamError }, { status: 400 })
}
```

Pass `seasonCategoryId: seasonCategory.id` into `db.match.create`. Friendly branch: do not set `seasonCategoryId`.

Replace English `'Home and away team must differ'` with the Spanish helper message (the helper already covers that case).

- [ ] **Step 2: Run existing match tests**

Run: `npx vitest run tests/api tests/lib/league-match-category.test.ts tests/lib/validations-season-category.test.ts`

Expected: PASS after fixtures include `seasonCategoryId`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/matches/route.ts
git commit -m "feat: partidos de liga anclados a SeasonCategory"
```

---

### Task 7: Standings por categoría (admin)

**Files:**
- Modify: `src/lib/admin-dashboard.ts`
- Modify: `src/components/admin/AdminDashboardPanels.tsx`
- Create or modify: `tests/lib/admin-dashboard-standings.test.ts` if `buildStandings` stays private — **export** `buildStandingsByCategory` from `src/lib/admin-dashboard-standings.ts` (split out of the 500-line dashboard file).

- [ ] **Step 1: New module**

Create `src/lib/admin-dashboard-standings.ts`:

```ts
import { resolveTeamColor } from '@/lib/team-color'

export type CategoryStandingBlock = {
  categoryId: string
  name: string
  rows: Array<{
    rank: number
    teamId: string
    team: string
    color: string
    pj: number
    dg: string
    pts: number
    rankColor: string
  }>
}

export function buildStandingsByCategory(
  matches: Array<{
    seasonCategoryId: string | null
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
    homeTeam: { id: string; name: string; color: string | null } | null
    awayTeam: { id: string; name: string; color: string | null } | null
  }>,
  categories: Array<{ id: string; categoryId: string; name: string }>,
): CategoryStandingBlock[] {
  return categories.map((category) => {
    const ofCategory = matches.filter((m) => m.seasonCategoryId === category.id)
    return {
      categoryId: category.categoryId,
      name: category.name,
      rows: buildOneTable(ofCategory),
    }
  })
}

function buildOneTable(/* same accumulator as current buildStandings */): CategoryStandingBlock['rows'] {
  // copy ranking logic from admin-dashboard.ts buildStandings
}
```

Move ranking math out of `buildStandings` into `buildOneTable`. `AdminDashboardData.standings` becomes `CategoryStandingBlock[]`.

- [ ] **Step 2: Test**

```ts
// tests/lib/admin-dashboard-standings.test.ts
import { describe, expect, it } from 'vitest'
import { buildStandingsByCategory } from '@/lib/admin-dashboard-standings'

it('does not add a +35 win to the +40 table', () => {
  const blocks = buildStandingsByCategory(
    [
      {
        seasonCategoryId: 'sc-35',
        homeTeamId: 't1',
        awayTeamId: 't2',
        homeScore: 2,
        awayScore: 0,
        homeTeam: { id: 't1', name: 'Búfalos', color: null },
        awayTeam: { id: 't2', name: 'Cobre', color: null },
      },
    ],
    [
      { id: 'sc-35', categoryId: 'c35', name: '+35' },
      { id: 'sc-40', categoryId: 'c40', name: '+40' },
    ],
  )
  expect(blocks[0]!.rows[0]!.team).toBe('Búfalos')
  expect(blocks[0]!.rows[0]!.pts).toBe(3)
  expect(blocks[1]!.rows).toEqual([])
})
```

- [ ] **Step 3: Wire dashboard data load** — `findMany` matches include `seasonCategoryId`; load `season.seasonCategories` with `category: { select: { id, name } }`. Pass into `buildStandingsByCategory`.

- [ ] **Step 4: UI** — in `AdminDashboardPanels.tsx`, for each block render `<h3>{block.name}</h3>` then the existing table of `block.rows`. If `blocks.length === 0`, keep the empty copy.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/lib/admin-dashboard-standings.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin-dashboard-standings.ts src/lib/admin-dashboard.ts src/components/admin/AdminDashboardPanels.tsx tests/lib/admin-dashboard-standings.test.ts
git commit -m "feat: tablas admin una por categoría de temporada"
```

---

### Task 8: Contrato móvil y serialización de partidos

**Files:**
- Modify: `packages/mobile-contracts/src/standings.ts`
- Modify: `packages/mobile-contracts/src/index.ts`
- Modify: `src/lib/mobile/standings.ts`
- Modify: `tests/lib/mobile/standings.test.ts`
- Modify: `src/app/api/mobile/v1/leagues/[slug]/standings/route.ts`
- Modify: `src/lib/mobile/matches.ts` (`seasonTeamMapByTeamId` → map by `${seasonCategoryId}:${teamId}`)
- Modify: `src/lib/mobile/serializers.ts` if match payloads need `categoryName`

- [ ] **Step 1: Contracts**

```ts
// packages/mobile-contracts/src/standings.ts
export type MobileStandingRow = { /* unchanged */ }

export type MobileStandingCategory = {
  categoryId: string
  name: string
  rows: MobileStandingRow[]
}

export type MobileStandingsResponse = {
  categories: MobileStandingCategory[]
  rows: MobileStandingRow[]
}
```

Export both new types from `index.ts`.

`rows` rule: if `categories.length === 1`, `rows = categories[0].rows`; else `rows = []`.

- [ ] **Step 2: `buildMobileStandings` stays row-based.** Add:

```ts
export function buildMobileStandingsResponse(input: {
  categories: Array<{ categoryId: string; name: string; seasonCategoryId: string }>
  matches: Array<FinishedMatch & { seasonCategoryId: string | null }>
  seasonTeams: Array<SeasonTeamRef & { seasonCategoryId: string | null }>
}): MobileStandingsResponse {
  const categories = input.categories.map((category) => {
    const matches = input.matches.filter((m) => m.seasonCategoryId === category.seasonCategoryId)
    const map = new Map(
      input.seasonTeams
        .filter((st) => st.seasonCategoryId === category.seasonCategoryId)
        .map((st) => [st.teamId, st]),
    )
    return {
      categoryId: category.categoryId,
      name: category.name,
      rows: buildMobileStandings(matches, map),
    }
  })
  return {
    categories,
    rows: categories.length === 1 ? categories[0]!.rows : [],
  }
}
```

Extend `FinishedMatch` with `seasonCategoryId`. Extend `SeasonTeamRef` with `seasonCategoryId`.

Test: same as admin — win in +35 does not appear in +40; `rows` empty when two categories.

- [ ] **Step 3: Standings route** loads `seasonCategories` + `category.name`, matches with `seasonCategoryId`, seasonTeams with `seasonCategoryId`. Return `buildMobileStandingsResponse(...)`. Map `crestUrl` per row as today.

- [ ] **Step 4: `src/lib/mobile/matches.ts`**

`listFinishedLeagueMatches` must `select.seasonCategoryId`.

Replace `seasonTeamMapByTeamId` with:

```ts
function seasonTeamMap(seasonTeams: Array<{ teamId: string; seasonCategoryId: string | null }>) {
  return new Map(
    seasonTeams.map((st) => [`${st.seasonCategoryId ?? ''}:${st.teamId}`, st]),
  )
}

function resolveSeasonTeam(
  map: Map<string, ...>,
  seasonCategoryId: string | null,
  teamId: string | null,
) {
  if (!teamId) return undefined
  return map.get(`${seasonCategoryId ?? ''}:${teamId}`)
}
```

Use that when attaching home/away season teams. Same club in two categories no longer collides.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/lib/mobile/standings.test.ts packages/mobile-contracts/tests/schemas.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/mobile-contracts src/lib/mobile/standings.ts src/lib/mobile/matches.ts src/app/api/mobile/v1/leagues/[slug]/standings/route.ts tests/lib/mobile/standings.test.ts
git commit -m "feat: standings y partidos móviles resueltos por categoría"
```

---

### Task 9: Wizard crear temporada

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/seasons/new/page.tsx`
- Modify: `src/components/admin/season-create/SeasonCreateWizard.tsx`
- Modify: `src/components/admin/season-create/SeasonCreateSummary.tsx`
- Modify: `src/components/admin/season-create/SeasonMobileConfigFields.tsx` (no change unless types)

- [ ] **Step 1: Page loads categories**

```ts
const [teams, categories] = await Promise.all([
  db.team.findMany({ /* igual que hoy, players + PLAYER_PERSON_NAME_INCLUDE */ }),
  db.friendlyCategory.findMany({
    where: { organizationId, isActive: true },
    orderBy: { name: 'asc' },
  }),
])
```

Pass to wizard:

```ts
categories={categories.map((c) => ({ id: c.id, name: c.name }))}
teams={teams.map((team) => ({
  teamId: team.id,
  name: team.name,
  color: team.color,
  players: team.players.map((player) => ({
    id: player.id,
    name: playerDisplayName(player),
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    categoryIds: player.categories.map((link) => link.friendlyCategoryId),
  })),
  selectedPlayerIds: [],
}))}
```

Include `categories: { select: { friendlyCategoryId: true } }` on players.

- [ ] **Step 2: Draft**

```ts
type SeasonDraft = {
  openStep: number
  name: string
  footballFormat: FootballFormat
  startDate: string
  endDate: string
  selectedCategoryIds: string[]
  selectedTeamIdsByCategory: Record<string, string[]>
  rosterByCategory: Record<string, Record<string, string[]>>
  slugManuallyEdited: boolean
  mobile: ReturnType<typeof createInitialMobileDraft>
}
```

Bump `DRAFT_KEY` to `season-create-draft:v3`.

- [ ] **Step 3: Step 2 UI** — checkboxes of `categories`. If `categories.length === 0`, show: “Crea al menos una categoría en Categorías amistosas (menú Partidos) antes de armar la temporada.” Link with `useOrgPath()('/admin/friendly-categories')`.

- [ ] **Step 4: Step 3 UI** — for each `selectedCategoryIds` in that order, a `WizardStep` or inner section titled with the category name. Reuse `SeasonTeamsEditor` with `selectedTeamIds={data.selectedTeamIdsByCategory[categoryId] ?? []}`. Player checkboxes only if `player.categoryIds.includes(categoryId)`. Selecting a team default-selects those eligible players only.

Renumber: 1 Datos, 2 Categorías, 3 Inscripción, 4 App móvil, 5 Resumen. Inscripción is one `WizardStep` containing stacked category blocks (spec: “un bloque por categoría”).

- [ ] **Step 5: Submit**

Validate `selectedCategoryIds.length >= 1` else error and `setOpenStep(2)`.

`POST /api/seasons` with `categoryIds: selectedCategoryIds`.

Then for each category with some selected teams:

```ts
await submitJson(`/api/admin/seasons/${seasonId}/enrollment`, 'PUT', {
  categoryId,
  teams: selectedTeams.map(...)
})
```

Then mobile PUT as today.

Summary sidebar: list category names; enrollment counts **per category**.

- [ ] **Step 6: Manual smoke** (no browser in CI): Typecheck `npx tsc --noEmit` if `DATABASE_URL` allows; otherwise rely on vitest + lints.

- [ ] **Step 7: Commit**

```bash
git add src/app/(tenant)/[organizationSlug]/(dashboard)/admin/seasons/new/page.tsx src/components/admin/season-create
git commit -m "feat: wizard de temporada elige categorías e inscribe por bloque"
```

---

### Task 10: Wizard partido de liga + ficha inscripción

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/new/page.tsx`
- Modify: `src/components/admin/match-create/LeagueMatchCreateWizard.tsx`
- Modify: `src/components/admin/season-mobile/SeasonRosterEditor.tsx`
- Modify: `src/components/admin/season-mobile/SeasonTeamsEditor.tsx` (only if props need category label)
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/seasons/[id]/mobile/page.tsx`
- Modify: match list components that show season name — add category when `match.seasonCategory`

- [ ] **Step 1: New match page data**

```ts
const seasons = await db.season.findMany({
  where: { organizationId },
  orderBy: { startDate: 'desc' },
  include: {
    seasonCategories: {
      orderBy: { sortOrder: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        seasonTeams: {
          where: { status: 'REGISTERED' },
          include: { team: { select: { id: true, name: true } } },
        },
      },
    },
  },
})
```

Pass:

```ts
seasons={seasons.map((season) => ({
  id: season.id,
  name: season.name,
  footballFormat: season.footballFormat,
  categories: season.seasonCategories.map((sc) => ({
    seasonCategoryId: sc.id,
    categoryId: sc.category.id,
    name: sc.category.name,
    teams: sc.seasonTeams.map((st) => ({ id: st.team.id, name: st.displayName || st.team.name })),
  })),
}))}
```

Stop passing the flat org-wide `teams` list as match opponents (keep referees).

- [ ] **Step 2: League draft** add `seasonCategoryId: string`. When `seasonId` changes, clear `seasonCategoryId`, `homeTeamId`, `awayTeamId`. Team dropdowns use `selectedSeason.categories.find(c => c.seasonCategoryId === data.seasonCategoryId)?.teams ?? []`. If `categories.length === 0`, show: “Esta temporada no tiene categorías. Asígnale categorías antes de crear partidos de liga.” Disable submit.

POST body includes `seasonCategoryId`.

Summary row: `{ label: 'Categoría', value: categoryName }`.

- [ ] **Step 3: SeasonRosterEditor** — fetch GET enrollment `categories`. Local state: `activeCategoryId`. Toggle teams/players only inside that category. Save calls PUT with `{ categoryId: activeCategoryId, teams: [...] }`. Show a `<select>` “Categoría” above `SeasonTeamsEditor`.

- [ ] **Step 4: Match list / labels** — where season name is shown for `LEAGUE`, append ` · ${seasonCategory.category.name}` if include is present. Update `src/lib/match-label.ts` if that is the single place (`matchDisplayName`).

- [ ] **Step 5: Typecheck / tests**

Run: `npx vitest run tests/lib/league-match-category.test.ts tests/lib/admin-dashboard-standings.test.ts tests/lib/mobile/standings.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/new/page.tsx src/components/admin/match-create/LeagueMatchCreateWizard.tsx src/components/admin/season-mobile src/lib/match-label.ts
git commit -m "feat: crear partido de liga eligiendo categoría de la temporada"
```

---

### Task 11: Deploy checklist (no código)

- [ ] **Step 1:** `npx prisma migrate deploy` against prod `DIRECT_URL` **after** backup (see `docs/DEPLOY.md`). Migration `20260821120000_season_categories`.
- [ ] **Step 2:** Push `main` and confirm Vercel created a **new** production deployment (push a veces no dispara). If missing: `npx vercel deploy --prod`.
- [ ] **Step 3:** Smoke prod as org admin:
  1. Org con varias categorías: crear temporada eligiendo dos; inscribir el mismo club en ambas.
  2. Crear partido liga en +35; verificar que el rival +40 no aparece.
  3. Amistoso: sigue igual, sin `seasonCategoryId`.
  4. Org de una sola categoría (Le Park): temporada vieja debe haber backfillede y permitir partido.

Do not commit this task.

---

## Spec coverage (self-review)

| Spec section | Task |
|--------------|------|
| Club único / N categorías / catálogo `FriendlyCategory` | 2, 5, 9 |
| `SeasonCategory` + unique `SeasonTeam` | 2, 3 |
| `Match.seasonCategoryId` | 2, 6 |
| Elegibilidad `PlayerCategory` | 1, 5, 9 |
| Un club por categoría; mismo jugador dos categorías | 1, 5 |
| Wizard 5 pasos, bloques por categoría | 9 |
| Partido liga filtra inscritos | 6, 10 |
| Legacy 0/1/N categorías | 1 (`resolveBackfillCategoryId`), 3 |
| GET/PUT enrollment por categoría | 5, 10 |
| Standings admin N tablas | 7 |
| Standings móvil `{ categories, rows }` | 8 |
| No mezclar SeasonTeam en serialización móvil | 8 |
| Fuera: merge Kelme Sur, rename, Expo UX, fixture | — (no tasks) |
| Error copy es-CL | 1, 5, 6, 9, 10 |
