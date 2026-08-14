# Pool de árbitros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each organization a contactable referee directory and let ORG_ADMINs share a referee user with another org via invitation, without changing `Match.refereeId` or the live/clock stack.

**Architecture:** `RefereeProfile` 1:1 on `User` holds phone/WhatsApp. Access to pit a match remains `OrganizationMembership.role = REFEREE`. Sharing creates `RefereeShareInvite`; accept creates the destination membership. Platform can grant access without invite.

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, Vitest 4, existing `editorial` Storage bucket for photos.

**Spec:** `docs/superpowers/specs/2026-08-14-pool-arbitros-design.md`

**Independent of:** jugador único. Can ship in parallel.

## Global Constraints

- UI: español chileno, tú.
- One membership role per (user, org) — accepting share into an org where the user is already COACH/PLAYER/ORG_ADMIN → 409.
- Do not change `Match.refereeId`, referee match control, clock, or mobile APIs.
- Commits one per task. No `.env` / `docs/handoff/`.
- `GET /api/admin/organizations-directory` is also required by amistosos-entre-orgs. Create it here; the other plan reuses it.

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/phone-cl.ts` | Normalize Chilean phone → digits + wa.me |
| `src/lib/referees.ts` | List/create profile, share/accept |
| `prisma/schema.prisma` | RefereeProfile, RefereeShareInvite |
| `prisma/migrations/20260814150000_referee_pool/` | SQL + backfill empty profiles |
| `src/app/api/admin/organizations-directory/route.ts` | ACTIVE orgs id/slug/name/logo |
| `src/app/api/admin/referees/route.ts` | List/create |
| `src/app/api/admin/referees/[userId]/route.ts` | PATCH profile |
| `src/app/api/admin/referees/[userId]/share/route.ts` | Invite |
| `src/app/api/admin/referee-invites/[id]/accept/route.ts` | Accept |
| `src/app/api/admin/referee-invites/[id]/decline/route.ts` | Decline |
| `src/app/api/plataforma/referees/[userId]/access/route.ts` | Direct grant |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/referees/page.tsx` | Directory UI |
| `src/app/plataforma/arbitros/page.tsx` | Platform directory |

---

### Task 1: Phone / WhatsApp helpers

**Files:**
- Create: `src/lib/phone-cl.ts`
- Test: `tests/lib/phone-cl.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeChilePhone, whatsappMeUrl, parseContactPhone } from '@/lib/phone-cl'

describe('normalizeChilePhone', () => {
  it('assumes Chile 56 when no country code', () => {
    expect(normalizeChilePhone('9 1234 5678')).toBe('56912345678')
  })

  it('keeps explicit 56 prefix', () => {
    expect(normalizeChilePhone('+56 9 1234 5678')).toBe('56912345678')
  })
})

describe('whatsappMeUrl', () => {
  it('builds wa.me from Chilean mobile', () => {
    expect(whatsappMeUrl('912345678')).toBe('https://wa.me/56912345678')
  })
})

describe('parseContactPhone', () => {
  it('rejects too short', () => {
    expect(parseContactPhone('123').ok).toBe(false)
  })

  it('accepts 8-15 digits after strip', () => {
    expect(parseContactPhone('+56 9 1234 5678')).toEqual({ ok: true, digits: '56912345678' })
  })
})
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run tests/lib/phone-cl.test.ts`

Expected: FAIL module not found

- [ ] **Step 3: Implement**

```ts
export type ParsePhoneResult =
  | { ok: true; digits: string }
  | { ok: false; error: 'invalid' }

export function parseContactPhone(raw: string): ParsePhoneResult {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return { ok: false, error: 'invalid' }
  return { ok: true, digits: normalizeChilePhone(raw) }
}

export function normalizeChilePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('56')) return digits
  if (digits.startsWith('0')) digits = digits.slice(1)
  return `56${digits}`
}

export function whatsappMeUrl(raw: string): string {
  return `https://wa.me/${normalizeChilePhone(raw)}`
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/phone-cl.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/phone-cl.ts tests/lib/phone-cl.test.ts
git commit -m "feat: normalize Chilean referee contact phones"
```

---

### Task 2: Share invite state machine

**Files:**
- Create: `src/lib/referees.ts`
- Test: `tests/lib/referees.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'
import { assertCanShareReferee, assertCanAcceptRefereeShare } from '@/lib/referees'

