# Premios de jugador (badges) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada org defina premios custom (ej. *Premio al 7 pulmones*), los otorgue manualmente a jugadores, y se vean como badges en el panel del jugador.

**Architecture:** Catálogo `OrgAward` por organización (patrón `FriendlyCategory`) + otorgamientos `PlayerAward` con temporada opcional. API REST org-scoped con `requireOrgRole(ORG_ADMIN)` para mutaciones; lectura propia vía `/api/me/awards`. UI admin en `/{slug}/admin/awards` y chips en `/{slug}/player`.

**Tech Stack:** Next.js 16 App Router · Prisma 7 · PostgreSQL (Supabase) · Zod · Vitest · Auth.js

**Spec:** `docs/superpowers/specs/2026-09-03-player-awards-design.md`

## Global Constraints

- UI y textos: **español chileno** (tú, no voseo). Ej. "Otorga", "Gestiona", "Mis premios".
- Commits: **uno por task**. No commitear `.env*`, `docs/handoff/`, `.superpowers/`, `supabase/.temp/`.
- Tras cambios Prisma: `npx prisma generate` antes de tests/build.
- Migraciones prod: manual con `DIRECT_URL` Session Pooler (ver `docs/DEPLOY.md`); no migrate en build Vercel.
- No mezclar con MVP de partido (`MatchTeamMvp`) ni evaluaciones DT.
- Otorgamiento v1: **solo ORG_ADMIN** (no DT).
- Unique DB: `(playerId, orgAwardId, seasonId)` — `seasonId` NULL = premio general de la org.
- `accentColor`: regex `^#[0-9A-Fa-f]{6}$` si se envía.
- `emoji`: string 1–8 chars (soporta emoji compuesto).

---

## File Map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Modelos `OrgAward`, `PlayerAward` |
| `prisma/migrations/20260903120000_player_awards/migration.sql` | DDL + índices |
| `src/lib/validations/org-award.ts` | Zod create/update catalog |
| `src/lib/validations/player-award.ts` | Zod grant/revoke |
| `src/lib/org-awards.ts` | Loaders, serialización badge, guards |
| `src/lib/player-awards.ts` | Listar premios de jugador, agrupar por temporada |
| `src/app/api/org-awards/route.ts` | GET/POST catálogo |
| `src/app/api/org-awards/[id]/route.ts` | GET/PUT/DELETE catálogo |
| `src/app/api/players/[id]/awards/route.ts` | GET/POST otorgamientos |
| `src/app/api/players/[id]/awards/[playerAwardId]/route.ts` | DELETE revocar |
| `src/app/api/me/awards/route.ts` | GET premios del jugador logueado |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/awards/page.tsx` | Admin catálogo + otorgar |
| `src/components/admin/OrgAwardForm.tsx` | Crear premio |
| `src/components/admin/OrgAwardsTable.tsx` | Editar/desactivar catálogo |
| `src/components/admin/GrantPlayerAwardForm.tsx` | Otorgar premio a jugador |
| `src/components/admin/PlayerAwardsPanel.tsx` | Chips + revocar en admin jugadores |
| `src/components/player/PlayerAwardBadges.tsx` | Chips en dashboard jugador |
| `src/lib/tenant-nav.ts` | Nav item **Premios** |
| `tests/lib/validations-org-award.test.ts` | Tests Zod catálogo |
| `tests/lib/validations-player-award.test.ts` | Tests Zod otorgamiento |
| `tests/lib/player-awards.test.ts` | Tests agrupación/serialización |

---

### Task 1: Schema Prisma y migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260903120000_player_awards/migration.sql`

**Interfaces:**
- Produces: modelos Prisma `OrgAward`, `PlayerAward` con relaciones a `Organization`, `Player`, `Season?`, `User?`

- [ ] **Step 1: Agregar modelos al schema**

En `prisma/schema.prisma`, después de `FriendlyCategory`:

```prisma
model OrgAward {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name           String
  shortLabel     String
  emoji          String
  description    String?
  accentColor    String?
  sortOrder      Int      @default(0)
  isActive       Boolean  @default(true)
  playerAwards   PlayerAward[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, sortOrder])
}

model PlayerAward {
  id               String   @id @default(cuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  playerId         String
  player           Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  orgAwardId       String
  orgAward         OrgAward @relation(fields: [orgAwardId], references: [id], onDelete: Restrict)
  seasonId         String?
  season           Season?  @relation(fields: [seasonId], references: [id], onDelete: SetNull)
  note             String?
  awardedAt        DateTime @default(now())
  awardedByUserId  String?
  awardedBy        User?    @relation("PlayerAwardGrantedBy", fields: [awardedByUserId], references: [id], onDelete: SetNull)
  createdAt        DateTime @default(now())

  @@unique([playerId, orgAwardId, seasonId])
  @@index([playerId, awardedAt])
  @@index([organizationId, orgAwardId])
}
```

Agregar en `Organization`, `Player`, `Season`, `User` las relaciones inversas:

```prisma
// Organization
orgAwards     OrgAward[]
playerAwards  PlayerAward[]

// Player
playerAwards  PlayerAward[]

// Season
playerAwards  PlayerAward[]

// User
playerAwardsGranted PlayerAward[] @relation("PlayerAwardGrantedBy")
```

- [ ] **Step 2: Crear migration SQL**

`prisma/migrations/20260903120000_player_awards/migration.sql`:

```sql
CREATE TABLE "OrgAward" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortLabel" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "description" TEXT,
  "accentColor" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrgAward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerAward" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "orgAwardId" TEXT NOT NULL,
  "seasonId" TEXT,
  "note" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "awardedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerAward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgAward_organizationId_sortOrder_idx" ON "OrgAward"("organizationId", "sortOrder");
CREATE INDEX "PlayerAward_playerId_awardedAt_idx" ON "PlayerAward"("playerId", "awardedAt");
CREATE INDEX "PlayerAward_organizationId_orgAwardId_idx" ON "PlayerAward"("organizationId", "orgAwardId");

CREATE UNIQUE INDEX "PlayerAward_playerId_orgAwardId_seasonId_key"
  ON "PlayerAward"("playerId", "orgAwardId", "seasonId");

ALTER TABLE "OrgAward"
  ADD CONSTRAINT "OrgAward_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_orgAwardId_fkey"
  FOREIGN KEY ("orgAwardId") REFERENCES "OrgAward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerAward"
  ADD CONSTRAINT "PlayerAward_awardedByUserId_fkey"
  FOREIGN KEY ("awardedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Generar client**

Run: `npx prisma generate`  
Expected: Client generado sin errores.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260903120000_player_awards/
git commit -m "feat: add OrgAward and PlayerAward schema"
```

---

### Task 2: Validaciones Zod

**Files:**
- Create: `src/lib/validations/org-award.ts`
- Create: `src/lib/validations/player-award.ts`
- Create: `tests/lib/validations-org-award.test.ts`
- Create: `tests/lib/validations-player-award.test.ts`

**Interfaces:**
- Produces: `createOrgAwardSchema`, `updateOrgAwardSchema`, `grantPlayerAwardSchema`

- [ ] **Step 1: Write failing tests (catálogo)**

`tests/lib/validations-org-award.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  createOrgAwardSchema,
  updateOrgAwardSchema,
} from '@/lib/validations/org-award'

describe('org award validation', () => {
  it('accepts create with required fields', () => {
    const result = createOrgAwardSchema.safeParse({
      name: 'Premio al 7 pulmones',
      shortLabel: '7 pulmones',
      emoji: '🫁',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty shortLabel', () => {
    const result = createOrgAwardSchema.safeParse({
      name: 'Premio al 7 pulmones',
      shortLabel: '',
      emoji: '🫁',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid accentColor', () => {
    const result = createOrgAwardSchema.safeParse({
      name: 'Fair play',
      shortLabel: 'Fair play',
      emoji: '🤝',
      accentColor: 'red',
    })
    expect(result.success).toBe(false
    )
  })

  it('accepts update with isActive false', () => {
    const result = updateOrgAwardSchema.safeParse({ isActive: false })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations-org-award.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement org-award validation**

`src/lib/validations/org-award.ts`:

```typescript
import { z } from 'zod'

const accentColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')

export const createOrgAwardSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre'),
  shortLabel: z.string().trim().min(1, 'Ingresa una etiqueta corta'),
  emoji: z.string().trim().min(1).max(8),
  description: z.string().trim().optional(),
  accentColor: accentColorSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateOrgAwardSchema = createOrgAwardSchema.partial()

export type CreateOrgAwardInput = z.infer<typeof createOrgAwardSchema>
export type UpdateOrgAwardInput = z.infer<typeof updateOrgAwardSchema>
```

- [ ] **Step 4: Write failing tests (otorgamiento)**

`tests/lib/validations-player-award.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { grantPlayerAwardSchema } from '@/lib/validations/player-award'

describe('player award validation', () => {
  it('accepts grant with orgAwardId', () => {
    const result = grantPlayerAwardSchema.safeParse({
      orgAwardId: 'award_1',
    })
    expect(result.success).toBe(true)
  })

  it('accepts grant with seasonId and note', () => {
    const result = grantPlayerAwardSchema.safeParse({
      orgAwardId: 'award_1',
      seasonId: 'season_1',
      note: 'Copa Los Lagos 2026',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty orgAwardId', () => {
    const result = grantPlayerAwardSchema.safeParse({ orgAwardId: '' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 5: Implement player-award validation**

`src/lib/validations/player-award.ts`:

```typescript
import { z } from 'zod'

export const grantPlayerAwardSchema = z.object({
  orgAwardId: z.string().min(1),
  seasonId: z.string().min(1).optional().nullable(),
  note: z.string().trim().max(200).optional().nullable(),
})

export type GrantPlayerAwardInput = z.infer<typeof grantPlayerAwardSchema>
```

- [ ] **Step 6: Run all validation tests**

Run: `npx vitest run tests/lib/validations-org-award.test.ts tests/lib/validations-player-award.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/validations/org-award.ts src/lib/validations/player-award.ts tests/lib/
git commit -m "feat: add Zod validation for player awards"
```

---

### Task 3: Helpers de dominio y serialización

**Files:**
- Create: `src/lib/org-awards.ts`
- Create: `src/lib/player-awards.ts`
- Create: `tests/lib/player-awards.test.ts`

**Interfaces:**
- Produces: `PlayerAwardBadge`, `serializePlayerAwardBadge()`, `groupPlayerAwardsBySeason()`

- [ ] **Step 1: Write failing test for badge serialization**

`tests/lib/player-awards.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { serializePlayerAwardBadge, groupPlayerAwardsBySeason } from '@/lib/player-awards'

describe('player awards', () => {
  it('serializes badge fields for UI', () => {
    const badge = serializePlayerAwardBadge({
      id: 'pa1',
      awardedAt: new Date('2026-09-01T12:00:00.000Z'),
      note: 'Gran torneo',
      season: { id: 's1', name: 'Copa Kelme' },
      orgAward: {
        id: 'a1',
        name: 'Premio al 7 pulmones',
        shortLabel: '7 pulmones',
        emoji: '🫁',
        description: 'Al que más corre',
        accentColor: '#16A34A',
        isActive: true,
      },
    })
    expect(badge.label).toBe('7 pulmones')
    expect(badge.emoji).toBe('🫁')
    expect(badge.seasonName).toBe('Copa Kelme')
    expect(badge.accentColor).toBe('#16A34A')
  })

  it('groups general awards under null season key', () => {
    const grouped = groupPlayerAwardsBySeason([
      { seasonId: null, seasonName: null, badge: { id: '1' } as never },
      { seasonId: 's1', seasonName: 'Copa', badge: { id: '2' } as never },
    ])
    expect(grouped.general).toHaveLength(1)
    expect(grouped.bySeason).toHaveLength(1)
    expect(grouped.bySeason[0]?.seasonName).toBe('Copa')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/player-awards.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement player-awards helpers**

`src/lib/player-awards.ts`:

```typescript
export type PlayerAwardBadge = {
  id: string
  label: string
  emoji: string
  name: string
  description: string | null
  accentColor: string | null
  note: string | null
  awardedAt: string
  seasonId: string | null
  seasonName: string | null
}

type AwardRow = {
  id: string
  awardedAt: Date
  note: string | null
  season: { id: string; name: string } | null
  orgAward: {
    id: string
    name: string
    shortLabel: string
    emoji: string
    description: string | null
    accentColor: string | null
    isActive: boolean
  }
}

export function serializePlayerAwardBadge(row: AwardRow): PlayerAwardBadge {
  return {
    id: row.id,
    label: row.orgAward.shortLabel,
    emoji: row.orgAward.emoji,
    name: row.orgAward.name,
    description: row.orgAward.description,
    accentColor: row.orgAward.accentColor,
    note: row.note,
    awardedAt: row.awardedAt.toISOString(),
    seasonId: row.season?.id ?? null,
    seasonName: row.season?.name ?? null,
  }
}

export function groupPlayerAwardsBySeason<T extends { seasonId: string | null; seasonName: string | null; badge: PlayerAwardBadge }>(
  items: T[],
) {
  const general = items.filter((item) => item.seasonId === null)
  const bySeasonMap = new Map<string, T[]>()
  for (const item of items) {
    if (!item.seasonId) continue
    const bucket = bySeasonMap.get(item.seasonId) ?? []
    bucket.push(item)
    bySeasonMap.set(item.seasonId, bucket)
  }
  const bySeason = [...bySeasonMap.entries()].map(([seasonId, awards]) => ({
    seasonId,
    seasonName: awards[0]?.seasonName ?? '',
    awards,
  }))
  return { general, bySeason }
}
```

`src/lib/org-awards.ts` (loader mínimo):

```typescript
import { db } from '@/lib/db'

export async function listActiveOrgAwards(organizationId: string) {
  return db.orgAward.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function listOrgAwardsWithCounts(organizationId: string) {
  return db.orgAward.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { playerAwards: true } } },
  })
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/player-awards.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/org-awards.ts src/lib/player-awards.ts tests/lib/player-awards.test.ts
git commit -m "feat: add player award domain helpers"
```

---

### Task 4: API catálogo de premios

**Files:**
- Create: `src/app/api/org-awards/route.ts`
- Create: `src/app/api/org-awards/[id]/route.ts`

**Interfaces:**
- Consumes: `createOrgAwardSchema`, `updateOrgAwardSchema`, `requireOrgRole`
- Produces: REST JSON catálogo org-scoped

- [ ] **Step 1: Implement GET/POST**

Copiar patrón de `src/app/api/friendly-categories/route.ts`:

`src/app/api/org-awards/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { createOrgAwardSchema } from '@/lib/validations/org-award'

export async function GET() {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const awards = await db.orgAward.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { playerAwards: true } } },
  })
  return NextResponse.json(awards)
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const parsed = createOrgAwardSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const award = await db.orgAward.create({
    data: {
      organizationId,
      name: parsed.data.name,
      shortLabel: parsed.data.shortLabel,
      emoji: parsed.data.emoji,
      description: parsed.data.description,
      accentColor: parsed.data.accentColor,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  })
  return NextResponse.json(award, { status: 201 })
}
```

- [ ] **Step 2: Implement GET/PUT/DELETE por id**

`src/app/api/org-awards/[id]/route.ts` — mismo patrón que `friendly-categories/[id]/route.ts`:
- GET: award de la org o 404
- PUT: `updateOrgAwardSchema`
- DELETE: solo si `_count.playerAwards === 0`; si tiene otorgamientos, responder 409 con mensaje "Desactiva el premio en lugar de eliminarlo"

- [ ] **Step 3: Smoke manual (dev)**

Run server local y probar:

```powershell
# Crear premio (como admin autenticado en browser o con cookie)
POST /api/org-awards
{ "name": "Premio al 7 pulmones", "shortLabel": "7 pulmones", "emoji": "🫁", "accentColor": "#16A34A" }
```

Expected: 201 + id

- [ ] **Step 4: Commit**

```bash
git add src/app/api/org-awards/
git commit -m "feat: add org awards catalog API"
```

---

### Task 5: API otorgar y revocar premios

**Files:**
- Create: `src/app/api/players/[id]/awards/route.ts`
- Create: `src/app/api/players/[id]/awards/[playerAwardId]/route.ts`
- Create: `src/app/api/me/awards/route.ts`

**Interfaces:**
- Consumes: `grantPlayerAwardSchema`, `serializePlayerAwardBadge`
- Produces: endpoints grant/list/revoke

- [ ] **Step 1: GET/POST `/api/players/[id]/awards`**

Validaciones:
- `player` pertenece a `organizationId` del admin
- `orgAward` activo y de la misma org
- `seasonId` opcional pertenece a la org
- Unique violation → 409 "Este jugador ya tiene ese premio en esa temporada"

POST body:

```typescript
{
  orgAwardId: string
  seasonId?: string | null
  note?: string | null
}
```

GET include:

```typescript
include: {
  orgAward: true,
  season: { select: { id: true, name: true } },
}
```

- [ ] **Step 2: DELETE `/api/players/[id]/awards/[playerAwardId]`**

Verificar triple: playerAward.playerId, organizationId, playerAwardId.

- [ ] **Step 3: GET `/api/me/awards`**

- `requireOrgRole([ORG_ADMIN, MembershipRole.PLAYER, ...])` o sesión + `findPlayerInOrganization`
- Solo premios del jugador logueado en org activa
- Filtrar `orgAward.isActive === true` **o** incluir inactivos si ya fueron otorgados (mostrar histórico)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/players/[id]/awards/ src/app/api/me/awards/
git commit -m "feat: add player award grant and revoke API"
```

---

### Task 6: Admin UI — catálogo de premios

**Files:**
- Create: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/awards/page.tsx`
- Create: `src/components/admin/OrgAwardForm.tsx`
- Create: `src/components/admin/OrgAwardsTable.tsx`
- Modify: `src/lib/tenant-nav.ts`

**Interfaces:**
- Consumes: API `/api/org-awards`
- Produces: página admin CRUD (patrón FriendlyCategory)

- [ ] **Step 1: Página server**

`admin/awards/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { requireOrganizationId } from '@/lib/tenant-access'
import { listOrgAwardsWithCounts } from '@/lib/org-awards'
import { OrgAwardForm } from '@/components/admin/OrgAwardForm'
import { OrgAwardsTable } from '@/components/admin/OrgAwardsTable'

export default async function AdminAwardsPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
  const { organizationSlug } = await params
  let organizationId: string
  try {
    organizationId = await requireOrganizationId(organizationSlug)
  } catch {
    notFound()
  }

  const awards = await listOrgAwardsWithCounts(organizationId)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Premios</h1>
      <p className="text-sm text-kelme-gray-400">
        Define premios de la liga y otórgalos a jugadores. Se verán como badges en su panel.
      </p>
      <OrgAwardForm />
      <OrgAwardsTable awards={awards.map((a) => ({
        id: a.id,
        name: a.name,
        shortLabel: a.shortLabel,
        emoji: a.emoji,
        description: a.description,
        accentColor: a.accentColor,
        sortOrder: a.sortOrder,
        isActive: a.isActive,
        playerCount: a._count.playerAwards,
      }))} />
    </div>
  )
}
```

- [ ] **Step 2: Form + Table client**

`OrgAwardForm.tsx`: campos name, shortLabel, emoji, description, accentColor (input color o hex), sortOrder → POST `/api/org-awards`.

`OrgAwardsTable.tsx`: inline edit como `FriendlyCategoriesTable`; preview chip con emoji + shortLabel + accentColor.

- [ ] **Step 3: Nav**

En `src/lib/tenant-nav.ts`, grupo Competición, después de Jugadores:

```typescript
{ href: base('/admin/awards'), label: 'Premios', icon: 'PR' },
```

Agregar `base('/admin/awards')` a `activePrefixes` del grupo si aplica.

- [ ] **Step 4: Verificar en browser**

Abrir `/kelme/admin/awards`, crear "Premio al 7 pulmones" 🫁.

- [ ] **Step 5: Commit**

```bash
git add src/app/(tenant)/.../admin/awards/ src/components/admin/OrgAward*.tsx src/lib/tenant-nav.ts
git commit -m "feat: add admin awards catalog UI"
```

---

### Task 7: Admin UI — otorgar premio a jugador

**Files:**
- Create: `src/components/admin/GrantPlayerAwardForm.tsx`
- Create: `src/components/admin/PlayerAwardsPanel.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/awards/page.tsx`
- Modify: `src/components/admin/PlayersTable.tsx` (opcional: columna Premios)

**Interfaces:**
- Consumes: GET `/api/org-awards`, GET seasons de org, POST `/api/players/[id]/awards`

- [ ] **Step 1: GrantPlayerAwardForm**

Props: `players: { id, name, teamName }[]`, `awards: { id, name, emoji, shortLabel }[]`, `seasons: { id, name }[]`.

Submit → POST `/api/players/${playerId}/awards`.

Copy UI: "Otorga un premio a un jugador".

- [ ] **Step 2: PlayerAwardsPanel**

Lista chips con botón revocar (DELETE). Usar en:
- Bottom de `admin/awards/page.tsx` (GrantPlayerAwardForm arriba)
- Expand row o modal en `PlayersTable` (mínimo: link "Premios" abre panel)

- [ ] **Step 3: Cargar jugadores y temporadas en awards page**

Server page carga:
```typescript
const [players, seasons] = await Promise.all([
  db.player.findMany({ where: { organizationId }, include: { person: true, team: true }, orderBy: { person: { lastName: 'asc' } } }),
  db.season.findMany({ where: { organizationId, isActive: true }, orderBy: { startDate: 'desc' } }),
])
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/GrantPlayerAwardForm.tsx src/components/admin/PlayerAwardsPanel.tsx
git commit -m "feat: add admin UI to grant player awards"
```

---

### Task 8: Dashboard jugador — badges

**Files:**
- Create: `src/components/player/PlayerAwardBadges.tsx`
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx`

**Interfaces:**
- Consumes: `groupPlayerAwardsBySeason`, `serializePlayerAwardBadge`

- [ ] **Step 1: Componente badges**

`PlayerAwardBadges.tsx`:

```tsx
'use client'

export function PlayerAwardBadges({
  general,
  bySeason,
}: {
  general: PlayerAwardBadge[]
  bySeason: { seasonName: string; awards: PlayerAwardBadge[] }[]
}) {
  if (general.length === 0 && bySeason.length === 0) {
    return <p className="text-sm text-kelme-gray-400">Aún no tienes premios en esta liga.</p>
  }
  return (
    <div className="space-y-4">
      {general.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {general.map((badge) => (
            <AwardChip key={badge.id} badge={badge} />
          ))}
        </div>
      )}
      {bySeason.map((group) => (
        <div key={group.seasonName}>
          <h3 className="mb-2 text-sm font-medium text-kelme-gray-400">{group.seasonName}</h3>
          <div className="flex flex-wrap gap-2">
            {group.awards.map((badge) => (
              <AwardChip key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

Chip: emoji + shortLabel, `title` con name + description + note, borde/fondo con `accentColor` si existe.

- [ ] **Step 2: Integrar en player page**

Después del grid de stats:

```typescript
const playerAwards = await db.playerAward.findMany({
  where: { playerId: player.id, organizationId },
  include: {
    orgAward: true,
    season: { select: { id: true, name: true } },
  },
  orderBy: { awardedAt: 'desc' },
})

const badgeItems = playerAwards
  .filter((row) => row.orgAward.isActive || true) // mostrar histórico
  .map((row) => ({
    seasonId: row.seasonId,
    seasonName: row.season?.name ?? null,
    badge: serializePlayerAwardBadge(row),
  }))

const grouped = groupPlayerAwardsBySeason(badgeItems)
```

Sección:

```tsx
<section>
  <h2 className="mb-3 text-lg font-semibold">Mis premios</h2>
  <PlayerAwardBadges general={grouped.general.map((g) => g.badge)} bySeason={grouped.bySeason.map((s) => ({
    seasonName: s.seasonName,
    awards: s.awards.map((a) => a.badge),
  }))} />
</section>
```

- [ ] **Step 3: Verificar**

Otorgar premio a jugador demo → login como jugador → ver chip 🫁 "7 pulmones".

- [ ] **Step 4: Commit**

```bash
git add src/components/player/PlayerAwardBadges.tsx src/app/(tenant)/.../player/page.tsx
git commit -m "feat: show player award badges on player dashboard"
```

---

### Task 9: Seed demo opcional y verificación final

**Files:**
- Modify: `prisma/seed.ts` (opcional, solo si org demo existe)

- [ ] **Step 1: Seed premios demo (opcional)**

Si `org_kelme` o `liga-demo` en seed:

```typescript
await prisma.orgAward.upsert({
  where: { id: 'demo-award-7-pulmones' },
  update: {},
  create: {
    id: 'demo-award-7-pulmones',
    organizationId: 'org_kelme',
    name: 'Premio al 7 pulmones',
    shortLabel: '7 pulmones',
    emoji: '🫁',
    description: 'Al jugador que más corre en la cancha',
    accentColor: '#16A34A',
    sortOrder: 0,
  },
})
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`  
Expected: PASS (o solo tests nuevos si suite grande)

- [ ] **Step 3: Build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts  # si aplica
git commit -m "chore: seed demo org awards"
```

---

## Self-Review (spec coverage)

| Requisito spec | Task |
|----------------|------|
| Catálogo OrgAward | 1, 2, 4, 6 |
| Otorgamiento PlayerAward | 1, 5, 7 |
| Temporada opcional | 1, 5, 7 |
| Solo ORG_ADMIN muta | 4, 5 |
| Badges dashboard jugador | 3, 8 |
| Unique por jugador/premio/temporada | 1, 5 |
| Desactivar vs eliminar catálogo | 4 (DELETE 409) |
| Español chileno | 6, 7, 8 (copy en UI) |
| Móvil / landing | Fuera de scope ✓ |

**Placeholder scan:** ninguno.

---

## Execution Handoff

Plan guardado en `docs/superpowers/plans/2026-09-03-player-awards.md`.  
Spec borrador en `docs/superpowers/specs/2026-09-03-player-awards-design.md`.

**Opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — un subagente por task, revisión entre tasks.
2. **Inline Execution** — implementar en esta sesión con checkpoints.

**¿Cuál prefieres?**

Si quieres ajustar el diseño antes de codear, dime por ejemplo:
- ¿Premios solo por **temporada** o también **generales** de la org? (plan asume **ambos**)
- ¿DT puede otorgar premios o solo admin?
