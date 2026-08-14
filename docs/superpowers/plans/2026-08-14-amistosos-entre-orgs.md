# Amistosos entre organizaciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an organization challenge another to a friendly: the host owns the Match, the guest accepts and fills side B from its own FriendlyPlayer pool, live stays on `/{hostSlug}/live/[matchId]`.

**Architecture:** Add `guestOrganizationId` + `challengeStatus` on `Match`. Intra-org friendlies keep `guestOrganizationId` null and `challengeStatus = NONE`. Challenge creates PENDING with empty side B. Accept → ACCEPTED; guest writes only side B. Clock/LIVE requires ACCEPTED plus existing captain/DT rules.

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-08-14-amistosos-entre-orgs-design.md`

**Depends on:** organizations. Reuses `GET /api/admin/organizations-directory` from the referee plan — if that route is missing, create it using Task 4 of `2026-08-14-pool-arbitros.md` before Task 6 here. Does not require Person, but career stats pick these matches up automatically if jugador único already shipped.

## Global Constraints

- UI: español chileno, tú.
- Do not open `MatchType.LEAGUE` across orgs.
- Do not dump a league Team onto side B (v1 pool only).
- Mobile league API stays `matchType=LEAGUE` only.
- Live 404 if URL slug ≠ host organization (already in `getLiveMatchSnapshot(id, slug)`).
- Commits one per task.

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/match-challenge.ts` | Invariants and transitions |
| `src/lib/validations/match.ts` | Challenge create schema (side B empty) |
| `prisma/schema.prisma` | ChallengeStatus + guestOrganizationId |
| `prisma/migrations/20260814160000_match_challenges/` | SQL |
| `src/app/api/matches/route.ts` | Create challenge |
| `src/app/api/matches/[id]/challenge/accept/route.ts` | Guest accept |
| `src/app/api/matches/[id]/challenge/decline/route.ts` | Guest decline |
| `src/app/api/matches/[id]/challenge/cancel/route.ts` | Host cancel |
| `src/app/api/matches/[id]/route.ts` | LIVE guard + roster side permissions |
| `src/components/admin/match-create/FriendlyMatchCreateWizard.tsx` | Challenge step |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/challenges/page.tsx` | Inbox |

---

### Task 1: Challenge invariants

**Files:**
- Create: `src/lib/match-challenge.ts`
- Test: `tests/lib/match-challenge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { ChallengeStatus, MatchType } from '@prisma/client'
import {
  assertChallengeCreate,
  assertCanEditFriendlySide,
  assertCanGoLive,
  nextChallengeStatus,
} from '@/lib/match-challenge'

describe('assertChallengeCreate', () => {
  it('rejects guest equal to host', () => {
    expect(() =>
      assertChallengeCreate({ hostOrganizationId: 'h', guestOrganizationId: 'h' }),
    ).toThrow(/misma/)
  })
})

describe('assertCanEditFriendlySide', () => {
  it('blocks host from editing side B on a challenge', () => {
    expect(
      assertCanEditFriendlySide({
        actorOrganizationId: 'h',
        match: {
          organizationId: 'h',
          guestOrganizationId: 'g',
          challengeStatus: ChallengeStatus.ACCEPTED,
          matchType: MatchType.FRIENDLY,
        },
        side: 'B',
      }),
    ).toBe(false)
  })

  it('allows guest to edit side B after accept', () => {
    expect(
      assertCanEditFriendlySide({
        actorOrganizationId: 'g',
        match: {
          organizationId: 'h',
          guestOrganizationId: 'g',
          challengeStatus: ChallengeStatus.ACCEPTED,
          matchType: MatchType.FRIENDLY,
        },
        side: 'B',
      }),
    ).toBe(true)
  })
})

