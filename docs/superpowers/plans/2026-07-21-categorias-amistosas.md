# Categorías Amistosas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que todo partido amistoso pertenezca a una categoría con roster propio, de modo que los jugadores de un grupo no se mezclen con los de otro y ya no existan amistosos “sueltos”.

**Architecture:** Nuevo modelo `FriendlyCategory` (análogo a `Season` para ligas). Cada `FriendlyPlayer` pertenece a exactamente una categoría. Cada `Match` FRIENDLY exige `friendlyCategoryId`. Al crear el partido, Zod + API validan que todos los jugadores del plantel sean miembros de esa categoría. Migración de datos: categoría `Amistosos (histórico)` para filas existentes en prod. El pool global desaparece de la UI/API.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL, Zod, Auth.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-categorias-amistosas-design.md`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Modelo `FriendlyCategory`; FKs en `FriendlyPlayer` y `Match` |
| `prisma/migrations/20260721120000_friendly_categories/` | Migración + backfill histórico |
| `src/lib/validations/friendly-category.ts` | CREAR — create/update Zod |
| `src/lib/validations/friendly-player.ts` | MODIFICAR — exigir `friendlyCategoryId` |
| `src/lib/validations/match.ts` | MODIFICAR — FRIENDLY exige `friendlyCategoryId` |
| `src/lib/friendly-category-guards.ts` | CREAR — helpers membership / invariantes |
| `src/app/api/friendly-categories/route.ts` | CREAR — GET/POST |
| `src/app/api/friendly-categories/[id]/route.ts` | CREAR — PUT/DELETE |
| `src/app/api/friendly-players/route.ts` | MODIFICAR — filtrar por categoría; exigir id al crear |
| `src/app/api/friendly-players/[id]/route.ts` | MODIFICAR — no permitir cambiar categoría si tiene partidos (o bloquear move) |
| `src/app/api/matches/route.ts` | MODIFICAR — guardar `friendlyCategoryId` + validar roster |
| `src/components/admin/FriendlyCategoryForm.tsx` | CREAR |
| `src/components/admin/FriendlyCategoriesTable.tsx` | CREAR |
| `src/app/(dashboard)/admin/friendly-categories/page.tsx` | CREAR |
| `src/app/(dashboard)/admin/layout.tsx` | MODIFICAR — nav |
| `src/app/(dashboard)/admin/friendly-players/page.tsx` | MODIFICAR — filtro por categoría |
| `src/components/admin/FriendlyPlayerForm.tsx` | MODIFICAR — selector categoría |
| `src/components/admin/FriendlyMatchForm.tsx` | MODIFICAR — selector categoría + roster filtrado |
| `src/app/(dashboard)/admin/matches/page.tsx` | MODIFICAR — pasar categorías al form |
| `src/app/(auth)/register/page.tsx` | MODIFICAR — claim muestra categoría en label |
| `src/lib/friendly-stats.ts` / stats route | MODIFICAR solo si hace falta filtrar por categoría (opcional; 1 jugador = 1 cat) |
| `tests/lib/validations-friendly-category.test.ts` | CREAR |
| `tests/lib/friendly-category-guards.test.ts` | CREAR |
| `tests/lib/validations-friendly.test.ts` | MODIFICAR |
| `tests/api/match-events.test.ts` / match validations | MODIFICAR schemas FRIENDLY |

---

### Task 1: Validaciones Zod de categoría (TDD)

**Files:**
- Create: `src/lib/validations/friendly-category.ts`
- Create: `tests/lib/validations-friendly-category.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  createFriendlyCategorySchema,
  updateFriendlyCategorySchema,
} from '@/lib/validations/friendly-category'

