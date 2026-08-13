# Mobile League Foundation and Public API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edition-scoped configuration, historical team rosters, and a stable public sports API for one published league season.

**Architecture:** Keep Next.js and Prisma as the source of truth. A published `SeasonMobileConfig.slug` resolves every request to one season; all sports queries then use `SeasonTeam` and `SeasonRosterEntry`, never global team membership or player counters. Shared Zod contracts live in an npm workspace consumed later by Expo.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript 5 strict, Prisma 7/PostgreSQL, Zod 4, Vitest 4, npm workspaces.

## Global Constraints

- UI and API messages use Chilean Spanish; dates are ISO in JSON and `America/Santiago` in visible admin UI.
- Mobile routes expose league matches only; `MatchType.FRIENDLY` must always return 404.
- Unpublished or unknown slugs return the same 404 response.
- Statistics come from `MatchEvent` and `MatchTeamMvp`, not global `Player` counters.
- Standings use 3/1/0 points and tie-break by points, goal difference, goals for, then team name with `APP_LOCALE`.
- Existing `Match.homeTeamId` and `awayTeamId` remain linked to `Team`; scope is enforced in services.
- Every route/page change must follow the installed Next.js 16 guide under `node_modules/next/dist/docs/`.
- Create migrations locally; deploy them to production manually with `DIRECT_URL`.
- Do not stage the unrelated untracked plans dated `2026-08-03`.

---

### Task 1: Shared Mobile Contracts Workspace

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `packages/mobile-contracts/package.json`
- Create: `packages/mobile-contracts/tsconfig.json`
- Create: `packages/mobile-contracts/src/common.ts`
- Create: `packages/mobile-contracts/src/league.ts`
- Create: `packages/mobile-contracts/src/match.ts`
- Create: `packages/mobile-contracts/src/standings.ts`
- Create: `packages/mobile-contracts/src/stats.ts`
- Create: `packages/mobile-contracts/src/teams.ts`
- Create: `packages/mobile-contracts/src/live.ts`
- Create: `packages/mobile-contracts/src/index.ts`
- Create: `packages/mobile-contracts/src/schemas/index.ts`
- Test: `packages/mobile-contracts/tests/schemas.test.ts`

**Interfaces:**
- Produces: `MobileLeagueConfig`, `MobileMatchSummary`, `MobileStandingRow`, `MobileStatsResponse`, `MobileTeamDetail`, `MobilePlayerDetail`, `MobileLiveSnapshot`, `MobilePaginated<T>`.
- Produces: matching Zod schemas exported from `@liga/mobile-contracts/schemas`.

- [ ] **Step 1: Write a failing contract test**

```ts
import { describe, expect, it } from 'vitest'
import { mobileMatchSummarySchema } from '../src/schemas'

describe('mobileMatchSummarySchema', () => {
  it('rejects a response without season-scoped team ids', () => {
    expect(() =>
      mobileMatchSummarySchema.parse({
        id: 'match-1',
        scheduledAt: '2026-08-20T23:30:00.000Z',
        status: 'SCHEDULED',
        home: { name: 'Rojo', color: '#CD212A' },
        away: { name: 'Negro', color: '#111111' },
        homeScore: 0,
        awayScore: 0,
      }),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx vitest run packages/mobile-contracts/tests/schemas.test.ts`
Expected: FAIL because the workspace and schema do not exist.

- [ ] **Step 3: Add npm workspaces and contracts**

Add root workspaces `apps/*` and `packages/*`. Define exact DTOs from the design spec, with `MobileTeamRef.seasonTeamId` required and all dates as ISO strings. Do not import Prisma enums into this package; use string unions.

- [ ] **Step 4: Install and verify GREEN**

Run: `npm install`
Run: `npx vitest run packages/mobile-contracts/tests/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json packages/mobile-contracts
git commit -m "feat: define shared mobile API contracts"
```

### Task 2: Edition and Historical Roster Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260812120000_mobile_season_enrollment/migration.sql`
- Test: `tests/lib/validations-mobile-season.test.ts`
- Create: `src/lib/validations/mobile-season.ts`

**Interfaces:**
- Produces Prisma models: `SeasonMobileConfig`, `SeasonTeam`, `SeasonRosterEntry`.
- Produces enums: `SeasonTeamStatus`, `SeasonRosterStatus`.
- Produces schemas: `mobileConfigSchema`, `seasonEnrollmentSchema`.

- [ ] **Step 1: Write failing validation tests**