describe('assertCanGoLive', () => {
  it('blocks LIVE while PENDING', () => {
    expect(
      assertCanGoLive({
        matchType: MatchType.FRIENDLY,
        challengeStatus: ChallengeStatus.PENDING,
        sideAReady: true,
        sideBReady: false,
      }),
    ).toEqual({ ok: false, error: 'El desafío todavía no fue aceptado' })
  })

  it('allows intra-org NONE', () => {
    expect(
      assertCanGoLive({
        matchType: MatchType.FRIENDLY,
        challengeStatus: ChallengeStatus.NONE,
        sideAReady: true,
        sideBReady: true,
      }),
    ).toEqual({ ok: true })
  })
})

describe('nextChallengeStatus', () => {
  it('maps accept/decline/cancel', () => {
    expect(nextChallengeStatus('accept', ChallengeStatus.PENDING)).toBe(ChallengeStatus.ACCEPTED)
    expect(nextChallengeStatus('decline', ChallengeStatus.PENDING)).toBe(ChallengeStatus.DECLINED)
    expect(nextChallengeStatus('cancel', ChallengeStatus.PENDING)).toBe(ChallengeStatus.CANCELLED)
    expect(() => nextChallengeStatus('accept', ChallengeStatus.ACCEPTED)).toThrow(/pendiente/)
  })
})
```

Until Prisma has `ChallengeStatus`, define a local const enum in `match-challenge.ts` **and** re-export it, then switch to `@prisma/client` in Task 2. To avoid a two-step type, **implement Task 2 schema first in the same session before running this test**, OR duplicate the string union:

```ts
export const ChallengeStatus = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
} as const
export type ChallengeStatus = (typeof ChallengeStatus)[keyof typeof ChallengeStatus]
```

Use this union in Task 1 tests (do not import from `@prisma/client` yet). After Task 2, change imports to Prisma; keep the helper signatures.

- [ ] **Step 2: Run to fail**

Run: `npx vitest run tests/lib/match-challenge.test.ts`

Expected: FAIL module not found

- [ ] **Step 3: Implement** `src/lib/match-challenge.ts` so all tests above pass (string-union version of ChallengeStatus). `assertCanEditFriendlySide` returns boolean. Intra-org (`guestOrganizationId` null): host may edit A and B.

- [ ] **Step 4: Run tests**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-challenge.ts tests/lib/match-challenge.test.ts
git commit -m "feat: inter-org friendly challenge guards"
```

---

### Task 2: Prisma fields

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260814160000_match_challenges/migration.sql`

- [ ] **Step 1: Enum + Match fields**

```prisma
enum ChallengeStatus {
  NONE
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
}
```

On Match:

```prisma
guestOrganizationId String?
guestOrganization   Organization? @relation("MatchGuestOrg", fields: [guestOrganizationId], references: [id], onDelete: Restrict)
challengeStatus     ChallengeStatus @default(NONE)

@@index([guestOrganizationId, challengeStatus])
```

On Organization add `guestMatches Match[] @relation("MatchGuestOrg")`.

- [ ] **Step 2: SQL**

```sql
CREATE TYPE "ChallengeStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
ALTER TABLE "Match" ADD COLUMN "guestOrganizationId" TEXT;
ALTER TABLE "Match" ADD COLUMN "challengeStatus" "ChallengeStatus" NOT NULL DEFAULT 'NONE';
CREATE INDEX "Match_guestOrganizationId_challengeStatus_idx"
  ON "Match"("guestOrganizationId", "challengeStatus");