describe('assertCanShareReferee', () => {
  it('rejects sharing to the same org', () => {
    expect(() =>
      assertCanShareReferee({ fromOrganizationId: 'a', toOrganizationId: 'a', isRefereeInFrom: true }),
    ).toThrow(/misma/)
  })

  it('rejects when not referee in origin', () => {
    expect(() =>
      assertCanShareReferee({ fromOrganizationId: 'a', toOrganizationId: 'b', isRefereeInFrom: false }),
    ).toThrow(/origen/)
  })
})

describe('assertCanAcceptRefereeShare', () => {
  it('rejects existing non-REFEREE membership', () => {
    expect(() =>
      assertCanAcceptRefereeShare({ destRole: MembershipRole.COACH, pending: true }),
    ).toThrow(/otro rol/)
  })

  it('allows when dest has no membership', () => {
    expect(() =>
      assertCanAcceptRefereeShare({ destRole: null, pending: true }),
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run tests/lib/referees.test.ts`

Expected: FAIL module not found

- [ ] **Step 3: Implement**

```ts
import { MembershipRole } from '@/lib/membership-role'

export class RefereeShareError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'RefereeShareError'
  }
}

export function assertCanShareReferee(input: {
  fromOrganizationId: string
  toOrganizationId: string
  isRefereeInFrom: boolean
}) {
  if (input.fromOrganizationId === input.toOrganizationId) {
    throw new RefereeShareError('No puedes invitar a la misma organización', 400)
  }
  if (!input.isRefereeInFrom) {
    throw new RefereeShareError('El árbitro no pita en la organización de origen', 403)
  }
}

export function assertCanAcceptRefereeShare(input: {
  destRole: MembershipRole | null
  pending: boolean
}) {
  if (!input.pending) {
    throw new RefereeShareError('La invitación ya no está pendiente', 409)
  }
  if (input.destRole && input.destRole !== MembershipRole.REFEREE) {
    throw new RefereeShareError('Este correo ya tiene otro rol en tu organización', 409)
  }
  if (input.destRole === MembershipRole.REFEREE) {
    throw new RefereeShareError('Este árbitro ya pita en tu organización', 409)
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/referees.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/referees.ts tests/lib/referees.test.ts
git commit -m "feat: referee share invitation guards"
```

---

### Task 3: Prisma schema + backfill

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260814150000_referee_pool/migration.sql`

- [ ] **Step 1: Schema**

Add enum `RefereeShareInviteStatus` (`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`).

Add `RefereeProfile` and `RefereeShareInvite` as in the spec. On Invite **do not** put `@@unique([refereeUserId, toOrganizationId, status])`. Use `@@index([toOrganizationId, status])` and `@@index([refereeUserId])`.

On `User` add `refereeProfile RefereeProfile?` and `refereeShareInvites RefereeShareInvite[]`.

On `Organization` add:

```prisma
refereeSharesFrom RefereeShareInvite[] @relation("RefereeShareFrom")
refereeSharesTo   RefereeShareInvite[] @relation("RefereeShareTo")
```

- [ ] **Step 2: migration.sql**

```sql
CREATE TYPE "RefereeShareInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

CREATE TABLE "RefereeProfile" (
  "userId" TEXT NOT NULL,
  "phone" TEXT,
  "whatsapp" TEXT,
  "notes" TEXT,
  "photoStoragePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefereeProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "RefereeShareInvite" (
  "id" TEXT NOT NULL,
  "refereeUserId" TEXT NOT NULL,
  "fromOrganizationId" TEXT NOT NULL,
  "toOrganizationId" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "status" "RefereeShareInviteStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefereeShareInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefereeShareInvite_pending_key"
  ON "RefereeShareInvite" ("refereeUserId", "toOrganizationId")
  WHERE "status" = 'PENDING';

CREATE INDEX "RefereeShareInvite_toOrganizationId_status_idx"
  ON "RefereeShareInvite" ("toOrganizationId", "status");

INSERT INTO "RefereeProfile" ("userId", "createdAt", "updatedAt")
SELECT DISTINCT m."userId", NOW(), NOW()
FROM "OrganizationMembership" m
WHERE m."role" = 'REFEREE'
ON CONFLICT ("userId") DO NOTHING;

ALTER TABLE "RefereeProfile"
  ADD CONSTRAINT "RefereeProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeShareInvite"
  ADD CONSTRAINT "RefereeShareInvite_refereeUserId_fkey"
  FOREIGN KEY ("refereeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeShareInvite"
  ADD CONSTRAINT "RefereeShareInvite_fromOrganizationId_fkey"
  FOREIGN KEY ("fromOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeShareInvite"
  ADD CONSTRAINT "RefereeShareInvite_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3:** `npx prisma generate`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260814150000_referee_pool
git commit -m "feat: referee profiles and share invites schema"
```

---

### Task 4: Organizations directory API

**Files:**
- Create: `src/app/api/admin/organizations-directory/route.ts`
- Create: `src/lib/organizations-directory.ts`
- Test: `tests/lib/organizations-directory.test.ts`

- [ ] **Step 1: Test serializer**

```ts
import { describe, expect, it } from 'vitest'
import { serializeOrganizationDirectoryItem } from '@/lib/organizations-directory'

describe('serializeOrganizationDirectoryItem', () => {
  it('returns public fields only', () => {
    expect(
      serializeOrganizationDirectoryItem({
        id: '1',
        slug: 'kelme',
        name: 'Torneos Kelme',
        logoStoragePath: null,
        status: 'ACTIVE',
      }),
    ).toEqual({
      id: '1',
      slug: 'kelme',
      name: 'Torneos Kelme',
      logoUrl: null,
    })
  })
})
```

- [ ] **Step 2: Implement serializer using `editorialPublicUrl`**

```ts
import { editorialPublicUrl } from '@/lib/editorial/urls'
import type { OrganizationStatus } from '@prisma/client'

export function serializeOrganizationDirectoryItem(org: {
  id: string
  slug: string
  name: string
  logoStoragePath: string | null
  status: OrganizationStatus
}) {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    logoUrl: editorialPublicUrl(org.logoStoragePath),
  }
}
```

- [ ] **Step 3: GET route**

`requireOrgRole([ORG_ADMIN])`. Query `organization.findMany({ where: { status: 'ACTIVE' }, select: { id, slug, name, logoStoragePath, status } })`. Map through serializer. Exclude nothing (host needs to pick guests). Do not include membership counts.

- [ ] **Step 4: Commit**

```bash
git add src/lib/organizations-directory.ts src/app/api/admin/organizations-directory tests/lib/organizations-directory.test.ts
git commit -m "feat: public organization directory for sharing"
```

---

### Task 5: Admin referees CRUD API

**Files:**
- Create: `src/app/api/admin/referees/route.ts`
- Create: `src/app/api/admin/referees/[userId]/route.ts`
- Create: `src/lib/validations/referee.ts`
- Test: `tests/api/admin-referees.test.ts`

- [ ] **Step 1: Zod schema**

```ts
import { z } from 'zod'
import { parseContactPhone } from '@/lib/phone-cl'

const phoneField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => !value || parseContactPhone(value).ok, 'Teléfono inválido')

export const createRefereeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  phone: phoneField,
  whatsapp: phoneField,
  notes: z.string().max(500).optional().nullable(),
})

export const patchRefereeSchema = z.object({
  phone: phoneField,
  whatsapp: phoneField,
  notes: z.string().max(500).optional().nullable(),
})
```

- [ ] **Step 2: GET list**

Memberships `role: REFEREE` in `organizationId`, include user, refereeProfile, and next scheduled match (`refereeMatches` where organizationId and scheduledAt >= now, take 1). Return phone, whatsapp, `whatsappUrl` from `whatsappMeUrl` if whatsapp or phone present.

- [ ] **Step 3: POST create**

If email exists: create membership REFEREE (409 if another role), upsert RefereeProfile. If new: create user (password required), membership, profile. Copy: `'Este correo ya tiene otro rol en tu organización'`.

- [ ] **Step 4: PATCH**

Only if membership REFEREE in active org. Update RefereeProfile. Do not change email.

- [ ] **Step 4b: Photo upload**

Create `src/app/api/admin/referees/[userId]/photo/route.ts` copying the org logo route (`src/app/api/plataforma/organizations/[id]/logo/route.ts`): Storage path `referees/{userId}/photo.{ext}`, set `photoStoragePath`, return `{ ok: true, photoStoragePath }`. GET public URL via `editorialPublicUrl` in the directory JSON.

- [ ] **Step 5: Tests** — mock db + requireOrgRole. GET does not return a referee whose membership is in another org. POST 409 when dest role is COACH.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/referee.ts src/app/api/admin/referees tests/api/admin-referees.test.ts
git commit -m "feat: admin referee directory API"
```

---

### Task 6: Share / accept / decline APIs

**Files:**
- Create: `src/app/api/admin/referees/[userId]/share/route.ts`
- Create: `src/app/api/admin/referee-invites/[id]/accept/route.ts`
- Create: `src/app/api/admin/referee-invites/[id]/decline/route.ts`
- Create: `src/app/api/admin/referee-invites/[id]/cancel/route.ts`
- Test: `tests/api/referee-share.test.ts`

- [ ] **Step 1: Share POST body `{ toOrganizationSlug }`**

Resolve dest org ACTIVE. `assertCanShareReferee`. If dest already REFEREE → 409. If PENDING exists → 409 from unique index (map P2002). Create invite `invitedByUserId: session.user.id`.

- [ ] **Step 2: Accept**

Load invite; `toOrganizationId` must equal `organizationId` from requireOrgRole. `assertCanAcceptRefereeShare`. Transaction: membership create REFEREE, invite status ACCEPTED, upsert RefereeProfile.

- [ ] **Step 3: Decline / cancel**

Decline: dest org, PENDING → DECLINED. Cancel: from org, PENDING → CANCELLED.

- [ ] **Step 4: Tests** for accept creates membership; decline does not; share to paused org 400.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/referees src/app/api/admin/referee-invites tests/api/referee-share.test.ts
git commit -m "feat: share referees across organizations"
```

---

### Task 7: Platform grant + list

**Files:**
- Create: `src/app/api/plataforma/referees/route.ts` (GET)
- Create: `src/app/api/plataforma/referees/[userId]/access/route.ts` (POST `{ organizationId }`)
- Test: `tests/api/plataforma-referees.test.ts`

- [ ] **Step 1: GET** `requirePlatformAdmin`. Users with RefereeProfile or any REFEREE membership. Include org slugs. No match details.

- [ ] **Step 2: POST access**

If dest membership exists non-REFEREE → 409. If REFEREE → 409. Else create membership + upsert profile. No invite row required.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/plataforma/referees tests/api/plataforma-referees.test.ts
git commit -m "feat: platform referee directory and access grant"
```

---

### Task 8: Admin UI + nav

**Files:**
- Create: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/referees/page.tsx`
- Create: `src/components/admin/RefereesDirectory.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/layout.tsx` — add nav `{ href: base('/admin/referees'), label: 'Árbitros' }` after Usuarios.
- Create: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/referees/invites/page.tsx`

- [ ] **Step 1: Server page** loads referees via db (same query as GET) and pending invites to this org.

- [ ] **Step 2: Client directory**

Agenda cards: name, email, phone, `<a href={whatsappUrl}>WhatsApp</a>`, “Próximo partido”. Form to create. Button “Invitar a otra liga” → fetch directory, POST share with slug.

- [ ] **Step 3: Invites page**

Received: Aceptar / Rechazar. Sent: Cancelar. Banner copy: “{fromOrg} te comparte a {name}”.

- [ ] **Step 4: Commit**

```bash
git add src/app/(tenant)/[organizationSlug]/(dashboard)/admin/referees src/components/admin/RefereesDirectory.tsx src/app/(tenant)/[organizationSlug]/(dashboard)/admin/layout.tsx
git commit -m "feat: referee directory admin UI"
```

---

### Task 9: Platform UI

**Files:**
- Create: `src/app/plataforma/arbitros/page.tsx`
- Modify: `src/app/plataforma/layout.tsx` — add nav links Empresas | Árbitros (and later Apps). Simple `<a href="/plataforma">` + `<a href="/plataforma/arbitros">`.

- [ ] **Step 1: Table** of referees, orgs, form “dar acceso” with organizationId select from `listOrganizations()`.

- [ ] **Step 2: Commit**

```bash
git add src/app/plataforma
git commit -m "feat: platform referee access UI"
```

---

### Task 10: Verification

- [ ] **Step 1: Run**

Run: `npx vitest run tests/lib/phone-cl.test.ts tests/lib/referees.test.ts tests/lib/organizations-directory.test.ts tests/api/admin-referees.test.ts tests/api/referee-share.test.ts tests/api/plataforma-referees.test.ts tests/lib/live-match-snapshot.test.ts`

Expected: PASS

- [ ] **Step 2: Confirm match create still lists referees via membership query** (no code change required). Manually read `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/new/page.tsx` still uses `role: MembershipRole.REFEREE`.

- [ ] **Step 3: Commit fixes only if needed**
