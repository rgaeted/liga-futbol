# Planes de cobro — entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada organización tiene un plan `FREE | CLUB | LEAGUE` y las APIs/nav de admin respetan qué puede crear, sin Stripe y sin romper las orgs actuales.

**Architecture:** Catálogo puro de capacidades en `src/lib/billing/`. `Organization.plan` es la fuente de verdad. Las mutaciones de admin llaman `assertOrgCapability` / `assertCanCreateTeam` después de auth. Plataforma asigna el plan. Migración backfillea orgs existentes a `LEAGUE`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Zod, Vitest, Tailwind, es-CL.

**Spec:** `docs/superpowers/specs/2026-09-23-planes-cobro-design.md`

## Global Constraints

- UI y copy: español chileno (`es-CL`), tú, no voseo.
- Unidad de cobro: `Organization.plan`. Nunca el User.
- Planes: `FREE`, `CLUB`, `LEAGUE`. Tope Liga: exactamente 50 equipos (`LEAGUE_TEAM_LIMIT = 50`).
- Club no tiene tope de equipos en esta entrega.
- Bajar de plan no borra datos; solo bloquea crear lo no permitido.
- Orgs existentes → `LEAGUE` en la migración (prod no pierde features).
- Sin Stripe, webhooks, fechas de suscripción ni self-service checkout.
- Sin páginas `/{slug}/equipos/{team}` y sin generalizar el skin Los Lunes (entregas 2 y 3).
- GET de live, jugador, árbitro y asistencia no se gatean.
- Commits: uno por tarea. No commitear `.env` ni `.vercel`.
- Tests: TDD. Correr el test indicado **antes** de implementar (debe fallar) y **después** (debe pasar).

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/billing/plans.ts` | Enum runtime, `LEAGUE_TEAM_LIMIT`, labels |
| `src/lib/billing/capabilities.ts` | `planHasCapability`, `assertOrgCapability`, `assertCanCreateTeam` |
| `prisma/schema.prisma` | `enum BillingPlan` + `Organization.plan` |
| `prisma/migrations/20260923120000_organization_billing_plan/` | SQL + backfill `LEAGUE` |
| `src/lib/organizations.ts` | Persistir `plan` al crear/actualizar |
| `src/lib/validations/organization.ts` | Zod `plan` en create/update |
| `src/app/api/plataforma/organizations/[id]/route.ts` | PATCH plan |
| `src/app/api/teams/route.ts` | Gate crear equipo |
| `src/app/api/seasons/route.ts` | Gate crear temporada |
| `src/app/api/matches/route.ts` | Gate amistoso vs liga |
| `src/app/api/friendly-categories/route.ts` | Gate categorías amistosas (si el POST existe; si no, el archivo de create de categorías) |
| APIs de contenido/awards/badges/mobile | Gate `MANAGE_LEAGUE_CONTENT` |
| `src/lib/tenant-nav.ts` | Ocultar ítems según plan |
| UI plataforma orgs | Selector de plan |

## Review Focus

- Org Liga con 50 equipos: el POST 51 debe fallar y no escribir fila.
- Org Club con temporadas viejas: puede leerlas; no puede crear otra ni un partido `LEAGUE`.
- Org Free: un `ORG_ADMIN` autenticado recibe 403 al crear, no 401.
- Jugador de org Free: `GET` live y panel jugador siguen 200.
- Org backfilleada (`kelme` / `loslunes`): tras migrate, `plan === LEAGUE` y el admin actual no ve muros.

---

### Task 1: Catálogo de planes y capacidades

**Files:**
- Create: `src/lib/billing/plans.ts`
- Create: `src/lib/billing/capabilities.ts`
- Test: `tests/lib/billing-capabilities.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `BillingPlan`, `Capability`, `LEAGUE_TEAM_LIMIT`, `planHasCapability`, `assertOrgCapability`, `assertCanCreateTeam`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/billing-capabilities.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  LEAGUE_TEAM_LIMIT,
  assertCanCreateTeam,
  assertOrgCapability,
  planHasCapability,
} from '@/lib/billing/capabilities'

