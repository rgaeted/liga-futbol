# AdminTorneo Organizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-league Torneos Kelme app into AdminTorneo: path-based tenants (`/kelme/...`), a platform console to create companies, membership roles per organization, and org branding (logo + colors).

**Architecture:** One Postgres, one deploy. `Organization` + `OrganizationMembership` own all league data. Pages live under `src/app/(tenant)/[organizationSlug]/`. Session JWT carries `activeOrganizationId`, `membershipRole`, and `isPlatformAdmin`. Mutating/list APIs stay at `/api/*` but **must** filter and authorize by `session.activeOrganizationId` (public GET by `matchId` stays unprefixed). Do not move the entire `/api` tree; isolation is enforced by FK + session, not by duplicating routes.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Auth.js JWT, Zod 4, Vitest 4, Tailwind v4, Supabase Storage (existing `editorial` bucket for org logos).

**Spec:** `docs/superpowers/specs/2026-08-14-admintorneo-organizations-design.md`

## Global Constraints

- UI copy: Chilean Spanish, tú. Product name in marketing/login: **AdminTorneo**. First tenant name: **Torneos Kelme**, slug `kelme`.
- Do not change match clock, formations, MVP, or realtime payloads.
- Do not change `/api/mobile/v1/leagues/[slug]/*` contracts.
- Reserved organization slugs: `plataforma`, `login`, `register`, `api`, `privacidad`, `admin`, `live`, `ayuda`, `mantenimiento`, `organizaciones`.
- `User.role` is removed in the same Prisma migration after backfill. Authz reads membership only.
- One membership row per (user, organization) in v1.
- Platform admin is `User.isPlatformAdmin`. Seed/script sets it for `admin@liga.com` in demo; production uses `scripts/grant-platform-admin.ts`.
- Commits: one per task. Do not commit `.env` or `docs/handoff/`.
- Read `node_modules/next/dist/docs/` before adding App Router layouts.

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/organization-slug.ts` | Slug parse, reserved list |
| `src/lib/membership-role.ts` | `MembershipRole`, `canAccess`, `getDashboardPath(slug, role)`, legacy role map |
| `src/lib/tenant-paths.ts` | `orgPath`, `rewriteLegacyTenantPath` |
| `src/lib/organization-status.ts` | Paused org HTTP helpers |
| `src/lib/organizations.ts` | Create/pause/invite (server, Prisma) |
| `src/lib/org-scope.ts` | `assertSameOrganization`, `requireOrgRole`, `requirePlatformAdmin` |
| `src/lib/auth.ts` / `auth.config.ts` | JWT fields, login |
| `src/lib/proxy-policy.ts` / `src/proxy.ts` | Public tenant routes, legacy 308, area checks |
| `prisma/schema.prisma` | Organization, membership, FKs |
| `prisma/migrations/20260814120000_organizations/` | SQL + Kelme backfill |
| `src/app/plataforma/*` | Platform UI |
| `src/app/api/plataforma/*` | Platform APIs |
| `src/app/(tenant)/[organizationSlug]/*` | Tenant pages (moved dashboards + live + ayuda) |
| `src/app/organizaciones/page.tsx` | Org picker |
| `src/app/api/auth/post-login/route.ts` | Redirect target after credentials |
| `src/app/api/me/organization/route.ts` | Switch active org |
| `scripts/grant-platform-admin.ts` | Promote platform admin by email |

---

### Task 1: Organization slug rules

**Files:**
- Create: `src/lib/organization-slug.ts`
- Test: `tests/lib/organization-slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  ORGANIZATION_SLUG_REGEX,
  RESERVED_ORGANIZATION_SLUGS,
  parseOrganizationSlug,
} from '@/lib/organization-slug'

describe('parseOrganizationSlug', () => {
  it('accepts kelme', () => {
    expect(parseOrganizationSlug('kelme')).toEqual({ ok: true, slug: 'kelme' })
  })

  it('rejects reserved slugs', () => {
    for (const slug of ['plataforma', 'login', 'admin', 'live', 'api']) {
      expect(parseOrganizationSlug(slug)).toEqual({ ok: false, error: 'reserved' })
    }
  })

  it('rejects uppercase and spaces', () => {
    expect(parseOrganizationSlug('Kelme').ok).toBe(false)
    expect(parseOrganizationSlug('liga sur').ok).toBe(false)
  })

  it('exports a regex matching the parser', () => {
    expect(ORGANIZATION_SLUG_REGEX.test('kelme-invierno-2026')).toBe(true)
    expect(RESERVED_ORGANIZATION_SLUGS.has('privacidad')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/organization-slug.test.ts`

Expected: FAIL because `@/lib/organization-slug` does not exist.

- [ ] **Step 3: Implement**

```ts
export const RESERVED_ORGANIZATION_SLUGS = new Set([
  'plataforma',
  'login',
  'register',
  'api',
  'privacidad',
  'admin',
  'live',
  'ayuda',
  'mantenimiento',
  'organizaciones',
])

export const ORGANIZATION_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type ParseSlugResult =
  | { ok: true; slug: string }
  | { ok: false; error: 'reserved' | 'invalid' }

export function parseOrganizationSlug(raw: string): ParseSlugResult {
  if (!ORGANIZATION_SLUG_REGEX.test(raw)) return { ok: false, error: 'invalid' }
  if (RESERVED_ORGANIZATION_SLUGS.has(raw)) return { ok: false, error: 'reserved' }
  return { ok: true, slug: raw }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/organization-slug.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/organization-slug.ts tests/lib/organization-slug.test.ts
git commit -m "feat: validate organization slugs and reserved names"
```

---

### Task 2: Membership roles and dashboard paths

**Files:**
- Create: `src/lib/membership-role.ts`
- Modify: `src/lib/roles.ts` (re-export from membership-role for one release, then delete call sites of `Role.ADMIN`)
- Test: `tests/lib/roles.test.ts` (rewrite)

Do **not** keep `Role.ADMIN` as a valid membership role. Map it only in `membershipRoleFromLegacyUserRole`.

- [ ] **Step 1: Rewrite `tests/lib/roles.test.ts` to the new API (this will fail)**

```ts
import { describe, expect, it } from 'vitest'
import {
  MembershipRole,
  canAccess,
  getDashboardPath,
  membershipRoleFromLegacyUserRole,
} from '@/lib/membership-role'

describe('membership roles', () => {
  it('org admin can access admin area', () => {
    expect(canAccess(MembershipRole.ORG_ADMIN, 'admin')).toBe(true)
  })

  it('player cannot access admin', () => {
    expect(canAccess(MembershipRole.PLAYER, 'admin')).toBe(false)
  })

  it('returns tenant dashboard paths', () => {
    expect(getDashboardPath('kelme', MembershipRole.COACH)).toBe('/kelme/coach')
    expect(getDashboardPath('kelme', MembershipRole.REFEREE)).toBe('/kelme/referee')
    expect(getDashboardPath('kelme', MembershipRole.ORG_ADMIN)).toBe('/kelme/admin')
    expect(getDashboardPath('kelme', MembershipRole.FRIENDLY_COACH)).toBe(
      '/kelme/player/friendly-matches',
    )
  })

  it('maps legacy ADMIN to ORG_ADMIN', () => {
    expect(membershipRoleFromLegacyUserRole('ADMIN')).toBe(MembershipRole.ORG_ADMIN)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/lib/roles.test.ts`

- [ ] **Step 3: Implement `src/lib/membership-role.ts`**

```ts
export const MembershipRole = {
  ORG_ADMIN: 'ORG_ADMIN',
  COACH: 'COACH',
  REFEREE: 'REFEREE',
  PLAYER: 'PLAYER',
  FRIENDLY_COACH: 'FRIENDLY_COACH',
} as const

export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole]

export type RouteArea = 'admin' | 'player' | 'coach' | 'referee' | 'live'

const ROLE_ACCESS: Record<MembershipRole, RouteArea[]> = {
  [MembershipRole.ORG_ADMIN]: ['admin', 'player', 'coach', 'referee', 'live'],
  [MembershipRole.PLAYER]: ['player', 'live'],
  [MembershipRole.COACH]: ['coach', 'live'],
  [MembershipRole.REFEREE]: ['referee', 'live'],
  [MembershipRole.FRIENDLY_COACH]: ['player', 'live'],
}

export function canAccess(role: MembershipRole, area: RouteArea): boolean {
  return ROLE_ACCESS[role].includes(area)
}

export function getDashboardPath(slug: string, role: MembershipRole): string {
  const paths: Record<MembershipRole, string> = {
    [MembershipRole.ORG_ADMIN]: `/${slug}/admin`,
    [MembershipRole.PLAYER]: `/${slug}/player`,
    [MembershipRole.COACH]: `/${slug}/coach`,
    [MembershipRole.REFEREE]: `/${slug}/referee`,
    [MembershipRole.FRIENDLY_COACH]: `/${slug}/player/friendly-matches`,
  }
  return paths[role]
}

export function isPlayerAreaRole(role: MembershipRole): boolean {
  return role === MembershipRole.PLAYER || role === MembershipRole.FRIENDLY_COACH
}

export function membershipRoleFromLegacyUserRole(
  role: 'PLAYER' | 'ADMIN' | 'COACH' | 'REFEREE' | 'FRIENDLY_COACH',
): MembershipRole {
  if (role === 'ADMIN') return MembershipRole.ORG_ADMIN
  return role
}
```

Keep `src/lib/roles.ts` temporarily re-exporting `canAccess` only if other files still import it; in Task 8 those imports switch. For this commit, update `roles.ts` to re-export from `membership-role` **and** change `getDashboardPath` signature — that will break compile until later tasks. **Do not re-export a 1-arg `getDashboardPath`.** Leave `roles.ts` as:

```ts
export {
  MembershipRole as Role,
  canAccess,
  getDashboardPath,
  isPlayerAreaRole,
} from '@/lib/membership-role'
export type { MembershipRole, RouteArea } from '@/lib/membership-role'
```

That will fail `tsc` because `getDashboardPath` now needs a slug. That is intended; Task 8/12 fix call sites. This task only needs the new unit tests green.

If `npx tsc --noEmit` is too red to proceed, **do not** re-export from `roles.ts` in this commit. Only add `membership-role.ts` and rewrite `roles.test.ts` to import from `@/lib/membership-role`. Leave `roles.ts` unchanged until Task 8.

**Choice: do not touch `roles.ts` in this task.**

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/roles.test.ts tests/lib/organization-slug.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/membership-role.ts tests/lib/roles.test.ts
git commit -m "feat: add membership roles and tenant dashboard paths"
```

---

### Task 3: Legacy path rewrite

**Files:**
- Create: `src/lib/tenant-paths.ts`
- Test: `tests/lib/tenant-paths.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest'
import { orgPath, rewriteLegacyTenantPath } from '@/lib/tenant-paths'

describe('tenant paths', () => {
  it('builds org-prefixed paths', () => {
    expect(orgPath('kelme', '/admin/matches')).toBe('/kelme/admin/matches')
    expect(orgPath('kelme', 'admin')).toBe('/kelme/admin')
  })

  it('rewrites legacy bookmarks to kelme', () => {
    expect(rewriteLegacyTenantPath('/admin')).toBe('/kelme/admin')
    expect(rewriteLegacyTenantPath('/admin/matches')).toBe('/kelme/admin/matches')
    expect(rewriteLegacyTenantPath('/live/abc')).toBe('/kelme/live/abc')
    expect(rewriteLegacyTenantPath('/ayuda')).toBe('/kelme/ayuda')
    expect(rewriteLegacyTenantPath('/coach')).toBe('/kelme/coach')
    expect(rewriteLegacyTenantPath('/login')).toBeNull()
    expect(rewriteLegacyTenantPath('/kelme/admin')).toBeNull()
    expect(rewriteLegacyTenantPath('/plataforma')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/lib/tenant-paths.test.ts`

- [ ] **Step 3: Implement**

```ts
const LEGACY_ROOTS = ['/admin', '/coach', '/referee', '/player', '/live', '/ayuda'] as const

export function orgPath(slug: string, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `/${slug}${suffix}`
}

export function rewriteLegacyTenantPath(
  pathname: string,
  defaultSlug = 'kelme',
): string | null {
  for (const root of LEGACY_ROOTS) {
    if (pathname === root || pathname.startsWith(`${root}/`)) {
      return `/${defaultSlug}${pathname}`
    }
  }
  return null
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/lib/tenant-paths.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant-paths.ts tests/lib/tenant-paths.test.ts
git commit -m "feat: rewrite legacy league URLs under /kelme"
```

---

### Task 4: Prisma schema, migration, Kelme backfill

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260814120000_organizations/migration.sql`
- Modify: `prisma/seed-demo.ts` (User create: drop `role`, add membership + `isPlatformAdmin` for demo admin)
- Modify: any `Role` enum import from `@prisma/client` will break — this task includes schema only; TypeScript fixes are Task 5–8. After `prisma generate`, `tsc` will be red until those tasks. That is OK if you keep generating.

- [ ] **Step 1: Add this failing unit test for paused-org JSON (pure, no DB)**

Create `tests/lib/organization-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pausedOrganizationPayload } from '@/lib/organization-status'

describe('pausedOrganizationPayload', () => {
  it('returns a 503 body without revealing existence details', () => {
    expect(pausedOrganizationPayload()).toEqual({
      error: 'Organización no disponible',
    })
  })
})
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run tests/lib/organization-status.test.ts`

- [ ] **Step 3: Add `src/lib/organization-status.ts`**

```ts
export function pausedOrganizationPayload() {
  return { error: 'Organización no disponible' as const }
}

export const PAUSED_ORGANIZATION_STATUS = 503 as const
```

- [ ] **Step 4: Tests PASS for organization-status**

- [ ] **Step 5: Update `prisma/schema.prisma`**

Replace `enum Role` with:

```prisma
enum MembershipRole {
  ORG_ADMIN
  COACH
  REFEREE
  PLAYER
  FRIENDLY_COACH
}

enum OrganizationStatus {
  ACTIVE
  PAUSED
}
```

Change `User`:

```prisma
model User {
  id               String   @id @default(cuid())
  email            String   @unique
  passwordHash     String
  name             String
  isPlatformAdmin  Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  player           Player?
  friendlyPlayer   FriendlyPlayer?
  coachedTeam      Team?    @relation("TeamCoach")
  refereeMatches   Match[]  @relation("MatchReferee")
  articles         Article[]
  memberships      OrganizationMembership[]
}
```

Add:

```prisma
model Organization {
  id               String             @id @default(cuid())
  slug             String             @unique
  name             String
  logoStoragePath  String?
  primaryColor     String
  secondaryColor   String
  status           OrganizationStatus @default(ACTIVE)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  memberships      OrganizationMembership[]
  seasons          Season[]
  teams            Team[]
  matches          Match[]
  friendlyCategories FriendlyCategory[]
  friendlyPlayers  FriendlyPlayer[]
  articles         Article[]
  galleries        Gallery[]
  sponsors         Sponsor[]
}

model OrganizationMembership {
  id             String         @id @default(cuid())
  organizationId String
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           MembershipRole
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([organizationId, userId])
  @@index([userId])
}
```

Add `organizationId String` + relation on `Season`, `Team`, `Match`, `FriendlyCategory`, `FriendlyPlayer`, `Article`, `Gallery`, `Sponsor`. After backfill they are required (`String`, not `String?`).

- [ ] **Step 6: Write `prisma/migrations/20260814120000_organizations/migration.sql`**

The SQL must, in one transaction:

1. Create enums `MembershipRole`, `OrganizationStatus`.
2. Create `Organization`, `OrganizationMembership`.
3. Add nullable `organizationId` columns.
4. Insert Kelme:

```sql
INSERT INTO "Organization" ("id", "slug", "name", "primaryColor", "secondaryColor", "status", "updatedAt")
VALUES (
  'org_kelme',
  'kelme',
  'Torneos Kelme',
  '#CD212A',
  '#FFFFFF',
  'ACTIVE',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
```

5. `UPDATE` Season, Team, Match, FriendlyCategory, FriendlyPlayer, Article, Gallery, Sponsor SET `"organizationId" = (SELECT id FROM "Organization" WHERE slug = 'kelme')`.
6. `ALTER COLUMN ... SET NOT NULL` + FKs + indexes.
7. Add `User.isPlatformAdmin` default false.
8. Backfill memberships from `User.role`:

```sql
INSERT INTO "OrganizationMembership" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT
  concat('mem_', "User"."id"),
  (SELECT id FROM "Organization" WHERE slug = 'kelme'),
  "User"."id",
  CASE "User"."role"
    WHEN 'ADMIN' THEN 'ORG_ADMIN'::"MembershipRole"
    ELSE "User"."role"::text::"MembershipRole"
  END,
  CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("organizationId", "userId") DO NOTHING;
```

(If `MembershipRole` cannot be cast from old `Role` because `ADMIN` is not in the new enum, use the `CASE` above only — do not `::"MembershipRole"` on ADMIN.)

9. `ALTER TABLE "User" DROP COLUMN "role"; DROP TYPE "Role";`

If PostgreSQL cannot drop `Role` while the CASE still runs, drop the column after memberships exist.

10. Do **not** set `isPlatformAdmin` for all former admins.

- [ ] **Step 7: Generate client**

Run: `npx prisma generate`

Expected: client includes `organization`, `organizationMembership`, `MembershipRole`.

- [ ] **Step 8: Commit schema + migration + organization-status**

```bash
git add prisma/schema.prisma prisma/migrations/20260814120000_organizations src/lib/organization-status.ts tests/lib/organization-status.test.ts
git commit -m "feat: add organizations and backfill Kelme tenant"
```

Do not run `migrate deploy` against production in this task unless the user asked. Local: `npx prisma migrate deploy` if `DIRECT_URL` is available.

---

### Task 5: Auth session carries org membership

**Files:**
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/lib/auth.config.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add `tests/lib/post-login-redirect.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { resolvePostLoginPath } from '@/lib/post-login-redirect'
import { MembershipRole } from '@/lib/membership-role'

describe('resolvePostLoginPath', () => {
  it('sends platform admin without memberships to /plataforma', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: true,
        memberships: [],
      }),
    ).toBe('/plataforma')
  })

  it('sends a user with one active membership to their dashboard', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [{ slug: 'kelme', role: MembershipRole.COACH, status: 'ACTIVE' }],
      }),
    ).toBe('/kelme/coach')
  })

  it('sends a user with several memberships to the picker', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [
          { slug: 'kelme', role: MembershipRole.ORG_ADMIN, status: 'ACTIVE' },
          { slug: 'otra', role: MembershipRole.REFEREE, status: 'ACTIVE' },
        ],
      }),
    ).toBe('/organizaciones')
  })

  it('ignores paused orgs when counting memberships', () => {
    expect(
      resolvePostLoginPath({
        isPlatformAdmin: false,
        memberships: [{ slug: 'kelme', role: MembershipRole.ORG_ADMIN, status: 'PAUSED' }],
      }),
    ).toBe('/login?error=sin-acceso')
  })
})
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run tests/lib/post-login-redirect.test.ts`

- [ ] **Step 3: Implement `src/lib/post-login-redirect.ts` using `getDashboardPath`**

```ts
import { getDashboardPath, type MembershipRole } from '@/lib/membership-role'

export type PostLoginMembership = {
  slug: string
  role: MembershipRole
  status: 'ACTIVE' | 'PAUSED'
}

export function resolvePostLoginPath(input: {
  isPlatformAdmin: boolean
  memberships: PostLoginMembership[]
}): string {
  const active = input.memberships.filter((m) => m.status === 'ACTIVE')
  if (active.length === 1) return getDashboardPath(active[0].slug, active[0].role)
  if (active.length > 1) return '/organizaciones'
  if (input.isPlatformAdmin) return '/plataforma'
  return '/login?error=sin-acceso'
}
```

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Update Auth types and callbacks**

`src/types/next-auth.d.ts`:

```ts
import type { MembershipRole } from '@/lib/membership-role'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    isPlatformAdmin: boolean
    membershipRole: MembershipRole | null
    activeOrganizationId: string | null
    activeOrganizationSlug: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      isPlatformAdmin: boolean
      membershipRole: MembershipRole | null
      activeOrganizationId: string | null
      activeOrganizationSlug: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    isPlatformAdmin: boolean
    membershipRole: MembershipRole | null
    activeOrganizationId: string | null
    activeOrganizationSlug: string | null
  }
}
```

In `authorize` (`src/lib/auth.ts`), after password check, load memberships with `organization: { select: { id: true, slug: true, status: true } }`. Pick the single ACTIVE membership if exactly one; otherwise leave `activeOrganizationId` null (picker). Return those fields on the user object (no `role`).

In `auth.config.ts` jwt/session, copy `isPlatformAdmin`, `membershipRole`, `activeOrganizationId`, `activeOrganizationSlug`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/post-login-redirect.ts tests/lib/post-login-redirect.test.ts src/types/next-auth.d.ts src/lib/auth.config.ts src/lib/auth.ts
git commit -m "feat: put organization membership on the auth session"
```

---

### Task 6: `requireOrgRole` and `requirePlatformAdmin`

**Files:**
- Create: `src/lib/org-scope.ts`
- Modify: `src/lib/auth.ts` — keep `requireRole` as a thin wrapper that throws if used, **or** replace it now.

Replace `requireRole` in this task with:

```ts
export async function requirePlatformAdmin() {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) throw new Error('Unauthorized')
  return session
}

export async function requireOrgRole(allowed: MembershipRole[]) {
  const session = await auth()
  const role = session?.user?.membershipRole
  const orgId = session?.user?.activeOrganizationId
  if (!session || !role || !orgId || !allowed.includes(role)) {
    throw new Error('Unauthorized')
  }
  return { session, organizationId: orgId, role }
}

export function assertSameOrganization(resourceOrgId: string, sessionOrgId: string) {
  if (resourceOrgId !== sessionOrgId) {
    throw new Error('Forbidden')
  }
}
```

Add `tests/lib/org-scope.test.ts` for `assertSameOrganization` only (pure).

- [ ] **Step 1: Failing test for assertSameOrganization**
- [ ] **Step 2: Implement and PASS**
- [ ] **Step 3: Add require functions to `src/lib/auth.ts` (they use `auth()`, untested here)**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: authorize by organization membership"
```

---

### Task 7: Proxy policy — public tenant routes + legacy rewrite hook

**Files:**
- Modify: `src/lib/proxy-policy.ts`
- Modify: `tests/lib/proxy-policy.test.ts`

- [ ] **Step 1: Extend tests**

Add cases:

- `isPublicRequest('GET', '/kelme/live/match-1')` true
- `isPublicRequest('GET', '/kelme/ayuda')` true
- `isPublicRequest('GET', '/plataforma')` false
- `isPublicRequest('GET', '/organizaciones')` false
- `isPublicRequest('GET', '/kelme/admin')` false
- mobile league GET still true
- `/login` still true
- `/` still true

Add `rewriteLegacyTenantPath` usage tests in proxy-policy **or** keep rewrite in `proxy.ts` and only expand `isPublicRequest`.

Update `isPublicRequest`:

```ts
const tenantLive = /^\/[^/]+\/live(?:\/|$)/
const tenantAyuda = /^\/[^/]+\/ayuda(?:\/|$)/
```

Treat those GET/HEAD as public. Do not make `/{slug}/admin` public.

Also keep `/live` and `/ayuda` public so the 308 can happen after auth skip — actually legacy `/admin` is **not** public; authenticated users get rewritten in `proxy.ts`. Unauthenticated `/admin` → login with callbackUrl `/admin`, then post-login should land on tenant dashboard anyway.

For unauthenticated `/live/x`: must remain public **and** rewrite to `/kelme/live/x` in proxy (308). So `isPublicRequest` stays true for `/live` and `/kelme/.../live`.

- [ ] **Step 2: FAIL then implement then PASS**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: treat tenant live and help routes as public"
```

---

### Task 8: `src/proxy.ts` tenant area + 308

**Files:**
- Modify: `src/proxy.ts`

After migration decision and public check:

1. If `rewriteLegacyTenantPath(pathname)` is non-null, `NextResponse.redirect` **308** to that path (preserve search).
2. If pathname is `/plataforma` and `!req.auth?.user?.isPlatformAdmin`, 401 JSON for API-less page → redirect `/login`.
3. Parse `/{slug}/admin|player|coach|referee` — `area` is `segments[2]`, not `segments[1]`. Use `canAccess(session.membershipRole, area)`. If no membershipRole, redirect `/organizaciones` or `/login`.
4. Do not use `getDashboardPath(role)` 1-arg. Use `getDashboardPath(slug, membershipRole)`.

- [ ] **Step 1: Add `tests/lib/proxy-tenant.test.ts` extracting a pure function**

Create `src/lib/proxy-tenant.ts`:

```ts
export function tenantDashboardArea(pathname: string): {
  slug: string
  area: 'admin' | 'player' | 'coach' | 'referee'
} | null
```

Test `/kelme/admin/matches` → `{ slug: 'kelme', area: 'admin' }`; `/plataforma` → null; `/kelme/live/x` → null.

- [ ] **Step 2: FAIL / implement / PASS**
- [ ] **Step 3: Wire `proxy.ts`**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: gate tenant dashboards and redirect legacy URLs"
```

---

### Task 9: Organization service (create, pause, invite)

**Files:**
- Create: `src/lib/organizations.ts`
- Create: `src/lib/validations/organization.ts`
- Test: `tests/lib/validations-organization.test.ts`
- Test: `tests/lib/organizations-invite.test.ts` for pure conflict rules if extracted

- [ ] **Step 1: Zod tests**

```ts
import { describe, expect, it } from 'vitest'
import { createOrganizationSchema } from '@/lib/validations/organization'

describe('createOrganizationSchema', () => {
  it('rejects reserved slug', () => {
    const parsed = createOrganizationSchema.safeParse({
      slug: 'admin',
      name: 'X',
      primaryColor: '#CD212A',
      secondaryColor: '#FFFFFF',
      adminEmail: 'a@b.cl',
      adminName: 'Ana Admin',
      adminPassword: 'secret1',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts kelme-like payload', () => {
    const parsed = createOrganizationSchema.safeParse({
      slug: 'liga-sur',
      name: 'Liga Sur',
      primaryColor: '#1d4ed8',
      secondaryColor: '#ffffff',
      adminEmail: 'dt@liga.cl',
      adminName: 'Ana Soto',
      adminPassword: 'secret1',
    })
    expect(parsed.success).toBe(true)
  })
})
```

Schema: `slug` via `parseOrganizationSlug`; colors `/^#[0-9A-Fa-f]{6}$/`; admin email/name/password same mins as `createUserSchema`.

- [ ] **Step 2: Implement `createOrganizationSchema`**
- [ ] **Step 3: Implement `createOrganization` in `src/lib/organizations.ts`** using `db.$transaction`:

1. Parse slug; throw `{ code: 'reserved'|'invalid' }`.
2. If slug exists → `{ code: 'slug_taken' }`.
3. Create Organization ACTIVE.
4. Find user by email; if exists, create membership ORG_ADMIN (do not overwrite other orgs). If membership for this org exists → `{ code: 'admin_exists' }`.
5. If user does not exist, create User (no role field) + membership.
6. Return `{ organization, adminUserId }`.

Logo: nullable on create; upload is Task 10.

Pause:

```ts
export async function setOrganizationStatus(id: string, status: 'ACTIVE' | 'PAUSED')
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: create and pause organizations with first admin"
```

---

### Task 10: Platform API + logo upload

**Files:**
- Create: `src/app/api/plataforma/organizations/route.ts` (GET list, POST create)
- Create: `src/app/api/plataforma/organizations/[id]/route.ts` (PATCH status)
- Create: `src/app/api/plataforma/organizations/[id]/logo/route.ts` (POST)

GET: `requirePlatformAdmin()`, include `_count.memberships`.

POST: `requirePlatformAdmin()`, `createOrganization`. Map errors: reserved/invalid → 400, slug_taken → 409, admin_exists → 409.

PATCH body `{ status: 'ACTIVE' | 'PAUSED' }`.

Logo POST: `uploadEditorialObject(editorialStoragePath(['orgs', id, 'logo']), buffer, mime)` then update `logoStoragePath`. Reuse mime checks from `src/app/api/admin/seasons/[id]/mobile/logo/route.ts`.

- [ ] **Step 1: No HTTP e2e required; add a small test that `editorialStoragePath(['orgs', 'org_kelme', 'logo'])` equals `orgs/org_kelme/logo`** (already true via existing helper). Skip if covered.

- [ ] **Step 2: Implement routes**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add platform organization APIs"
```

---

### Task 11: Platform UI `/plataforma`

**Files:**
- Create: `src/app/plataforma/layout.tsx` — server: `auth()`, if `!isPlatformAdmin` redirect `/login`. Neutral AdminTorneo header (not Kelme red as product identity; use zinc/black).
- Create: `src/app/plataforma/page.tsx` — list orgs (fetch GET `/api/plataforma/organizations`).
- Create: `src/components/plataforma/OrganizationCreateForm.tsx` client form (slug, name, colors, first admin).
- Create: `src/components/plataforma/OrganizationStatusButton.tsx`

Copy: “Empresas”, “Crear empresa”, “Pausar”, “Reactivar”. No “entrar como”.

- [ ] **Step 1: Implement pages**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add AdminTorneo platform console"
```

---

### Task 12: Post-login API, org picker, switch org

**Files:**
- Create: `src/app/api/auth/post-login/route.ts` — `auth()`, load memberships, return `{ path: resolvePostLoginPath(...) }`.
- Modify: `src/app/(auth)/login/page.tsx` — after successful `signIn`, `fetch('/api/auth/post-login')` and `window.location.assign(path)` instead of blindly using callbackUrl when callbackUrl is `/` or `/login`. If `callbackUrl` starts with `/${slug}/` and user has that membership, honor it.
- Create: `src/app/organizaciones/page.tsx` — list ACTIVE memberships; POST `/api/me/organization` `{ organizationId }` then redirect `getDashboardPath`.
- Create: `src/app/api/me/organization/route.ts` — verify membership, then the JWT must update. Auth.js jwt callback only sets org on login unless you use `trigger: 'update'`. Implement `session.update` via client `useSession().update({ activeOrganizationId })` **or** encode org in a cookie `tk.oid` that `proxy.ts` + `requireOrgRole` read.

**Choice (lock this):** persist `activeOrganizationId` on the JWT using NextAuth `jwt` callback `trigger === 'update'` and `session` callback. In the route, you cannot write JWT easily from Route Handler. Simpler cookie:

`ORGANIZATION_COOKIE = 'admintorneo.org'` httpOnly set by POST `/api/me/organization`. `requireOrgRole` uses cookie if present and membership is valid; otherwise session.activeOrganizationId.

Even simpler for v1: picker links to `/{slug}/admin` (or role path). `proxy.ts` on tenant routes, if JWT `activeOrganizationSlug !== slug` but user has membership in that slug, allow and let a server layout call nothing. **JWT can stay stale.** `requireOrgRole` must load membership for **URL slug**, not only JWT.

**Lock: `requireOrgRole` resolves org from the request path slug when the caller passes `organizationId`, and API handlers take org from `session` only after we set session from cookie.**

Practical lock used by this plan:

1. Cookie `admintorneo.org` = organization id, `Path=/`, `SameSite=Lax`, `HttpOnly`.
2. `requireOrgRole` reads cookie, verifies membership, ignores JWT org if cookie present.
3. Login `authorize` sets cookie? Cookies cannot be set from authorize. Set cookie in `/api/auth/post-login` GET after computing the single-org case (`Set-Cookie`).
4. Org picker POST sets cookie and returns path.

Add `src/lib/org-cookie.ts`:

```ts
export const ORG_COOKIE = 'admintorneo.org'
```

- [ ] **Step 1: Test cookie name constant (optional skip)**
- [ ] **Step 2: Implement post-login + picker + cookie**
- [ ] **Step 3: Login copy → “Accede a AdminTorneo”**; keep KelmeLogo only if still used as product mark — **replace header with text “AdminTorneo”** on `/login`.
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: route login to tenant picker or dashboard"
```

---

### Task 13: Move tenant pages under `[organizationSlug]`

**Files (move, do not copy-duplicate):**

From:

- `src/app/(dashboard)/admin/**`
- `src/app/(dashboard)/coach/**`
- `src/app/(dashboard)/referee/**`
- `src/app/(dashboard)/player/**`
- `src/app/live/**`
- `src/app/ayuda/**`

To:

- `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/**`
- `src/app/(tenant)/[organizationSlug]/(dashboard)/coach/**`
- `src/app/(tenant)/[organizationSlug]/(dashboard)/referee/**`
- `src/app/(tenant)/[organizationSlug]/(dashboard)/player/**`
- `src/app/(tenant)/[organizationSlug]/live/[matchId]/**`
- `src/app/(tenant)/[organizationSlug]/ayuda/**`

Create `src/app/(tenant)/[organizationSlug]/layout.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { pausedOrganizationPayload, PAUSED_ORGANIZATION_STATUS } from '@/lib/organization-status'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const org = await db.organization.findUnique({ where: { slug: organizationSlug } })
  if (!org) notFound()
  if (org.status === 'PAUSED') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p>{pausedOrganizationPayload().error}</p>
      </main>
    )
  }
  return (
    <div
      style={
        {
          ['--org-primary' as string]: org.primaryColor,
          ['--org-secondary' as string]: org.secondaryColor,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
```

Paused HTML is fine as 200 with message **unless** we can `return new Response(..., { status: 503 })` from a layout — in App Router, use `src/app/(tenant)/[organizationSlug]/unavailable/page.tsx` and `redirect` or export a route. **Lock:** layout calls `notFound()` for missing; for paused, render the message and set status via `src/app/(tenant)/[organizationSlug]/layout.tsx` wrapping children only when ACTIVE. For live JSON, Task 16.

Update every `href="/admin` → use a small client helper or `orgPath`. Server components: `const { organizationSlug } = await params` then `orgPath(organizationSlug, '/admin/matches')`.

Grep after move: `href="/admin"`, `href="/coach"`, `href="/live"`, `redirect('/admin'`, `getDashboardPath(` (1 arg).

Dashboard layouts (`admin/layout.tsx`): replace `session.user.role !== Role.ADMIN` with `session.user.membershipRole !== MembershipRole.ORG_ADMIN` **and** cookie/org slug match `params.organizationSlug`.

- [ ] **Step 1: Move files**
- [ ] **Step 2: Fix layouts and links**
- [ ] **Step 3: `npx tsc --noEmit` until the remaining errors are only API `User.role` / `requireRole`**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: nest league UI under /{organizationSlug}"
```

---

### Task 14: Replace `requireRole` and `User.role` in APIs

**Files:** every `src/app/api/**/route.ts` that imports `Role` or `requireRole`, plus:

- `src/app/api/users/route.ts`
- `src/app/api/users/[id]/route.ts`
- `src/app/api/players/route.ts`
- `src/app/api/friendly-players/**`
- `src/app/api/matches/**`
- `src/app/api/callups/route.ts`
- `src/lib/user-roles-display.ts` (`role: MembershipRole`)
- `src/lib/friendly-player-categories.ts` (`createUserForFriendlyPlayer` — create User without role, add membership ORG’s PLAYER/FRIENDLY_COACH)
- `src/lib/match-mvp.ts` if it takes `Role`

Pattern for list endpoints:

```ts
const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
const teams = await db.team.findMany({ where: { organizationId } })
```

Pattern for resource by id:

```ts
const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN, MembershipRole.REFEREE])
const match = await db.match.findUnique({ where: { id } })
if (!match) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
assertSameOrganization(match.organizationId, organizationId)
```

`POST /api/users`: create User + `organizationMembership.create({ organizationId, role })`. Schema role enum: `ORG_ADMIN | COACH | REFEREE` (not `ADMIN`).

`createUserForFriendlyPlayer`: membership `PLAYER` or `FRIENDLY_COACH` for `organizationId` taken from the friendly player’s org.

Public GET `/api/matches/[id]/live`: if `match.organization.status === 'PAUSED'`, return 503 `pausedOrganizationPayload()`.

- [ ] **Step 1: Change validations `src/lib/validations/user.ts` staffRoles to `ORG_ADMIN | COACH | REFEREE`**
- [ ] **Step 2: Add `tests/lib/validations-user.test.ts` if missing; update existing `tests/lib/validations.test.ts`**
- [ ] **Step 3: Sweep APIs**
- [ ] **Step 4: `npx tsc --noEmit` Expected: 0 errors**
- [ ] **Step 5: `npx vitest run` Expected: green, including mobile tests**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: scope APIs by organization membership"
```

---

### Task 15: Branding tokens + landing AdminTorneo

**Files:**
- Modify: `src/app/globals.css` — keep `--kelme-red` as fallback; add:

```css
:root {
  --org-primary: var(--kelme-red);
  --org-secondary: #ffffff;
}
```

Map `.btn-kelme` / `bg-kelme-red` usage on **tenant layouts** to `background: var(--org-primary)` where it is the brand CTA. Do not rename every Tailwind class in one giant CSS purge. **Minimum:** live header + admin primary buttons that already use `bg-kelme-red` can stay for Kelme (same hex) because layout sets `--org-primary`. Add utility:

```css
.bg-org-primary { background-color: var(--org-primary); }
.text-org-primary { color: var(--org-primary); }
```

Use those on `LiveScoreboard` title accent and `AdminNav` brand bar.

- Modify: `src/components/live/LiveScoreboard.tsx` — `text-kelme-red` → `text-org-primary` (class from globals).
- Modify: `src/app/page.tsx` — if session, `resolvePostLoginPath` using memberships (server `auth()` + db), else marketing **AdminTorneo** (not fixture Kelme). Reuse `MarketingShell` copy: producto para organizadores de ligas. CTA “Ingresar” → `/login`.
- Modify: `src/components/kelme/LandingPage.tsx` or replace with `src/components/marketing/ProductLanding.tsx` so `/` is not the Kelme league home.

- [ ] **Step 1: Implement landing + CSS variables**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: brand tenants and show AdminTorneo marketing home"
```

---

### Task 16: Seed, grant script, demo data

**Files:**
- Modify: `prisma/seed-demo.ts` — create/find org kelme; users without `role`; memberships; `isPlatformAdmin: true` on `admin@liga.com` only.
- Create: `scripts/grant-platform-admin.ts`

```ts
import { db } from '@/lib/db'

const email = process.argv[2]
if (!email) {
  console.error('Uso: npx tsx scripts/grant-platform-admin.ts email@dominio.cl')
  process.exit(1)
}
await db.user.update({ where: { email }, data: { isPlatformAdmin: true } })
console.log('Platform admin:', email)
```

- [ ] **Step 1: Implement**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: seed Kelme tenant and grant platform admin"
```

---

### Task 17: Org switcher in dashboard header

**Files:**
- Modify: `src/components/admin/AdminNav.tsx` (and coach/referee shells if they have a header)
- Fetch GET `/api/me/memberships` → `{ slug, name, role }[]`
- If length > 1, show select; POST `/api/me/organization` then `window.location = getDashboardPath(slug, role)` (role for the **target** org, from the payload)

Create GET `/api/me/memberships` with `auth()`.

- [ ] **Step 1: Implement**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: switch organization from the dashboard header"
```

---

### Task 18: Verification

- [ ] **Step 1: `npx vitest run`** — all green, including `tests/lib/mobile/*.test.ts` and proxy/mobile public routes.
- [ ] **Step 2: `npx tsc --noEmit`** — 0 errors.
- [ ] **Step 3: Manual checklist (local)**

1. `/` says AdminTorneo.
2. Login `admin@liga.com` → `/plataforma` if platform admin without needing Kelme, **or** `/kelme/admin` if they also have membership (demo admin has both: `resolvePostLoginPath` with 1+ memberships goes to dashboard, not plataforma). **Adjust demo:** platform admin **also** has Kelme ORG_ADMIN → post-login goes to `/kelme/admin`. Add a header link “Plataforma” visible only if `isPlatformAdmin`.
3. `/admin` 308 → `/kelme/admin`.
4. `/kelme/live/{id}` loads; colors from org.
5. Pause org in plataforma → live JSON 503; members cannot use dashboard.
6. Create a second org, invite same email as referee → picker appears.
7. Mobile: `GET /api/mobile/v1/leagues/liga-invierno-kelme-puerto-varas-2026` still 200 if published.

If demo post-login should prefer plataforma for `isPlatformAdmin`, change `resolvePostLoginPath` to **plataforma first** when `isPlatformAdmin` even with memberships. **Lock: platform admin with memberships still uses membership count first** (goes to Kelme). Header link to `/plataforma`. Update Task 5 tests only if you change this — **do not change**; header link is enough.

- [ ] **Step 4: If tests were added during verification, commit**

```bash
git commit -m "test: cover organization isolation cases"
```

---

## Spec coverage

| Spec section | Task |
|--------------|------|
| Organization + membership + isPlatformAdmin | 4, 5, 6 |
| Path `/{slug}` | 3, 8, 13 |
| Login global + picker | 5, 12 |
| `/plataforma` | 9, 10, 11 |
| Branding logo/colors | 10, 13, 15 |
| Invite DTs/admins in org | 14 (users API) |
| Query scoping | 14 |
| Kelme backfill + redirects | 4, 3, 8 |
| Paused 503 | 4, 8, 13, 14 |
| Reserved slugs | 1, 9 |
| Mobile API unchanged | 7, 18 |
| Landing AdminTorneo | 15 |
| No clock/MVP/realtime rewrite | — (constraint) |

## Type names (do not drift)

- `MembershipRole.ORG_ADMIN` (never `ADMIN` after migration)
- `OrganizationStatus.ACTIVE | PAUSED`
- Cookie `admintorneo.org`
- Default tenant slug `kelme`
- Helpers: `parseOrganizationSlug`, `orgPath`, `rewriteLegacyTenantPath`, `resolvePostLoginPath`, `requireOrgRole`, `requirePlatformAdmin`, `assertSameOrganization`