```ts
import { describe, expect, it } from 'vitest'
import { mobileConfigSchema } from '@/lib/validations/mobile-season'

describe('mobileConfigSchema', () => {
  it('accepts a stable kebab-case slug and valid hex colors', () => {
    expect(
      mobileConfigSchema.safeParse({
        slug: 'liga-invierno-kelme-puerto-varas-2026',
        displayName: 'Liga de Invierno Kelme Puerto Varas 2026',
        primaryColor: '#CD212A',
        secondaryColor: '#FFFFFF',
        isPublished: false,
      }).success,
    ).toBe(true)
  })

  it('rejects slugs with spaces', () => {
    expect(mobileConfigSchema.safeParse({ slug: 'Liga Invierno', displayName: 'Liga' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/lib/validations-mobile-season.test.ts`
Expected: FAIL on missing module.

- [ ] **Step 3: Add schema and migration**

`SeasonMobileConfig` is one-to-one with `Season`; `slug` is unique. `SeasonTeam` is unique on `[seasonId, teamId]` and snapshots `displayName`, `color`, `crestMimeType`, and `crestData`. `SeasonRosterEntry` is unique on `[seasonTeamId, playerId]` and snapshots dorsal and position. Add reverse relations to `Season`, `Team`, and `Player`.

- [ ] **Step 4: Implement Zod schemas**

Require slug regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, names 1–120 chars, optional descriptions up to 1,000 chars, and colors `/^#[0-9A-Fa-f]{6}$/`.

- [ ] **Step 5: Generate client and verify**

Run: `npx prisma generate`
Run: `npx vitest run tests/lib/validations-mobile-season.test.ts`
Run: `npx tsc --noEmit`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260812120000_mobile_season_enrollment src/lib/validations/mobile-season.ts tests/lib/validations-mobile-season.test.ts
git commit -m "feat: add edition enrollment data model"
```

### Task 3: Idempotent Enrollment Backfill

**Files:**
- Create: `src/lib/mobile/enrollment-backfill.ts`
- Create: `scripts/backfill-season-enrollment.ts`
- Test: `tests/lib/mobile/enrollment-backfill.test.ts`

**Interfaces:**
- Produces: `buildSeasonEnrollmentSeed(input): SeasonEnrollmentSeed`.
- Produces: `backfillSeasonEnrollment(db): Promise<BackfillSummary>`.

- [ ] **Step 1: Test deterministic source merging**

```ts
it('merges current team players with historical callups without duplicates', () => {
  const seed = buildSeasonEnrollmentSeed({
    seasonId: 's1',
    teamsFromMatches: [{ id: 't1', name: 'Rojo', players: [{ id: 'p1' }] }],
    callups: [{ teamId: 't1', playerId: 'p2' }, { teamId: 't1', playerId: 'p1' }],
  })
  expect(seed.teams[0].playerIds).toEqual(['p1', 'p2'])
})
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/lib/mobile/enrollment-backfill.test.ts`

- [ ] **Step 3: Implement pure seed builder and DB adapter**

Source teams only from `LEAGUE` matches with a non-null `seasonId`. Upsert snapshots and roster entries. Create unpublished mobile config with a unique slug derived from `Season.name`; never auto-publish.

- [ ] **Step 4: Verify idempotency**

Add a test that executes the mocked adapter twice and asserts the same compound upsert keys with no duplicate create call.

Run: `npx vitest run tests/lib/mobile/enrollment-backfill.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mobile/enrollment-backfill.ts scripts/backfill-season-enrollment.ts tests/lib/mobile/enrollment-backfill.test.ts
git commit -m "feat: backfill historical season enrollment"
```

### Task 4: Admin Edition Configuration and Enrollment

**Files:**
- Modify: `src/app/(dashboard)/admin/seasons/page.tsx`
- Modify: `src/components/admin/SeasonsTable.tsx`
- Create: `src/app/(dashboard)/admin/seasons/[id]/mobile/page.tsx`
- Create: `src/components/admin/season-mobile/MobileConfigForm.tsx`
- Create: `src/components/admin/season-mobile/SeasonTeamsEditor.tsx`
- Create: `src/components/admin/season-mobile/SeasonRosterEditor.tsx`
- Create: `src/app/api/admin/seasons/[id]/mobile/route.ts`
- Create: `src/app/api/admin/seasons/[id]/enrollment/route.ts`
- Test: `tests/api/admin-mobile-season.test.ts`
- Test: `tests/lib/season-enrollment-validation.test.ts`

**Interfaces:**
- Consumes: Task 2 models and validation schemas.
- Produces: admin GET/PUT config and GET/PUT enrollment routes.

- [ ] **Step 1: Test role and publication invariants**

```ts
it('does not publish a season without two registered teams', async () => {
  mockRequireAdmin()
  mockCountRegisteredTeams.mockResolvedValue(1)
  const response = await PUT(requestWith({ isPublished: true }), paramsFor('season-1'))
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'Debes inscribir al menos dos equipos antes de publicar' })
})
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/api/admin-mobile-season.test.ts tests/lib/season-enrollment-validation.test.ts`

- [ ] **Step 3: Implement thin admin routes**

Use `requireRole([Role.ADMIN])`, `safeParse`, `mapPrismaError`, and transactions. A slug becomes immutable after the first transition to published. Enrollment PUT accepts complete team/roster selections and rejects players assigned to two teams in the same season.

- [ ] **Step 4: Build focused admin UI**

Add “App móvil” beside Editar in `SeasonsTable`. The page edits branding/publication and enrollment. Use `submitJson`; never pass callbacks from server to client components.

- [ ] **Step 5: Verify**

Run: `npx vitest run tests/api/admin-mobile-season.test.ts tests/lib/season-enrollment-validation.test.ts`
Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/seasons" src/components/admin/SeasonsTable.tsx src/components/admin/season-mobile src/app/api/admin/seasons tests/api/admin-mobile-season.test.ts tests/lib/season-enrollment-validation.test.ts
git commit -m "feat: manage mobile edition enrollment"
```