describe('friendly category validation', () => {
  it('accepts create with name', () => {
    const result = createFriendlyCategorySchema.safeParse({
      name: 'Viernes fútbol',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createFriendlyCategorySchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts update with isActive', () => {
    const result = updateFriendlyCategorySchema.safeParse({
      name: 'Sábados',
      isActive: false,
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations-friendly-category.test.ts`

Expected: FAIL — cannot find module `@/lib/validations/friendly-category`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/validations/friendly-category.ts
import { z } from 'zod'

export const createFriendlyCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateFriendlyCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export type CreateFriendlyCategoryInput = z.infer<typeof createFriendlyCategorySchema>
export type UpdateFriendlyCategoryInput = z.infer<typeof updateFriendlyCategorySchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/validations-friendly-category.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/friendly-category.ts tests/lib/validations-friendly-category.test.ts
git commit -m "feat: add friendly category zod schemas"
```

---

### Task 2: Guards de membership (TDD)

**Files:**
- Create: `src/lib/friendly-category-guards.ts`
- Create: `tests/lib/friendly-category-guards.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  assertPlayersBelongToCategory,
  friendlyMatchRequiresCategory,
} from '@/lib/friendly-category-guards'

describe('friendly category guards', () => {
  it('requires category id for friendly matches', () => {
    expect(friendlyMatchRequiresCategory(null)).toBe(false)
    expect(friendlyMatchRequiresCategory('cat-1')).toBe(true)
  })

  it('accepts players that all belong to the category', () => {
    const result = assertPlayersBelongToCategory('cat-1', [
      { id: 'p1', friendlyCategoryId: 'cat-1' },
      { id: 'p2', friendlyCategoryId: 'cat-1' },
    ])
    expect(result.ok).toBe(true)
  })

  it('rejects players from another category', () => {
    const result = assertPlayersBelongToCategory('cat-1', [
      { id: 'p1', friendlyCategoryId: 'cat-1' },
      { id: 'p2', friendlyCategoryId: 'cat-2' },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.foreignPlayerIds).toEqual(['p2'])
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/friendly-category-guards.test.ts`

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/friendly-category-guards.ts
export function friendlyMatchRequiresCategory(
  friendlyCategoryId: string | null | undefined
): boolean {
  return Boolean(friendlyCategoryId)
}

export function assertPlayersBelongToCategory(
  categoryId: string,
  players: Array<{ id: string; friendlyCategoryId: string | null }>
): { ok: true } | { ok: false; foreignPlayerIds: string[] } {
  const foreignPlayerIds = players
    .filter((p) => p.friendlyCategoryId !== categoryId)
    .map((p) => p.id)

  if (foreignPlayerIds.length > 0) {
    return { ok: false, foreignPlayerIds }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/friendly-category-guards.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/friendly-category-guards.ts tests/lib/friendly-category-guards.test.ts
git commit -m "feat: add friendly category membership guards"
```

---

### Task 3: Extender validación de match FRIENDLY

**Files:**
- Modify: `src/lib/validations/match.ts`
- Modify: `tests/lib/validations-friendly.test.ts` (o el test que cubra `createFriendlyMatchSchema`)

- [ ] **Step 1: Write the failing test**

Agregar en `tests/lib/validations-friendly.test.ts` (o crear si no existe cobertura de match):

```ts
import { createFriendlyMatchSchema } from '@/lib/validations/match'

it('requires friendlyCategoryId for friendly match', () => {
  const result = createFriendlyMatchSchema.safeParse({
    matchType: 'FRIENDLY',
    sideAName: 'Equipo A',
    sideBName: 'Equipo B',
    scheduledAt: new Date().toISOString(),
    players: [
      { friendlyPlayerId: 'p1', side: 'A' },
      { friendlyPlayerId: 'p2', side: 'B' },
    ],
  })
  expect(result.success).toBe(false)
})

it('accepts friendly match with category and roster', () => {
  const result = createFriendlyMatchSchema.safeParse({
    matchType: 'FRIENDLY',
    friendlyCategoryId: 'cat-1',
    sideAName: 'Equipo A',
    sideBName: 'Equipo B',
    scheduledAt: new Date().toISOString(),
    players: [
      { friendlyPlayerId: 'p1', side: 'A' },
      { friendlyPlayerId: 'p2', side: 'B' },
    ],
  })
  expect(result.success).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations-friendly.test.ts`

Expected: FAIL — primer caso aún pasa sin `friendlyCategoryId`, o el segundo falla por campo desconocido según Zod strip; ajustar expectativa al estado actual (hoy el primero **pasa** sin categoría → ese es el fail que queremos).

- [ ] **Step 3: Update schema**

En `src/lib/validations/match.ts`, dentro de `createFriendlyMatchSchema`:

```ts
export const createFriendlyMatchSchema = z
  .object({
    matchType: z.literal('FRIENDLY'),
    friendlyCategoryId: id,
    sideAName: z.string().min(1),
    sideBName: z.string().min(1),
    refereeId: id.optional(),
    scheduledAt: z.string().datetime(),
    venue: z.string().optional(),
    players: z.array(friendlyPlayerEntry).min(2),
  })
  .superRefine((data, ctx) => {
    // ... existing side/uniqueness checks unchanged ...
  })
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/validations-friendly.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/match.ts tests/lib/validations-friendly.test.ts
git commit -m "feat: require friendlyCategoryId on friendly match create"
```

---

### Task 4: Extender validación de FriendlyPlayer

**Files:**
- Modify: `src/lib/validations/friendly-player.ts`
- Modify: `tests/lib/validations-friendly.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it('requires friendlyCategoryId when creating friendly player', () => {
  const result = createFriendlyPlayerSchema.safeParse({
    firstName: 'Juan',
    lastName: 'Pérez',
  })
  expect(result.success).toBe(false)
})

it('accepts player with category', () => {
  const result = createFriendlyPlayerSchema.safeParse({
    firstName: 'Juan',
    lastName: 'Pérez',
    friendlyCategoryId: 'cat-1',
  })
  expect(result.success).toBe(true)
})
```

- [ ] **Step 2: Run — expect FAIL** (hoy create sin categoría puede pasar)

- [ ] **Step 3: Update schemas**

En `createFriendlyPlayerSchema` agregar `friendlyCategoryId: id`.

En `updateFriendlyPlayerSchema`: **no** permitir cambiar `friendlyCategoryId` en esta iteración (omitir el campo del update). Si el admin necesita mover un jugador, lo hace borrando/recreando o en una feature futura. Documentar en comentario corto.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/friendly-player.ts tests/lib/validations-friendly.test.ts
git commit -m "feat: require category when creating friendly players"
```

---

### Task 5: Schema Prisma + migración con backfill

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260721120000_friendly_categories/migration.sql`

- [ ] **Step 1: Update `prisma/schema.prisma`**

Agregar modelo:

```prisma
model FriendlyCategory {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  players     FriendlyPlayer[]
  matches     Match[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

En `Match`, agregar:

```prisma
  friendlyCategoryId String?
  friendlyCategory   FriendlyCategory? @relation(fields: [friendlyCategoryId], references: [id])
```

En `FriendlyPlayer`, agregar:

```prisma
  friendlyCategoryId String
  friendlyCategory   FriendlyCategory @relation(fields: [friendlyCategoryId], references: [id])
```

- [ ] **Step 2: Write SQL migration (backfill-safe)**

```sql
-- CreateTable
CREATE TABLE "FriendlyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendlyCategory_pkey" PRIMARY KEY ("id")
);

-- Seed historical category (fixed id for deterministic backfill)
INSERT INTO "FriendlyCategory" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  'friendly-category-legacy',
  'Amistosos (histórico)',
  'Categoría creada automáticamente para datos previos a categorías amistosas',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- AlterTable Match
ALTER TABLE "Match" ADD COLUMN "friendlyCategoryId" TEXT;

UPDATE "Match"
SET "friendlyCategoryId" = 'friendly-category-legacy'
WHERE "matchType" = 'FRIENDLY';

ALTER TABLE "Match" ADD CONSTRAINT "Match_friendlyCategoryId_fkey"
  FOREIGN KEY ("friendlyCategoryId") REFERENCES "FriendlyCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable FriendlyPlayer (nullable first → backfill → NOT NULL)
ALTER TABLE "FriendlyPlayer" ADD COLUMN "friendlyCategoryId" TEXT;

UPDATE "FriendlyPlayer"
SET "friendlyCategoryId" = 'friendly-category-legacy'
WHERE "friendlyCategoryId" IS NULL;

ALTER TABLE "FriendlyPlayer" ALTER COLUMN "friendlyCategoryId" SET NOT NULL;

ALTER TABLE "FriendlyPlayer" ADD CONSTRAINT "FriendlyPlayer_friendlyCategoryId_fkey"
  FOREIGN KEY ("friendlyCategoryId") REFERENCES "FriendlyCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 3: Generate client**

Run: `npx prisma generate`

Expected: success

- [ ] **Step 4: Apply locally**

Run: `npx prisma migrate deploy`

Expected: migration applied (si DB local vacía o con datos, backfill ok)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260721120000_friendly_categories/
git commit -m "feat: add FriendlyCategory and backfill legacy friendlies"
```

---

### Task 6: API CRUD categorías

**Files:**
- Create: `src/app/api/friendly-categories/route.ts`
- Create: `src/app/api/friendly-categories/[id]/route.ts`

- [ ] **Step 1: Implement GET/POST**

```ts
// src/app/api/friendly-categories/route.ts
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { createFriendlyCategorySchema } from '@/lib/validations/friendly-category'

export async function GET() {
  await requireRole([Role.ADMIN])
  const categories = await db.friendlyCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { players: true, matches: true } },
    },
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createFriendlyCategorySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const category = await db.friendlyCategory.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
    },
  })
  return NextResponse.json(category, { status: 201 })
}
```

- [ ] **Step 2: Implement PUT/DELETE**

```ts
// src/app/api/friendly-categories/[id]/route.ts
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateFriendlyCategorySchema } from '@/lib/validations/friendly-category'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateFriendlyCategorySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const existing = await db.friendlyCategory.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }
  const category = await db.friendlyCategory.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  })
  return NextResponse.json(category)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const existing = await db.friendlyCategory.findUnique({
    where: { id },
    include: { _count: { select: { players: true, matches: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }
  if (existing._count.players > 0 || existing._count.matches > 0) {
    return NextResponse.json(
      {
        error:
          'No se puede eliminar: la categoría tiene jugadores o partidos. Desactívala en su lugar.',
      },
      { status: 400 }
    )
  }
  await db.friendlyCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/friendly-categories/
git commit -m "feat: add friendly categories admin API"
```

---

### Task 7: API friendly-players filtrada por categoría

**Files:**
- Modify: `src/app/api/friendly-players/route.ts`
- Modify: `src/app/api/friendly-players/[id]/route.ts`

- [ ] **Step 1: GET con query `categoryId`**

En `GET`:

```ts
const { searchParams } = new URL(req.url)
const categoryId = searchParams.get('categoryId')

const players = await db.friendlyPlayer.findMany({
  where: categoryId ? { friendlyCategoryId: categoryId } : undefined,
  orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  include: {
    friendlyCategory: { select: { id: true, name: true } },
    // ... existing includes ...
  },
})
```

- [ ] **Step 2: POST guarda `friendlyCategoryId`**

Tras parsear el schema actualizado:

```ts
const category = await db.friendlyCategory.findUnique({
  where: { id: parsed.data.friendlyCategoryId },
})
if (!category) {
  return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 })
}

await db.friendlyPlayer.create({
  data: {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    friendlyCategoryId: parsed.data.friendlyCategoryId,
    // ... profile fields ...
  },
})
```

- [ ] **Step 3: PUT no mueve de categoría**

Asegurar que el update **no** escriba `friendlyCategoryId` aunque venga en el body.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/friendly-players/
git commit -m "feat: scope friendly players API by category"
```

---

### Task 8: API crear partido FRIENDLY con categoría + membership

**Files:**
- Modify: `src/app/api/matches/route.ts`

- [ ] **Step 1: En el branch FRIENDLY de POST**

Después de `safeParse`:

```ts
import { assertPlayersBelongToCategory } from '@/lib/friendly-category-guards'

// ...
const category = await db.friendlyCategory.findUnique({
  where: { id: data.friendlyCategoryId },
})
if (!category) {
  return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 })
}
if (!category.isActive) {
  return NextResponse.json(
    { error: 'La categoría no está activa' },
    { status: 400 }
  )
}

const playerIds = data.players.map((p) => p.friendlyPlayerId)
const rosterPlayers = await db.friendlyPlayer.findMany({
  where: { id: { in: playerIds } },
  select: { id: true, friendlyCategoryId: true },
})
if (rosterPlayers.length !== playerIds.length) {
  return NextResponse.json(
    { error: 'Uno o más jugadores no existen' },
    { status: 400 }
  )
}

const membership = assertPlayersBelongToCategory(
  data.friendlyCategoryId,
  rosterPlayers
)
if (!membership.ok) {
  return NextResponse.json(
    {
      error: 'Todos los jugadores deben pertenecer a la categoría del partido',
      foreignPlayerIds: membership.foreignPlayerIds,
    },
    { status: 400 }
  )
}

const match = await db.match.create({
  data: {
    matchType: 'FRIENDLY',
    friendlyCategoryId: data.friendlyCategoryId,
    sideAName: data.sideAName,
    sideBName: data.sideBName,
    refereeId: data.refereeId,
    scheduledAt: new Date(data.scheduledAt),
    venue: data.venue,
    friendlyPlayers: {
      create: data.players.map((p) => ({
        friendlyPlayerId: p.friendlyPlayerId,
        side: p.side,
      })),
    },
  },
  include: {
    friendlyCategory: true,
    friendlyPlayers: { include: { friendlyPlayer: true } },
  },
})
```

- [ ] **Step 2: Typecheck + tests unitarios existentes**

Run: `npx vitest run; npx tsc --noEmit`

Expected: PASS (ajustar cualquier test de create match que falte `friendlyCategoryId`)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/matches/route.ts
git commit -m "feat: enforce category membership on friendly match create"
```

---

### Task 9: Admin UI — categorías

**Files:**
- Create: `src/components/admin/FriendlyCategoryForm.tsx`
- Create: `src/components/admin/FriendlyCategoriesTable.tsx`
- Create: `src/app/(dashboard)/admin/friendly-categories/page.tsx`
- Modify: `src/app/(dashboard)/admin/layout.tsx`

- [ ] **Step 1: Form (patrón SeasonForm / FriendlyPlayerForm)**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

export function FriendlyCategoryForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? '') || undefined,
    }
    const res = await submitJson('/api/friendly-categories', body)
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    e.currentTarget.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
      <h2 className="font-display text-lg font-bold md:col-span-3">Nueva categoría</h2>
      <input name="name" required placeholder="Nombre" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="description" placeholder="Descripción (opcional)" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold disabled:opacity-50 md:col-span-3">
        Crear categoría
      </button>
      {error && <p className="text-sm text-kelme-red md:col-span-3">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 2: Table con editar nombre/activa y borrar (si vacío)**

Seguir el patrón de `SeasonsTable.tsx` / `FriendlyPlayersTable.tsx`:
- Mostrar `name`, `description`, `_count.players`, `_count.matches`, `isActive`
- Toggle `isActive` vía PUT
- DELETE solo si counts = 0; si no, mensaje claro

- [ ] **Step 3: Page**

```tsx
import { db } from '@/lib/db'
import { FriendlyCategoryForm } from '@/components/admin/FriendlyCategoryForm'
import { FriendlyCategoriesTable } from '@/components/admin/FriendlyCategoriesTable'

export default async function AdminFriendlyCategoriesPage() {
  const categories = await db.friendlyCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { players: true, matches: true } } },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Categorías amistosas</h1>
      <p className="text-sm text-kelme-gray-400">
        Cada categoría tiene su propio grupo de jugadores. Los partidos amistosos siempre pertenecen a una categoría.
      </p>
      <FriendlyCategoryForm />
      <FriendlyCategoriesTable categories={categories} />
    </div>
  )
}
```

- [ ] **Step 4: Nav en `admin/layout.tsx`**

Agregar link **Categorías amistosas** → `/admin/friendly-categories` (junto a Jugadores amistosos).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/FriendlyCategoryForm.tsx src/components/admin/FriendlyCategoriesTable.tsx "src/app/(dashboard)/admin/friendly-categories/" "src/app/(dashboard)/admin/layout.tsx"
git commit -m "feat: admin UI for friendly categories"
```

---

### Task 10: Admin UI — jugadores filtrados por categoría

**Files:**
- Modify: `src/app/(dashboard)/admin/friendly-players/page.tsx`
- Modify: `src/components/admin/FriendlyPlayerForm.tsx`
- Modify: `src/components/admin/FriendlyPlayersTable.tsx` (mostrar nombre de categoría)

- [ ] **Step 1: Page acepta `searchParams.categoryId`**

```tsx
export default async function AdminFriendlyPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>
}) {
  const { categoryId } = await searchParams
  const categories = await db.friendlyCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  const selectedCategoryId = categoryId ?? categories[0]?.id ?? null

  const players = selectedCategoryId
    ? await db.friendlyPlayer.findMany({
        where: { friendlyCategoryId: selectedCategoryId },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        // ... existing includes ...
      })
    : []

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Jugadores amistosos</h1>
      {/* Selector de categoría: links o <form> GET ?categoryId= */}
      {!selectedCategoryId ? (
        <p className="text-kelme-gray-400">
          Primero crea una categoría amistosa.
        </p>
      ) : (
        <>
          <FriendlyPlayerForm
            categories={categories}
            defaultCategoryId={selectedCategoryId}
          />
          <FriendlyPlayersTable players={...} />
        </>
      )}
    </div>
  )
}
```

Textos UI en español chileno (`es-CL`), tú.

- [ ] **Step 2: Form incluye `friendlyCategoryId` (select o hidden del filtro actual)**

Al submit, body debe incluir `friendlyCategoryId`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/admin/friendly-players/" src/components/admin/FriendlyPlayerForm.tsx src/components/admin/FriendlyPlayersTable.tsx
git commit -m "feat: filter friendly players admin by category"
```

---

### Task 11: Admin UI — form de partido amistoso por categoría

**Files:**
- Modify: `src/components/admin/FriendlyMatchForm.tsx`
- Modify: `src/app/(dashboard)/admin/matches/page.tsx`

- [ ] **Step 1: Props nuevas**

```ts
type FriendlyCategoryOption = { id: string; name: string; isActive: boolean }
type FriendlyPlayer = {
  id: string
  firstName: string
  lastName: string
  friendlyCategoryId: string
  primaryPosition?: string | null
  hasPhoto?: boolean
}

type Props = {
  referees: Referee[]
  categories: FriendlyCategoryOption[]
  friendlyPlayers: FriendlyPlayer[]
}
```

- [ ] **Step 2: Estado `categoryId`**

```tsx
const activeCategories = categories.filter((c) => c.isActive)
const [categoryId, setCategoryId] = useState(activeCategories[0]?.id ?? '')

const roster = friendlyPlayers.filter((p) => p.friendlyCategoryId === categoryId)
```

Al cambiar categoría: limpiar `sideAIds` / `sideBIds`.

Renderizar `<select>` de categoría **antes** de lados/plantel. Si no hay categorías activas, mostrar mensaje y deshabilitar submit.

Solo listar checkboxes desde `roster` (no el pool completo).

En el body del POST:

```ts
{
  matchType: 'FRIENDLY',
  friendlyCategoryId: categoryId,
  sideAName,
  sideBName,
  // ...
  players: [...]
}
```

- [ ] **Step 3: Page carga categorías + players con `friendlyCategoryId`**

```tsx
const categories = await db.friendlyCategory.findMany({ orderBy: { name: 'asc' } })
const friendlyPlayers = await db.friendlyPlayer.findMany({
  orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  // select friendlyCategoryId
})
```

En la lista de partidos, opcional: mostrar nombre de categoría junto al amistoso (`match.friendlyCategory?.name`).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/FriendlyMatchForm.tsx "src/app/(dashboard)/admin/matches/page.tsx"
git commit -m "feat: create friendly matches inside a category roster"
```

---

### Task 12: Claim / registro — mostrar categoría

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(auth)/register/RegisterForm.tsx` (si aplica)
- Modify: `src/app/api/friendly-players/claim/route.ts` solo si valida membership (hoy no necesita categoría)

- [ ] **Step 1: Al listar perfiles reclamables**

Incluir `friendlyCategory: { select: { name: true } }` y mostrar label:

`Juan Pérez — Viernes fútbol`

Así no se confunden homónimos de categorías distintas.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(auth)/register/"
git commit -m "feat: show friendly category on claimable player labels"
```

---

### Task 13: Labels / listas / live cosméticos

**Files:**
- Modify: `src/lib/match-label.ts` (si conviene `matchDisplayName` incluir categoría)
- Modify: páginas que listen amistosos (admin matches, referee list, landing) para incluir categoría en el subtítulo cuando `FRIENDLY`

- [ ] **Step 1: Extender helper opcional**

```ts
export function friendlyCategoryLabel(
  match: { matchType: string; friendlyCategory?: { name: string } | null }
): string | null {
  if (match.matchType !== 'FRIENDLY') return null
  return match.friendlyCategory?.name ?? null
}
```

Test en `tests/lib/match-label.test.ts`.

- [ ] **Step 2: Includes Prisma** donde se listen matches FRIENDLY: agregar `friendlyCategory: { select: { id: true, name: true } }`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/match-label.ts tests/lib/match-label.test.ts src/app src/components
git commit -m "feat: show friendly category name on match lists"
```

---

### Task 14: Hardening — eventos solo con jugadores del plantel (recomendado)

**Files:**
- Modify: `src/app/api/matches/[id]/events/route.ts`
- Create/Modify test unitario de helper si se extrae

Hoy el POST de eventos FRIENDLY no verifica plantel. Con categorías, conviene cerrar el hueco:

- [ ] **Step 1: Tras validar body FRIENDLY**

```ts
if (data.friendlyPlayerId) {
  const participation = await db.friendlyMatchPlayer.findUnique({
    where: {
      matchId_friendlyPlayerId: {
        matchId,
        friendlyPlayerId: data.friendlyPlayerId,
      },
    },
  })
  if (!participation) {
    return NextResponse.json(
      { error: 'El jugador no está en el plantel de este partido' },
      { status: 400 }
    )
  }
  if (data.side && participation.side !== data.side) {
    return NextResponse.json(
      { error: 'El lado no coincide con la participación del jugador' },
      { status: 400 }
    )
  }
}

if (data.assistFriendlyPlayerId) {
  const assistPart = await db.friendlyMatchPlayer.findUnique({
    where: {
      matchId_friendlyPlayerId: {
        matchId,
        friendlyPlayerId: data.assistFriendlyPlayerId,
      },
    },
  })
  if (!assistPart) {
    return NextResponse.json(
      { error: 'El asistente no está en el plantel de este partido' },
      { status: 400 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/matches/[id]/events/route.ts
git commit -m "fix: require friendly event players to be on match roster"
```

---

### Task 15: Verificación final + handoff

- [ ] **Step 1: Suite completa**

```bash
npx vitest run
npx tsc --noEmit
```

Expected: all green

- [ ] **Step 2: Checklist manual local**

1. Crear categoría “Viernes”
2. Crear 4 jugadores en esa categoría
3. Intentar crear amistoso sin categoría → bloqueado
4. Crear amistoso en “Viernes” solo con esos jugadores → ok
5. Crear categoría “Sábados” + jugadores distintos; verificar que no aparecen en el form de Viernes
6. Registrar gol + asistencia en árbitro; ver live
7. Stats del jugador solo reflejan sus partidos (misma categoría)
8. Intentar borrar categoría con jugadores → error; desactivar ok
9. Datos legacy: jugadores/partidos previos aparecen bajo “Amistosos (histórico)”

- [ ] **Step 3: Actualizar `docs/handoff/SESSION-CONTEXT.md` (local)** con la feature y la migración `20260721120000_friendly_categories`

- [ ] **Step 4: Commit docs de spec si aún no están en el mismo branch**

```bash
git add docs/superpowers/specs/2026-07-21-categorias-amistosas-design.md docs/superpowers/plans/2026-07-21-categorias-amistosas.md
git commit -m "docs: friendly categories design and implementation plan"
```

---

## Self-Review

**1. Spec coverage**
| Requisito | Task |
|-----------|------|
| Modelo categoría | 5 |
| Jugador 1 categoría | 4, 5, 7, 10 |
| Partido exige categoría | 3, 8, 11 |
| No mezclar rosters | 2, 8, 11 |
| Backfill prod | 5 |
| Admin CRUD categorías | 6, 9 |
| Claim sin confusión | 12 |
| Live/árbitro sin romper | implícito (leen plantel); hardening 14 |
| Labels en listas | 13 |

**2. Placeholder scan:** sin TBD / “implement later” / “similar to Task N” sin código.

**3. Type consistency:** `friendlyCategoryId` en schemas, Prisma, API y forms; guards usan `{ id, friendlyCategoryId }`.

**Fuera de este plan (YAGNI):** mover jugador entre categorías, tabla de posiciones, editar plantel post-creación, fixtures automáticos.