describe('planHasCapability', () => {
  it('lets every plan view and play', () => {
    for (const plan of ['FREE', 'CLUB', 'LEAGUE'] as const) {
      expect(planHasCapability(plan, 'VIEW_PUBLIC')).toBe(true)
      expect(planHasCapability(plan, 'PLAY')).toBe(true)
    }
  })

  it('lets Club manage teams and friendlies but not seasons', () => {
    expect(planHasCapability('CLUB', 'MANAGE_TEAMS')).toBe(true)
    expect(planHasCapability('CLUB', 'MANAGE_FRIENDLIES')).toBe(true)
    expect(planHasCapability('CLUB', 'MANAGE_SEASONS')).toBe(false)
    expect(planHasCapability('CLUB', 'MANAGE_LEAGUE_MATCHES')).toBe(false)
    expect(planHasCapability('CLUB', 'PUBLISH_TEAM_PAGES')).toBe(false)
  })

  it('lets League manage seasons, league matches and team pages', () => {
    expect(planHasCapability('LEAGUE', 'MANAGE_SEASONS')).toBe(true)
    expect(planHasCapability('LEAGUE', 'MANAGE_LEAGUE_MATCHES')).toBe(true)
    expect(planHasCapability('LEAGUE', 'PUBLISH_TEAM_PAGES')).toBe(true)
    expect(planHasCapability('LEAGUE', 'MANAGE_LEAGUE_CONTENT')).toBe(true)
  })

  it('blocks Free from organizing', () => {
    expect(planHasCapability('FREE', 'MANAGE_TEAMS')).toBe(false)
    expect(planHasCapability('FREE', 'MANAGE_FRIENDLIES')).toBe(false)
    expect(planHasCapability('FREE', 'MANAGE_USERS')).toBe(false)
  })
})

describe('assertOrgCapability', () => {
  it('returns ok for an allowed capability', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_FRIENDLIES')).toEqual({ ok: true })
  })

  it('returns the upgrade message when blocked', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_SEASONS')).toEqual({
      ok: false,
      error: 'Tu plan no incluye esto. Pasa a Club o Liga para desbloquearlo.',
    })
  })
})