ALTER TABLE "Match"
  ADD CONSTRAINT "Match_guestOrganizationId_fkey"
  FOREIGN KEY ("guestOrganizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 3:** `npx prisma generate` then switch `match-challenge.ts` tests to import `ChallengeStatus` from `@prisma/client`. Re-run `npx vitest run tests/lib/match-challenge.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260814160000_match_challenges src/lib/match-challenge.ts tests/lib/match-challenge.test.ts
git commit -m "feat: store guest organization on friendly challenges"
```

---

### Task 3: Zod create schema for challenges

**Files:**
- Modify: `src/lib/validations/match.ts`
- Test: `tests/lib/validations.test.ts` (extend existing file)

- [ ] **Step 1: Add `createFriendlyChallengeSchema`**

Same as `createFriendlyMatchSchema` but:

- `guestOrganizationSlug: z.string().min(1)`
- `players` only side A, still require one captain and one DT **on side A only**
- no side B players allowed (`players.every(p => p.side === 'A')`)

Do **not** weaken intra-org `createFriendlyMatchSchema`.

- [ ] **Step 2: Tests**

Intra-org schema still fails without side B. Challenge schema succeeds with only side A captain+DT. Challenge schema fails if a side B player is present.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/match.ts tests/lib/validations.test.ts
git commit -m "feat: validate challenge friendlies with host roster only"
```

---

### Task 4: POST /api/matches challenge + list filters

**Files:**
- Modify: `src/app/api/matches/route.ts`
- Test: `tests/api/match-challenge-create.test.ts`

- [ ] **Step 1: Failing test**

POST body with `guestOrganizationSlug: 'other'` → created match has `challengeStatus: 'PENDING'`, `guestOrganizationId` set, `friendlyPlayers` only side A.

Invalid slug / paused org / same slug → 400.

- [ ] **Step 2: Implement**

If `guestOrganizationSlug` present, parse with `createFriendlyChallengeSchema`. Load guest org `status === ACTIVE` and `id !== organizationId`. Create match with `challengeStatus: PENDING`, `guestOrganizationId`, `sideBName: guest.name` (or body `sideBName` defaulting to guest.name), side A from host. `createMany` only side A players. Verify each FriendlyPlayer.organizationId === host.

GET list: `where: { organizationId, challengeStatus: { notIn: ['DECLINED', 'CANCELLED'] } }` **OR** include guest matches: `{ OR: [{ organizationId }, { guestOrganizationId: organizationId, challengeStatus: { in: ['PENDING', 'ACCEPTED'] } }] }`. Host calendar should not show DECLINED. Guest should see PENDING/ACCEPTED in their admin matches list.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/matches/route.ts tests/api/match-challenge-create.test.ts
git commit -m "feat: create inter-org friendly challenges"
```

---

### Task 5: Accept / decline / cancel routes

**Files:**
- Create: `src/app/api/matches/[id]/challenge/accept/route.ts`
- Create: `src/app/api/matches/[id]/challenge/decline/route.ts`
- Create: `src/app/api/matches/[id]/challenge/cancel/route.ts`
- Test: `tests/api/match-challenge-transitions.test.ts`

- [ ] **Step 1: Accept**

`requireOrgRole([ORG_ADMIN])`. Match.guestOrganizationId === organizationId. `nextChallengeStatus('accept', status)`. Set ACCEPTED. Do not add players.

- [ ] **Step 2: Decline** — guest, PENDING → DECLINED.

- [ ] **Step 3: Cancel** — host (`match.organizationId === organizationId`), PENDING → CANCELLED.

- [ ] **Step 4: Tests** for 403 when host tries accept; 409 when accept ACCEPTED.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/matches/[id]/challenge tests/api/match-challenge-transitions.test.ts
git commit -m "feat: accept decline and cancel friendly challenges"
```

---

### Task 6: Roster + LIVE guards

**Files:**
- Modify: `src/app/api/matches/[id]/route.ts` (PUT players and status)
- Modify: `src/app/api/matches/[id]/friendly-players/...` paid/galleta routes if they exist
- Test: `tests/api/match-challenge-roster.test.ts`

- [ ] **Step 1: When PUT includes `players`**

Load match. For each player, check `assertCanEditFriendlySide` for that side. Reject host writing side B on challenge. Reject guest writing side A. Guest FriendlyPlayer.organizationId must equal `guestOrganizationId`. Host FriendlyPlayer.organizationId must equal host.

If challenge PENDING, reject any side B writes.

- [ ] **Step 2: When status becomes LIVE**

Compute side ready (captain+DT+≥1 player per side) from current FriendlyMatchPlayer rows. `assertCanGoLive`. If `{ ok: false }` → 400 `{ error }`.

- [ ] **Step 3: Paid/galleta**

Find routes under `src/app/api/matches/[id]/friendly-players/`. Apply the same side permission helper before toggle.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/matches/[id] tests/api/match-challenge-roster.test.ts
git commit -m "feat: lock challenge rosters and live until accepted"
```

---

### Task 7: Wizard + challenges inbox UI

**Files:**
- Modify: `src/components/admin/match-create/FriendlyMatchCreateWizard.tsx`
- Create: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/challenges/page.tsx`
- Create: `src/components/admin/ChallengeInbox.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/layout.tsx` — nav “Desafíos” with `activePrefixes` including challenges. Badge optional skip.
- Modify: guest roster editor — reuse `FriendlyMatchTeamAssigner` on a new page `admin/challenges/[id]` for ACCEPTED guest side B.

- [ ] **Step 1: Wizard**

Radio: “Solo mi organización” (default) vs “Desafiar a otra liga”. If challenge: fetch `/api/admin/organizations-directory`, select org, skip side B assigner, set `sideBName` to selected org name, POST with `guestOrganizationSlug`. Copy: “El visitante arma su lado cuando acepte”.

- [ ] **Step 2: Inbox**

Server query matches where guestOrganizationId = org (PENDING/ACCEPTED) or organizationId = org and challengeStatus PENDING/ACCEPTED. Buttons call accept/decline/cancel. ACCEPTED guest: link “Armar tu lado”.

- [ ] **Step 3: Guest side page**

Lists guest pool, uses existing assigner, PUT players only side B.

- [ ] **Step 4: Calendar cards**

If `challengeStatus === 'PENDING'`, show “Esperando a {guestName}”. Filter DECLINED/CANCELLED out of próximos (Task 4 GET already filters).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/match-create/FriendlyMatchCreateWizard.tsx src/components/admin/ChallengeInbox.tsx src/app/(tenant)/[organizationSlug]/(dashboard)/admin/challenges src/app/(tenant)/[organizationSlug]/(dashboard)/admin/layout.tsx
git commit -m "feat: challenge friendly admin UX"
```

---

### Task 8: Live branding for guest org

**Files:**
- Modify: `src/lib/live-match-snapshot.ts` — include `guestOrganization { name, logoStoragePath }` when present
- Modify: `src/components/live/LiveScoreboard.tsx` — if no side crest, show guest/host org logo on that side
- Test: extend `tests/lib/live-match-snapshot.test.ts`

- [ ] **Step 1: Snapshot type**

```ts
guestOrganization: { name: string; logoUrl: string | null } | null
```

`logoUrl` via `editorialPublicUrl`. Null when `guestOrganizationId` is null.

- [ ] **Step 2: Scoreboard**

Away/home crest fallback: `match.awayTeam.crestSrc ?? match.guestOrganization?.logoUrl` for side B on challenges (away = side B). Host org logo already in header.

- [ ] **Step 3: Test** fixture includes `guestOrganization: null` so existing tests keep passing. New case with guest org name.

- [ ] **Step 4: Commit**

```bash
git add src/lib/live-match-snapshot.ts src/components/live/LiveScoreboard.tsx tests/lib/live-match-snapshot.test.ts
git commit -m "feat: show guest org branding on challenge live"
```

---

### Task 9: Verification

- [ ] **Step 1: Run**

Run: `npx vitest run tests/lib/match-challenge.test.ts tests/lib/validations.test.ts tests/api/match-challenge-create.test.ts tests/api/match-challenge-transitions.test.ts tests/api/match-challenge-roster.test.ts tests/lib/live-match-snapshot.test.ts`

Expected: PASS

- [ ] **Step 2: Confirm mobile league resolver still uses `MatchType.LEAGUE` only** (`src/lib/mobile/league-context.ts` `assertLeagueMatch`). No change.

- [ ] **Step 3: Confirm live with guest slug 404** — existing `getLiveMatchSnapshot(id, slug)` compares host org slug, not guest. Add a unit test: match.organization.slug `kelme`, call with `other` → null.