### Task 5: Published League Context and Scope

**Files:**
- Create: `src/lib/mobile/errors.ts`
- Create: `src/lib/mobile/league-context.ts`
- Test: `tests/lib/mobile/league-context.test.ts`

**Interfaces:**
- Produces: `resolvePublishedLeagueBySlug(slug): Promise<ResolvedMobileLeague | null>`.
- Produces: `assertLeagueMatch(match, league): void`.

- [ ] **Step 1: Write failing scope tests**

Cover published, unpublished, unknown, cross-season, and friendly matches. Cross-season and friendly must both throw `MobileApiError(404, 'Partido no encontrado')`.

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/lib/mobile/league-context.test.ts`

- [ ] **Step 3: Implement minimal scoped resolver**

Load only `SeasonMobileConfig.isPublished = true`, include season, and never return internal storage paths or DB credentials.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run tests/lib/mobile/league-context.test.ts`

```bash
git add src/lib/mobile/errors.ts src/lib/mobile/league-context.ts tests/lib/mobile/league-context.test.ts
git commit -m "feat: resolve published mobile editions"
```

### Task 6: Standings and Season Statistics

**Files:**
- Create: `src/lib/mobile/standings.ts`
- Create: `src/lib/mobile/season-stats.ts`
- Test: `tests/lib/mobile/standings.test.ts`
- Test: `tests/lib/mobile/season-stats.test.ts`

**Interfaces:**
- Produces: `buildMobileStandings(matches): MobileStandingRow[]`.
- Produces: `aggregateSeasonPlayerStats(events, mvps, roster): MobileStatsResponse`.

- [ ] **Step 1: Write standings tests**

```ts
it('orders equal points by goal difference, goals for, then es-CL name', () => {
  const rows = buildMobileStandings(finishedMatchesFixture)
  expect(rows.map((row) => row.name)).toEqual(['Rojo', 'Azul', 'Negro'])
  expect(rows[0]).toMatchObject({ pg: 2, pe: 1, pp: 0, pts: 7 })
})
```

- [ ] **Step 2: Write statistics isolation tests**

Fixture must include events from two seasons and global player counters with deliberately wrong values. Assert only current-season `GOAL`, assists, cards, and team MVP records contribute.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/mobile/standings.test.ts tests/lib/mobile/season-stats.test.ts`

- [ ] **Step 4: Implement pure aggregators**

Return full rows, not the admin dashboard’s top-six slice. Use roster IDs for player links.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/lib/mobile/standings.test.ts tests/lib/mobile/season-stats.test.ts`

```bash
git add src/lib/mobile/standings.ts src/lib/mobile/season-stats.ts tests/lib/mobile/standings.test.ts tests/lib/mobile/season-stats.test.ts
git commit -m "feat: calculate edition standings and stats"
```

### Task 7: Sports Query Services and Serializers

**Files:**
- Create: `src/lib/mobile/serializers.ts`
- Create: `src/lib/mobile/matches.ts`
- Create: `src/lib/mobile/teams.ts`
- Create: `src/lib/mobile/home.ts`
- Create: `src/lib/validations/mobile-query.ts`
- Test: `tests/lib/mobile/serializers.test.ts`
- Test: `tests/lib/mobile/sports-queries.test.ts`
- Test: `tests/lib/validations-mobile-query.test.ts`

**Interfaces:**
- Produces: `getMobileHome(league)`, `listMobileMatches(league, query)`, `getMobileMatch(league, id)`.
- Produces: `listMobileTeams(league)`, `getMobileTeam(league, seasonTeamId)`, `getMobilePlayer(league, rosterEntryId)`.
- Produces cursor wrapper `MobilePaginated<T>`.