describe('assertCanCreateTeam', () => {
  it('blocks Free', () => {
    expect(assertCanCreateTeam({ plan: 'FREE', currentTeamCount: 0 }).ok).toBe(false)
  })

  it('allows Club without a team cap', () => {
    expect(assertCanCreateTeam({ plan: 'CLUB', currentTeamCount: 80 })).toEqual({ ok: true })
  })

  it('allows League below the cap and blocks at 50', () => {
    expect(LEAGUE_TEAM_LIMIT).toBe(50)
    expect(assertCanCreateTeam({ plan: 'LEAGUE', currentTeamCount: 49 })).toEqual({ ok: true })
    expect(assertCanCreateTeam({ plan: 'LEAGUE', currentTeamCount: 50 })).toEqual({
      ok: false,
      error: 'El plan Liga permite hasta 50 equipos.',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/billing-capabilities.test.ts`

Expected: FAIL — cannot find module `@/lib/billing/capabilities`

- [ ] **Step 3: Write minimal implementation**

`src/lib/billing/plans.ts`:

```ts
export const BILLING_PLANS = ['FREE', 'CLUB', 'LEAGUE'] as const
export type BillingPlan = (typeof BILLING_PLANS)[number]
export const LEAGUE_TEAM_LIMIT = 50

export const BILLING_PLAN_LABELS: Record<BillingPlan, string> = {
  FREE: 'Gratis',
  CLUB: 'Club',
  LEAGUE: 'Liga',
}
```

`src/lib/billing/capabilities.ts`:

```ts
import { BILLING_PLAN_LABELS, LEAGUE_TEAM_LIMIT, type BillingPlan } from '@/lib/billing/plans'

export type Capability =
  | 'VIEW_PUBLIC'
  | 'PLAY'
  | 'MANAGE_USERS'
  | 'MANAGE_TEAMS'
  | 'MANAGE_FRIENDLIES'
  | 'MANAGE_SEASONS'
  | 'MANAGE_LEAGUE_MATCHES'
  | 'MANAGE_LEAGUE_CONTENT'
  | 'PUBLISH_ORG_LANDING'
  | 'PUBLISH_TEAM_PAGES'

export { LEAGUE_TEAM_LIMIT, type BillingPlan, BILLING_PLAN_LABELS }

const PLAN_CAPABILITIES: Record<BillingPlan, readonly Capability[]> = {
  FREE: ['VIEW_PUBLIC', 'PLAY'],
  CLUB: [
    'VIEW_PUBLIC',
    'PLAY',
    'MANAGE_USERS',
    'MANAGE_TEAMS',
    'MANAGE_FRIENDLIES',
    'PUBLISH_ORG_LANDING',
  ],
  LEAGUE: [
    'VIEW_PUBLIC',
    'PLAY',
    'MANAGE_USERS',
    'MANAGE_TEAMS',
    'MANAGE_FRIENDLIES',
    'MANAGE_SEASONS',
    'MANAGE_LEAGUE_MATCHES',
    'MANAGE_LEAGUE_CONTENT',
    'PUBLISH_ORG_LANDING',
    'PUBLISH_TEAM_PAGES',
  ],
}

export function planHasCapability(plan: BillingPlan, capability: Capability): boolean {
  return PLAN_CAPABILITIES[plan].includes(capability)
}

export function assertOrgCapability(
  plan: BillingPlan,
  capability: Capability,
): { ok: true } | { ok: false; error: string } {
  if (planHasCapability(plan, capability)) return { ok: true }
  return {
    ok: false,
    error: 'Tu plan no incluye esto. Pasa a Club o Liga para desbloquearlo.',
  }
}

export function assertCanCreateTeam(input: {
  plan: BillingPlan
  currentTeamCount: number
}): { ok: true } | { ok: false; error: string } {
  const allowed = assertOrgCapability(input.plan, 'MANAGE_TEAMS')
  if (!allowed.ok) return allowed
  if (input.plan === 'LEAGUE' && input.currentTeamCount >= LEAGUE_TEAM_LIMIT) {
    return { ok: false, error: 'El plan Liga permite hasta 50 equipos.' }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/billing-capabilities.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/plans.ts src/lib/billing/capabilities.ts tests/lib/billing-capabilities.test.ts
git commit -m "Agrega el catálogo de planes Gratis, Club y Liga."
```

---

### Task 2: Schema y backfill a Liga

**Files:**
- Modify: `prisma/schema.prisma` (`Organization`)
- Create: `prisma/migrations/20260923120000_organization_billing_plan/migration.sql`

**Interfaces:**
- Consumes: `BillingPlan` de Task 1
- Produces: columna `Organization.plan` default `FREE`; filas existentes = `LEAGUE`

- [ ] **Step 1: Write the failing check**

Add to `tests/lib/billing-capabilities.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

it('backfills existing organizations to LEAGUE in SQL', () => {
  const sql = readFileSync(
    resolve('prisma/migrations/20260923120000_organization_billing_plan/migration.sql'),
    'utf8',
  )
  expect(sql).toMatch(/CREATE TYPE "BillingPlan"/)
  expect(sql).toMatch(/ADD COLUMN "plan" "BillingPlan" NOT NULL DEFAULT 'FREE'/)
  expect(sql).toMatch(/UPDATE "Organization" SET "plan" = 'LEAGUE'/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/billing-capabilities.test.ts`

Expected: FAIL — ENOENT migration file

- [ ] **Step 3: Write schema + migration**

In `prisma/schema.prisma`, next to `OrganizationStatus`:

```prisma
enum BillingPlan {
  FREE
  CLUB
  LEAGUE
}
```

On `model Organization`, after `status`:

```prisma
  plan BillingPlan @default(FREE)
```

`prisma/migrations/20260923120000_organization_billing_plan/migration.sql`:

```sql
CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'CLUB', 'LEAGUE');

ALTER TABLE "Organization" ADD COLUMN "plan" "BillingPlan" NOT NULL DEFAULT 'FREE';

UPDATE "Organization" SET "plan" = 'LEAGUE';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/billing-capabilities.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260923120000_organization_billing_plan tests/lib/billing-capabilities.test.ts
git commit -m "Guarda el plan de cobro en la organización y deja las actuales en Liga."
```

---

### Task 3: Plataforma asigna el plan

**Files:**
- Modify: `src/lib/validations/organization.ts`
- Modify: `src/lib/organizations.ts` (`createOrganization` + `setOrganizationPlan`)
- Modify: `src/app/api/plataforma/organizations/[id]/route.ts`
- Modify: `src/app/api/plataforma/organizations/route.ts` (si el POST crea org)
- Test: `tests/lib/organizations-plan.test.ts`

**Interfaces:**
- Consumes: `BillingPlan` de Task 1, columna de Task 2
- Produces: `setOrganizationPlan(id, plan)`, create opcional con `plan`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/organizations-plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { updateOrganizationPlanSchema } from '@/lib/validations/organization'

describe('updateOrganizationPlanSchema', () => {
  it('accepts the three plans', () => {
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'CLUB' }).success).toBe(true)
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'FREE' }).success).toBe(true)
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'LEAGUE' }).success).toBe(true)
  })

  it('rejects unknown plans', () => {
    expect(updateOrganizationPlanSchema.safeParse({ plan: 'PRO' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/organizations-plan.test.ts`

Expected: FAIL — `updateOrganizationPlanSchema` not exported

- [ ] **Step 3: Write minimal implementation**

In `src/lib/validations/organization.ts`:

```ts
import { BILLING_PLANS } from '@/lib/billing/plans'

export const updateOrganizationPlanSchema = z.object({
  plan: z.enum(BILLING_PLANS),
})
```

Add optional `plan: z.enum(BILLING_PLANS).optional()` to `createOrganizationSchema`.

In `src/lib/organizations.ts`, on `organization.create` data include `plan: input.plan ?? 'FREE'`.

Add:

```ts
export async function setOrganizationPlan(id: string, plan: BillingPlan) {
  return db.organization.update({ where: { id }, data: { plan } })
}
```

In `PATCH` `src/app/api/plataforma/organizations/[id]/route.ts`, accept either `updateOrganizationStatusSchema` or `updateOrganizationPlanSchema` (discriminar por presencia de `plan` vs `status`). Si viene `plan`, llamar `setOrganizationPlan`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/organizations-plan.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/organization.ts src/lib/organizations.ts src/app/api/plataforma/organizations tests/lib/organizations-plan.test.ts
git commit -m "Permite asignar Gratis, Club o Liga desde plataforma."
```

---

### Task 4: Gate de crear equipo

**Files:**
- Modify: `src/app/api/teams/route.ts`
- Test: `tests/api/teams-plan-gate.test.ts` (o extender el test de teams si ya existe; si no, crear este)

**Interfaces:**
- Consumes: `assertCanCreateTeam`
- Produces: POST 403 con el mensaje de la spec cuando el plan o el tope no dan

- [ ] **Step 1: Write the failing test**

Create `tests/lib/billing-team-gate.test.ts` si no quieres mockear Next; la ruta debe llamar una función extraíble:

Add to `src/lib/billing/capabilities.ts` nothing new. Instead extract in the route after counting teams.

Prefer testing the route helper:

```ts
// tests/lib/billing-team-gate.test.ts — ya cubierto en Task 1.
// Este task prueba la integración de conteo:
```

Add to `tests/lib/billing-capabilities.test.ts`:

```ts
it('blocks the 51st League team and allows the 50th', () => {
  expect(assertCanCreateTeam({ plan: 'LEAGUE', currentTeamCount: 50 }).ok).toBe(false)
  expect(assertCanCreateTeam({ plan: 'LEAGUE', currentTeamCount: 49 }).ok).toBe(true)
})
```

(Already in Task 1.) For the route, create `tests/api/teams-plan-gate.test.ts` following `tests/api/match-challenge-create.test.ts` style: mock `requireOrgRole` + `db.team.count` + `db.organization.findUnique`.

If mocking la ruta es frágil, extrae:

```ts
// src/lib/billing/enforce.ts
export async function enforceCreateTeam(organizationId: string) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plan: true },
  })
  const currentTeamCount = await db.team.count({ where: { organizationId } })
  return assertCanCreateTeam({ plan: org.plan, currentTeamCount })
}
```

Test `enforceCreateTeam` with mocked `db`.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findUniqueOrThrow: vi.fn() },
    team: { count: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { enforceCreateTeam } from '@/lib/billing/enforce'

describe('enforceCreateTeam', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 50-team error for League at cap', async () => {
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({ plan: 'LEAGUE' })
    vi.mocked(db.team.count).mockResolvedValue(50)
    await expect(enforceCreateTeam('org-1')).resolves.toEqual({
      ok: false,
      error: 'El plan Liga permite hasta 50 equipos.',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/billing-team-gate.test.ts`

Expected: FAIL — `@/lib/billing/enforce` missing

- [ ] **Step 3: Write enforce + wire POST teams**

`src/lib/billing/enforce.ts` as above.

In `POST` of `src/app/api/teams/route.ts`, after auth and parse, before `db.team.create`:

```ts
const gate = await enforceCreateTeam(organizationId)
if (!gate.ok) {
  return NextResponse.json({ error: gate.error }, { status: 403 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/billing-team-gate.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/enforce.ts src/app/api/teams/route.ts tests/lib/billing-team-gate.test.ts
git commit -m "Impide crear equipos fuera del plan o sobre el tope de Liga."
```

---

### Task 5: Gates de temporadas y partidos

**Files:**
- Modify: `src/app/api/seasons/route.ts`
- Modify: `src/app/api/matches/route.ts`
- Create: `src/lib/billing/enforce.ts` helpers extra (si Task 4 ya creó el archivo, extenderlo)
- Test: `tests/lib/billing-match-gate.test.ts`

**Interfaces:**
- Consumes: `assertOrgCapability`
- Produces: `enforceCapability(organizationId, capability)`, `enforceCreateMatch(organizationId, matchType)`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/billing-match-gate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { assertOrgCapability } from '@/lib/billing/capabilities'

describe('match type vs plan', () => {
  it('blocks league matches on Club', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_LEAGUE_MATCHES').ok).toBe(false)
    expect(assertOrgCapability('CLUB', 'MANAGE_FRIENDLIES').ok).toBe(true)
  })

  it('allows both match types on League', () => {
    expect(assertOrgCapability('LEAGUE', 'MANAGE_LEAGUE_MATCHES').ok).toBe(true)
    expect(assertOrgCapability('LEAGUE', 'MANAGE_FRIENDLIES').ok).toBe(true)
  })

  it('blocks seasons on Club and Free', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_SEASONS').ok).toBe(false)
    expect(assertOrgCapability('FREE', 'MANAGE_SEASONS').ok).toBe(false)
    expect(assertOrgCapability('LEAGUE', 'MANAGE_SEASONS').ok).toBe(true)
  })
})
```

These assertions already pass after Task 1. Add `enforceCreateMatch` tests with mocked db:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { organization: { findUniqueOrThrow: vi.fn() } },
}))

import { db } from '@/lib/db'
import { enforceCreateMatch } from '@/lib/billing/enforce'

describe('enforceCreateMatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a league match on a Club org', async () => {
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({ plan: 'CLUB' })
    await expect(enforceCreateMatch('org-1', 'LEAGUE')).resolves.toMatchObject({ ok: false })
  })

  it('allows a friendly on a Club org', async () => {
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({ plan: 'CLUB' })
    await expect(enforceCreateMatch('org-1', 'FRIENDLY')).resolves.toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/billing-match-gate.test.ts`

Expected: FAIL — `enforceCreateMatch` not exported

- [ ] **Step 3: Write helpers and wire routes**

In `src/lib/billing/enforce.ts`:

```ts
export async function enforceCapability(
  organizationId: string,
  capability: Capability,
) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plan: true },
  })
  return assertOrgCapability(org.plan, capability)
}

export async function enforceCreateMatch(
  organizationId: string,
  matchType: 'LEAGUE' | 'FRIENDLY',
) {
  return enforceCapability(
    organizationId,
    matchType === 'LEAGUE' ? 'MANAGE_LEAGUE_MATCHES' : 'MANAGE_FRIENDLIES',
  )
}
```

`POST` seasons: `const gate = await enforceCapability(organizationId, 'MANAGE_SEASONS'); if (!gate.ok) return 403`.

`POST` matches: after parse, `const gate = await enforceCreateMatch(organizationId, data.matchType); if (!gate.ok) return 403`. El challenge friendly usa el mismo `FRIENDLY`.

Locate `POST` de friendly-categories (ruta real bajo `src/app/api/friendly-categories/`) y gate `MANAGE_FRIENDLIES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/billing-match-gate.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/enforce.ts src/app/api/seasons/route.ts src/app/api/matches/route.ts src/app/api/friendly-categories tests/lib/billing-match-gate.test.ts
git commit -m "Corta temporadas y partidos de liga en planes que no son Liga."
```

---

### Task 6: Gate de contenido de liga

**Files:**
- Modify: POST/PUT de articles, galleries, sponsors, org awards, org badges, season mobile config (rutas existentes bajo `src/app/api/admin/` y `src/app/api/org-*`)
- Test: `tests/lib/billing-content-gate.test.ts`

**Interfaces:**
- Consumes: `enforceCapability(..., 'MANAGE_LEAGUE_CONTENT')`
- Produces: 403 en mutaciones de CMS/awards/badges/mobile si el plan no es Liga

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { assertOrgCapability } from '@/lib/billing/capabilities'

describe('league content', () => {
  it('is League-only', () => {
    expect(assertOrgCapability('CLUB', 'MANAGE_LEAGUE_CONTENT').ok).toBe(false)
    expect(assertOrgCapability('LEAGUE', 'MANAGE_LEAGUE_CONTENT').ok).toBe(true)
  })
})
```

Then grep `src/app/api` for article/gallery/sponsor/award/badge/mobile POSTs and add `enforceCapability` to each mutator. Lista mínima a tocar (confirmar con grep al implementar):

- `src/app/api/admin/seasons/[id]/articles/route.ts` (POST)
- galleries POST
- sponsors POST
- `src/app/api/org-awards/route.ts`
- `src/app/api/org-badges/route.ts`
- `src/app/api/admin/seasons/[id]/mobile` o equivalente

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/billing-content-gate.test.ts`

Expected: el test de matriz pasa (Task 1). El valor de este task es el wiring: añade un test de `enforceCapability` mockeado igual que Task 5 si quieres probar el helper (ya existe). Si `enforceCapability` ya está, este step falla solo si aún no importas el helper en una ruta — no hace falta forzar un fail falso. Verifica con grep que **ninguna** de esas rutas llama `enforceCapability` todavía.

- [ ] **Step 3: Wire each mutator**

Same 4 lines after auth:

```ts
const gate = await enforceCapability(organizationId, 'MANAGE_LEAGUE_CONTENT')
if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 })
```

- [ ] **Step 4: Run related tests**

Run: `npx vitest run tests/lib/billing-content-gate.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api tests/lib/billing-content-gate.test.ts
git commit -m "Reserva CMS, premios e insignias de liga al plan Liga."
```

---

### Task 7: Nav admin según plan

**Files:**
- Modify: `src/lib/tenant-nav.ts`
- Modify: el caller de `buildTenantNavGroups` / `loadTenantNavContext` para pasar `plan`
- Test: `tests/lib/tenant-nav-plan.test.ts`

**Interfaces:**
- Consumes: `planHasCapability`
- Produces: `buildTenantNavGroups(slug, context)` donde `context.plan: BillingPlan`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/tenant-nav-plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'
import { buildTenantNavGroups, type TenantNavContext } from '@/lib/tenant-nav'

const adminCtx = (plan: TenantNavContext['plan']): TenantNavContext => ({
  roles: [MembershipRole.ORG_ADMIN],
  hasPlayerProfile: false,
  hasFriendlyCoachParticipations: false,
  userAvatarUrl: null,
  plan,
})

function hrefs(plan: TenantNavContext['plan']) {
  return buildTenantNavGroups('acme', adminCtx(plan))
    .flatMap((g) => g.items)
    .map((i) => i.href)
}

describe('admin nav by plan', () => {
  it('hides seasons and content on Club', () => {
    const links = hrefs('CLUB')
    expect(links.some((h) => h.includes('/admin/seasons'))).toBe(false)
    expect(links.some((h) => h.includes('/admin/content'))).toBe(false)
    expect(links.some((h) => h.includes('/admin/teams'))).toBe(true)
    expect(links.some((h) => h.includes('/admin/matches'))).toBe(true)
  })

  it('shows seasons and content on League', () => {
    const links = hrefs('LEAGUE')
    expect(links.some((h) => h.includes('/admin/seasons'))).toBe(true)
    expect(links.some((h) => h.includes('/admin/content'))).toBe(true)
  })

  it('keeps player nav on Free', () => {
    const groups = buildTenantNavGroups('acme', {
      roles: [MembershipRole.PLAYER],
      hasPlayerProfile: true,
      hasFriendlyCoachParticipations: false,
      userAvatarUrl: null,
      plan: 'FREE',
    })
    expect(groups.some((g) => g.label === 'Jugador')).toBe(true)
    expect(groups.some((g) => g.label === 'Administración')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/tenant-nav-plan.test.ts`

Expected: FAIL — `plan` no existe en `TenantNavContext`

- [ ] **Step 3: Minimal nav filter**

Add `plan: BillingPlan` to `TenantNavContext`. Load it in `loadTenantNavContext` with `db.organization.findUnique({ select: { plan: true } })`.

In `adminNavGroups`, filter items:

- `/admin/seasons`, `/admin/content`, `/admin/challenges` (desafíos entre orgs de liga: spec los deja en Club también — **no ocultar desafíos en Club**; sí ocultar temporadas y contenido).
- `/admin/awards`, `/admin/badges`: solo Liga (`MANAGE_LEAGUE_CONTENT`).

`adminNavGroups(slug, plan)` usa `planHasCapability`.

Find the server component that calls `loadTenantNavContext` and pasa el `plan` nuevo (TypeScript fallará hasta actualizarlo).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/tenant-nav-plan.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant-nav.ts tests/lib/tenant-nav-plan.test.ts
git commit -m "Oculta temporadas y contenido de liga en el nav de Club."
```

---

### Task 8: Selector de plan en /plataforma

**Files:**
- Modify: página/tabla de orgs en `src/app/plataforma/page.tsx` (o el componente de lista que exista)
- Create: `src/components/plataforma/OrganizationPlanSelect.tsx` si la página ya es server+client split
- Test: no hace falta e2e; el schema de Task 3 cubre el contrato. Si hay test de UI de plataforma, actualízalo.

**Interfaces:**
- Consumes: `PATCH /api/plataforma/organizations/:id` con `{ plan }`
- Produces: admin de plataforma ve Gratis/Club/Liga y lo cambia

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/organizations-plan.test.ts`:

```ts
it('exposes Chilean labels', () => {
  const { BILLING_PLAN_LABELS } = require('@/lib/billing/plans')
  expect(BILLING_PLAN_LABELS.FREE).toBe('Gratis')
  expect(BILLING_PLAN_LABELS.CLUB).toBe('Club')
  expect(BILLING_PLAN_LABELS.LEAGUE).toBe('Liga')
})
```

(Labels already in Task 1.) For UI, a shallow test of the select options:

Create `tests/components/organization-plan-select.test.tsx` only if el repo ya testea componentes plataforma con el mismo harness (ver `tests/components/`). Si no hay harness de componentes admin, **no inventes RTL nuevo**: verifica a mano en Step 4 y deja el contrato en Zod.

- [ ] **Step 2: Run existing plan tests**

Run: `npx vitest run tests/lib/organizations-plan.test.ts`

Expected: PASS (labels). UI still missing.

- [ ] **Step 3: Add the select**

En la lista de orgs de plataforma, columna Plan: `<select>` con Gratis/Club/Liga. `onChange` → `PATCH /api/plataforma/organizations/${id}` body `{ plan }`. Copy: `Plan de la empresa`.

Mostrar `BILLING_PLAN_LABELS[org.plan]`.

Incluir `plan` en `listOrganizations()` select.

- [ ] **Step 4: Typecheck the plataforma page**

Run: `npx vitest run tests/lib/organizations-plan.test.ts`

Expected: PASS. Abrir `/plataforma` local: el select dispara PATCH y el valor persiste al recargar.

- [ ] **Step 5: Commit**

```bash
git add src/app/plataforma src/components/plataforma src/lib/organizations.ts
git commit -m "Muestra y cambia el plan de cada empresa en plataforma."
```

---

## Siguientes planes (no este archivo)

Después de mergear esta entrega, escribir planes aparte (mismo proceso writing-plans):

1. `2026-09-23-landing-club.md` — vitrina tipo Los Lunes para cualquier org Club/Liga.
2. `2026-09-23-paginas-equipo.md` — `/{slug}/equipos/{team}` y tope 50 ya enforced.
3. `2026-09-23-checkout-cobro.md` — pasarela y self-service.

No implementar esas entregas en este plan.