- [ ] **Step 1: Test stable serialization**

Assert ISO dates, absolute crest URLs, roster snapshot values, and absence of `refereeId`, `passwordHash`, `crestData`, and internal storage paths.

- [ ] **Step 2: Test query scope and pagination**

Use mixed-season fixtures. `limit` defaults to 20, maxes at 50, and cursor is stable on `scheduledAt + id`.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/mobile/serializers.test.ts tests/lib/mobile/sports-queries.test.ts tests/lib/validations-mobile-query.test.ts`

- [ ] **Step 4: Implement services**

Every Prisma query includes `seasonId` and `matchType: LEAGUE`. Team and player services start from `SeasonTeam`/`SeasonRosterEntry`.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/lib/mobile/serializers.test.ts tests/lib/mobile/sports-queries.test.ts tests/lib/validations-mobile-query.test.ts`

```bash
git add src/lib/mobile/serializers.ts src/lib/mobile/matches.ts src/lib/mobile/teams.ts src/lib/mobile/home.ts src/lib/validations/mobile-query.ts tests/lib/mobile tests/lib/validations-mobile-query.test.ts
git commit -m "feat: add scoped mobile sports queries"
```

### Task 8: Public Sports Routes, Live Wrapper, and Proxy

**Files:**
- Create: `src/lib/mobile/live.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/home/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/matches/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/matches/[matchId]/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/matches/[matchId]/live/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/standings/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/stats/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/teams/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/teams/[seasonTeamId]/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/players/[rosterEntryId]/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/teams/[seasonTeamId]/crest/route.ts`
- Modify: `src/lib/proxy-policy.ts`
- Test: `tests/api/mobile-sports-routes.test.ts`
- Test: `tests/api/mobile-live-route.test.ts`
- Modify: `tests/lib/proxy-policy.test.ts`

**Interfaces:**
- Consumes all prior task services.
- Produces the public sports API required by Plan 2.

- [ ] **Step 1: Write route tests**

Test 200, unpublished 404, cross-season 404, malformed query 400, and generic 500 without stack or secret. Mock domain services, not Prisma.

- [ ] **Step 2: Write live scope tests**

Mock `getLiveMatchSnapshot`; assert it is returned only after the match belongs to the resolved season and is `LEAGUE`.

- [ ] **Step 3: Write proxy tests**

GET under `/api/mobile/v1/leagues/{slug}` is public. Existing admin routes and non-mobile APIs retain current authentication.

- [ ] **Step 4: Confirm RED**

Run: `npx vitest run tests/api/mobile-sports-routes.test.ts tests/api/mobile-live-route.test.ts tests/lib/proxy-policy.test.ts`

- [ ] **Step 5: Implement thin routes**

Use async Next.js 16 `params`, `export const dynamic = 'force-dynamic'`, and one shared error-to-response mapper.

- [ ] **Step 6: Verify all foundation behavior**

Run: `npx vitest run packages/mobile-contracts tests/lib/mobile tests/api/mobile-sports-routes.test.ts tests/api/mobile-live-route.test.ts tests/lib/proxy-policy.test.ts`
Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/mobile src/lib/mobile/live.ts src/lib/proxy-policy.ts tests/api tests/lib/proxy-policy.test.ts
git commit -m "feat: expose public edition sports API"
```

### Task 9: Migration and Demo Verification

**Files:**
- Modify: `prisma/seed-demo.ts`
- Modify: `docs/handoff/SESSION-CONTEXT.md` only when this task is deployed to production.

**Interfaces:**
- Consumes: migration and backfill script.
- Produces: one unpublished or explicitly approved demo edition.

- [ ] **Step 1: Add deterministic demo enrollment**

Seed a mobile config and historical roster for the existing demo season. Keep `isPublished: false` unless the execution session explicitly authorizes public exposure.

- [ ] **Step 2: Verify locally**

Run: `npx prisma migrate deploy`
Run: `npm run db:seed:demo`
Run: `npx tsx scripts/backfill-season-enrollment.ts`
Run the backfill again and confirm counts do not change.

- [ ] **Step 3: Exercise API**

After publishing the demo config locally, verify config, matches, standings, stats, teams, player, and live endpoints return only that season.

- [ ] **Step 4: Run full verification**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add prisma/seed-demo.ts
git commit -m "test: seed mobile league edition"
```

## Plan Completion Gate

- All mobile contract schemas parse real API fixtures.
- A published slug never leaks another season or friendly matches.
- Historical rosters remain unchanged when `Player.teamId` changes.
- Standings and stats match event fixtures.
- Admin can configure, enroll, and publish an edition.
- API routes are public only for the explicitly whitelisted mobile GET surface.
- Migration and backfill are idempotent and verified before production.
