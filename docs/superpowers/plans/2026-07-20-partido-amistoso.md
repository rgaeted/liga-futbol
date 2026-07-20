# Partido Amistoso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar partidos amistosos con pool de jugadores (nombre/apellido), pago por jugador/partido, panel de árbitro y live público reutilizados, y reclamación opcional de perfil.

**Architecture:** Extender `Match` con `matchType` (`LEAGUE` | `FRIENDLY`). Los amistosos usan lados libres (`sideAName`/`sideBName`) y plantel vía `FriendlyMatchPlayer` (con `paid`). Pool reutilizable en `FriendlyPlayer`. Eventos de amistoso usan `friendlyPlayerId` + `side` sin tocar stats de liga. Helper `matchDisplayName` evita null crashes en listas/live.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL, Zod 4, Auth.js, Vitest, Socket.io (existente).

**Spec:** `docs/superpowers/specs/2026-07-20-partido-amistoso-design.md`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Enums `MatchType`/`FriendlySide`; modelos `FriendlyPlayer`/`FriendlyMatchPlayer`; Match/MatchEvent/User extendidos |
| `src/lib/match-label.ts` | CREAR — `matchDisplayName` / lados para UI |
| `src/lib/friendly-stats.ts` | CREAR — agregación goles/tarjetas amistosas |
| `src/lib/validations/friendly-player.ts` | CREAR — create/update/claim schemas |
| `src/lib/validations/match.ts` | MODIFICAR — union liga/amistoso + paid |
| `src/lib/validations/match-event.ts` | MODIFICAR — `friendlyPlayerId` + `side` |
| `src/lib/match-events.ts` | MODIFICAR — bifurcar por `matchType` |
| `src/app/api/friendly-players/route.ts` | CREAR — GET/POST pool |
| `src/app/api/friendly-players/[id]/route.ts` | CREAR — PUT/DELETE |
| `src/app/api/friendly-players/[id]/stats/route.ts` | CREAR — stats |
| `src/app/api/friendly-players/claim/route.ts` | CREAR — registro/reclamación |
| `src/app/api/matches/route.ts` | MODIFICAR — crear FRIENDLY + participaciones |
| `src/app/api/matches/[id]/route.ts` | MODIFICAR — includes amistoso |
| `src/app/api/matches/[id]/friendly-players/[participationId]/paid/route.ts` | CREAR — PATCH paid |
| `src/app/api/matches/[id]/events/route.ts` | MODIFICAR — include friendlyPlayer |
| `src/components/admin/FriendlyPlayerForm.tsx` | CREAR |
| `src/components/admin/FriendlyPlayersTable.tsx` | CREAR |
| `src/components/admin/FriendlyMatchForm.tsx` | CREAR — form amistoso |
| `src/components/admin/FriendlyPaidToggle.tsx` | CREAR |
| `src/components/admin/MatchForm.tsx` | MODIFICAR — selector tipo + `matchType: LEAGUE` |
| `src/app/(dashboard)/admin/friendly-players/page.tsx` | CREAR |
| `src/app/(dashboard)/admin/layout.tsx` | MODIFICAR — nav |
| `src/app/(dashboard)/admin/matches/page.tsx` | MODIFICAR — listar amistosos + paid |
| `src/components/referee/MatchControlPanel.tsx` | MODIFICAR — modo friendly |
| `src/app/(dashboard)/referee/match/[id]/page.tsx` | MODIFICAR — cargar plantel amistoso |
| `src/app/(dashboard)/referee/page.tsx` | MODIFICAR — labels |
| `src/components/live/LiveScoreboard.tsx` | MODIFICAR — lados + friendlyPlayer |
| `src/app/live/[matchId]/page.tsx` | MODIFICAR — includes |
| `src/app/page.tsx` | MODIFICAR — live amistosos en landing |
| `src/app/(auth)/register/page.tsx` | CREAR — reclamación |
| `tests/lib/validations-friendly.test.ts` | CREAR |
| `tests/lib/friendly-stats.test.ts` | CREAR |
| `tests/lib/match-label.test.ts` | CREAR |
| `tests/api/match-events.test.ts` | MODIFICAR |

---

### Task 1: Schema Prisma + migración

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Actualizar `prisma/schema.prisma`**

Agregar enums después de `EventType`:

```prisma
enum MatchType {
  LEAGUE
  FRIENDLY
}

enum FriendlySide {
  A
  B
}
```

En `User`, agregar:

```prisma
  friendlyPlayer FriendlyPlayer?
```

Reemplazar el modelo `Match` completo por:

```prisma
model Match {
  id           String      @id @default(cuid())
  matchType    MatchType   @default(LEAGUE)
  seasonId     String?
  season       Season?     @relation(fields: [seasonId], references: [id])
  homeTeamId   String?
  homeTeam     Team?       @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeamId   String?
  awayTeam     Team?       @relation("AwayTeam", fields: [awayTeamId], references: [id])
  sideAName    String?
  sideBName    String?
  refereeId    String?
  referee      User?       @relation("MatchReferee", fields: [refereeId], references: [id])
  scheduledAt  DateTime
  venue        String?
  status       MatchStatus @default(SCHEDULED)
  homeScore    Int         @default(0)
  awayScore    Int         @default(0)
  events       MatchEvent[]
  callUps      CallUp[]
  friendlyPlayers FriendlyMatchPlayer[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}
```

En `MatchEvent`, agregar campos y relación:

```prisma
  friendlyPlayerId String?
  friendlyPlayer   FriendlyPlayer? @relation(fields: [friendlyPlayerId], references: [id])
  side             FriendlySide?
```

Agregar al final del schema:

```prisma
model FriendlyPlayer {
  id             String                @id @default(cuid())
  firstName      String
  lastName       String
  userId         String?               @unique
  user           User?                 @relation(fields: [userId], references: [id])
  participations FriendlyMatchPlayer[]
  matchEvents    MatchEvent[]
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
}

model FriendlyMatchPlayer {
  id               String         @id @default(cuid())
  matchId          String
  match            Match          @relation(fields: [matchId], references: [id], onDelete: Cascade)
  friendlyPlayerId String
  friendlyPlayer   FriendlyPlayer @relation(fields: [friendlyPlayerId], references: [id])
  side             FriendlySide
  paid             Boolean        @default(false)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@unique([matchId, friendlyPlayerId])
}
```

- [ ] **Step 2: Generar y aplicar migración**

Run:

```bash
npx prisma migrate dev --name partido_amistoso
npx prisma generate
```

Expected: migración creada; client regenerado; `Match.matchType` default `LEAGUE` para filas existentes.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add friendly match models and matchType"
```

---

### Task 2: Helper `matchDisplayName` + tests

**Files:**
- Create: `src/lib/match-label.ts`
- Create: `tests/lib/match-label.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/lib/match-label.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'

describe('matchDisplayName', () => {
  it('uses team names for league matches', () => {
    expect(
      matchDisplayName({
        matchType: 'LEAGUE',
        sideAName: null,
        sideBName: null,
        homeTeam: { name: 'Norte' },
        awayTeam: { name: 'Sur' },
      })
    ).toBe('Norte vs Sur')
  })

  it('uses side names for friendly matches', () => {
    expect(
      matchDisplayName({
        matchType: 'FRIENDLY',
        sideAName: 'Blancos',
        sideBName: 'Negros',
        homeTeam: null,
        awayTeam: null,
      })
    ).toBe('Blancos vs Negros')
  })
})

describe('matchSideNames', () => {
  it('maps friendly sides to home/away labels', () => {
    expect(
      matchSideNames({
        matchType: 'FRIENDLY',
        sideAName: 'A',
        sideBName: 'B',
        homeTeam: null,
        awayTeam: null,
      })
    ).toEqual({ home: 'A', away: 'B' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/match-label.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper**

Create `src/lib/match-label.ts`:

```ts
import type { MatchType } from '@prisma/client'

type MatchLabelInput = {
  matchType: MatchType | 'LEAGUE' | 'FRIENDLY'
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string } | null
  awayTeam: { name: string } | null
}

export function matchSideNames(match: MatchLabelInput): { home: string; away: string } {
  if (match.matchType === 'FRIENDLY') {
    return {
      home: match.sideAName ?? 'Lado A',
      away: match.sideBName ?? 'Lado B',
    }
  }
  return {
    home: match.homeTeam?.name ?? 'Local',
    away: match.awayTeam?.name ?? 'Visitante',
  }
}

export function matchDisplayName(match: MatchLabelInput): string {
  const { home, away } = matchSideNames(match)
  return `${home} vs ${away}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/match-label.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-label.ts tests/lib/match-label.test.ts
git commit -m "feat: add matchDisplayName helper for league and friendly"
```

---

### Task 3: Validations FriendlyPlayer + Match (union) + paid

**Files:**
- Create: `src/lib/validations/friendly-player.ts`
- Modify: `src/lib/validations/match.ts`
- Create: `tests/lib/validations-friendly.test.ts`
- Modify: `tests/lib/validations.test.ts` (asegurar que liga sin `matchType` sigue pasando)

- [ ] **Step 1: Write failing tests**

Create `tests/lib/validations-friendly.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  createFriendlyPlayerSchema,
  claimFriendlyPlayerSchema,
} from '@/lib/validations/friendly-player'
import {
  createMatchSchema,
  updateFriendlyPaidSchema,
} from '@/lib/validations/match'

describe('friendly player validations', () => {
  it('accepts first and last name only', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Juan',
      lastName: 'Pérez',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional account fields together', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@demo.cl',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects email without password', () => {
    const result = createFriendlyPlayerSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@demo.cl',
    })
    expect(result.success).toBe(false)
  })

  it('claim requires email password and friendlyPlayerId', () => {
    const result = claimFriendlyPlayerSchema.safeParse({
      email: 'nuevo@demo.cl',
      password: 'password123',
      friendlyPlayerId: 'fp-1',
    })
    expect(result.success).toBe(true)
  })
})

describe('friendly match validations', () => {
  it('accepts friendly match with players on both sides', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [
        { friendlyPlayerId: 'fp-1', side: 'A' },
        { friendlyPlayerId: 'fp-2', side: 'B' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects friendly without a player on side B', () => {
    const result = createMatchSchema.safeParse({
      matchType: 'FRIENDLY',
      sideAName: 'Blancos',
      sideBName: 'Negros',
      scheduledAt: new Date().toISOString(),
      players: [{ friendlyPlayerId: 'fp-1', side: 'A' }],
    })
    expect(result.success).toBe(false)
  })

  it('still accepts league match without matchType (default LEAGUE)', () => {
    const result = createMatchSchema.safeParse({
      seasonId: 'demo-season-2026',
      homeTeamId: 'demo-team-norte',
      awayTeamId: 'demo-team-sur',
      scheduledAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matchType).toBe('LEAGUE')
    }
  })

  it('updateFriendlyPaidSchema accepts boolean', () => {
    expect(updateFriendlyPaidSchema.safeParse({ paid: true }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/validations-friendly.test.ts`

Expected: FAIL — modules/exports missing.

- [ ] **Step 3: Implement `src/lib/validations/friendly-player.ts`**

```ts
import { z } from 'zod'

const id = z.string().min(1)

export const createFriendlyPlayerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = data.email !== undefined
    const hasPassword = data.password !== undefined
    if (hasEmail !== hasPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Email y contraseña deben ir juntos',
        path: hasEmail ? ['password'] : ['email'],
      })
    }
  })

export const updateFriendlyPlayerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
})

export const claimFriendlyPlayerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  friendlyPlayerId: id,
})

export type CreateFriendlyPlayerInput = z.infer<typeof createFriendlyPlayerSchema>
export type UpdateFriendlyPlayerInput = z.infer<typeof updateFriendlyPlayerSchema>
export type ClaimFriendlyPlayerInput = z.infer<typeof claimFriendlyPlayerSchema>
```

- [ ] **Step 4: Replace `src/lib/validations/match.ts`**

```ts
import { z } from 'zod'

const id = z.string().min(1)

const friendlyPlayerEntry = z.object({
  friendlyPlayerId: id,
  side: z.enum(['A', 'B']),
})

export const createLeagueMatchSchema = z.object({
  matchType: z.literal('LEAGUE').default('LEAGUE'),
  seasonId: id,
  homeTeamId: id,
  awayTeamId: id,
  refereeId: id.optional(),
  scheduledAt: z.string().datetime(),
  venue: z.string().optional(),
})

export const createFriendlyMatchSchema = z
  .object({
    matchType: z.literal('FRIENDLY'),
    sideAName: z.string().min(1),
    sideBName: z.string().min(1),
    refereeId: id.optional(),
    scheduledAt: z.string().datetime(),
    venue: z.string().optional(),
    players: z.array(friendlyPlayerEntry).min(2),
  })
  .superRefine((data, ctx) => {
    const sides = new Set(data.players.map((p) => p.side))
    if (!sides.has('A') || !sides.has('B')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debe haber al menos un jugador por lado',
        path: ['players'],
      })
    }
    const ids = data.players.map((p) => p.friendlyPlayerId)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un jugador no puede estar dos veces en el mismo partido',
        path: ['players'],
      })
    }
  })

export const createMatchSchema = z.preprocess((raw) => {
  if (raw && typeof raw === 'object' && !('matchType' in (raw as object))) {
    return { ...(raw as object), matchType: 'LEAGUE' }
  }
  return raw
}, z.discriminatedUnion('matchType', [createLeagueMatchSchema, createFriendlyMatchSchema]))

export const updateMatchSchema = z.object({
  refereeId: id.nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  venue: z.string().nullable().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED']).optional(),
})

export const updateFriendlyPaidSchema = z.object({
  paid: z.boolean(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>
export type UpdateFriendlyPaidInput = z.infer<typeof updateFriendlyPaidSchema>
```

> Nota Zod 4: si `discriminatedUnion` + `.default` en el literal falla, quitar `.default('LEAGUE')` del schema de liga (el `preprocess` ya inyecta `matchType`).

- [ ] **Step 5: Run tests**

Run:

```bash
npx vitest run tests/lib/validations-friendly.test.ts tests/lib/validations.test.ts
```

Expected: PASS all.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/friendly-player.ts src/lib/validations/match.ts tests/lib/validations-friendly.test.ts
git commit -m "feat: add friendly player and friendly match validations"
```

---

### Task 4: API CRUD FriendlyPlayer

**Files:**
- Create: `src/app/api/friendly-players/route.ts`
- Create: `src/app/api/friendly-players/[id]/route.ts`

- [ ] **Step 1: Create list/create route**

`src/app/api/friendly-players/route.ts`:

```ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN])
  const players = await db.friendlyPlayer.findMany({
    include: { user: { select: { id: true, email: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createFriendlyPlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { firstName, lastName, email, password } = parsed.data

  const player = await db.$transaction(async (tx) => {
    let userId: string | undefined
    if (email && password) {
      const passwordHash = await bcrypt.hash(password, 10)
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: `${firstName} ${lastName}`,
          role: Role.PLAYER,
        },
      })
      await tx.player.create({
        data: { userId: user.id },
      })
      userId = user.id
    }

    return tx.friendlyPlayer.create({
      data: { firstName, lastName, userId },
      include: { user: { select: { id: true, email: true } } },
    })
  })

  return NextResponse.json(player, { status: 201 })
}
```

- [ ] **Step 2: Create update/delete route**

`src/app/api/friendly-players/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import { Role } from '@prisma/client'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateFriendlyPlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const player = await db.friendlyPlayer.update({
    where: { id },
    data: parsed.data,
    include: { user: { select: { id: true, email: true } } },
  })
  return NextResponse.json(player)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const participationCount = await db.friendlyMatchPlayer.count({
    where: { friendlyPlayerId: id },
  })
  if (participationCount > 0) {
    return NextResponse.json(
      {
        error: `El jugador tiene ${participationCount} participación(es) en amistosos. No se puede eliminar.`,
      },
      { status: 400 }
    )
  }

  await db.friendlyPlayer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Smoke manual**

Con servidor en marcha y sesión admin, `POST /api/friendly-players` con `{ "firstName":"Juan","lastName":"Pérez" }` → 201.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/friendly-players
git commit -m "feat(api): CRUD friendly players pool"
```

---

### Task 5: Admin UI — jugadores amistosos

**Files:**
- Create: `src/components/admin/FriendlyPlayerForm.tsx`
- Create: `src/components/admin/FriendlyPlayersTable.tsx`
- Create: `src/app/(dashboard)/admin/friendly-players/page.tsx`
- Modify: `src/app/(dashboard)/admin/layout.tsx`

- [ ] **Step 1: Form**

`src/components/admin/FriendlyPlayerForm.tsx` — mismo patrón que `PlayerForm` + `submitJson`:

- Campos: `firstName`, `lastName` (required)
- Opcionales: `email`, `password` (solo enviar ambos si email tiene valor)
- POST `/api/friendly-players`
- Textos ES-CL: “Nombre”, “Apellido”, “Email (opcional)”, “Contraseña (opcional)”, “Crear jugador amistoso”

- [ ] **Step 2: Table**

`src/components/admin/FriendlyPlayersTable.tsx`:

- Props: `{ id, firstName, lastName, email: string | null }[]`
- Inline edit nombre/apellido → PUT
- DeleteButton → DELETE `/api/friendly-players/[id]`
- Mostrar email o “Sin cuenta”

- [ ] **Step 3: Page + nav**

`src/app/(dashboard)/admin/friendly-players/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { FriendlyPlayerForm } from '@/components/admin/FriendlyPlayerForm'
import { FriendlyPlayersTable } from '@/components/admin/FriendlyPlayersTable'

export default async function AdminFriendlyPlayersPage() {
  const players = await db.friendlyPlayer.findMany({
    include: { user: { select: { email: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Jugadores amistosos</h1>
      <FriendlyPlayerForm />
      <FriendlyPlayersTable
        players={players.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.user?.email ?? null,
        }))}
      />
    </div>
  )
}
```

En `layout.tsx` `ADMIN_NAV`, agregar después de Jugadores:

```ts
{ href: '/admin/friendly-players', label: 'Jugadores amistosos' },
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/FriendlyPlayerForm.tsx src/components/admin/FriendlyPlayersTable.tsx src/app/(dashboard)/admin/friendly-players src/app/(dashboard)/admin/layout.tsx
git commit -m "feat(admin): UI for friendly players pool"
```

---

### Task 6: API crear amistoso + PATCH paid

**Files:**
- Modify: `src/app/api/matches/route.ts`
- Create: `src/app/api/matches/[id]/friendly-players/[participationId]/paid/route.ts`

- [ ] **Step 1: Extender POST `/api/matches`**

Reemplazar el body de `POST` para bifurcar:

```ts
export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  if (data.matchType === 'LEAGUE') {
    if (data.homeTeamId === data.awayTeamId) {
      return NextResponse.json({ error: 'Home and away team must differ' }, { status: 400 })
    }
    const match = await db.match.create({
      data: {
        matchType: 'LEAGUE',
        seasonId: data.seasonId,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        refereeId: data.refereeId,
        venue: data.venue,
        scheduledAt: new Date(data.scheduledAt),
      },
      include: { homeTeam: true, awayTeam: true },
    })
    return NextResponse.json(match, { status: 201 })
  }

  const match = await db.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        matchType: 'FRIENDLY',
        sideAName: data.sideAName,
        sideBName: data.sideBName,
        refereeId: data.refereeId,
        venue: data.venue,
        scheduledAt: new Date(data.scheduledAt),
      },
    })
    await tx.friendlyMatchPlayer.createMany({
      data: data.players.map((p) => ({
        matchId: created.id,
        friendlyPlayerId: p.friendlyPlayerId,
        side: p.side,
      })),
    })
    return tx.match.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        friendlyPlayers: { include: { friendlyPlayer: true } },
        referee: { select: { id: true, name: true } },
      },
    })
  })

  return NextResponse.json(match, { status: 201 })
}
```

También en `GET`, incluir `sideAName`, `sideBName`, `matchType` (ya vienen del model) y `friendlyPlayers` opcional no es necesario para listados generales.

- [ ] **Step 2: PATCH paid**

`src/app/api/matches/[id]/friendly-players/[participationId]/paid/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateFriendlyPaidSchema } from '@/lib/validations/match'
import { Role } from '@prisma/client'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; participationId: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id: matchId, participationId } = await params
  const parsed = updateFriendlyPaidSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const participation = await db.friendlyMatchPlayer.findFirst({
    where: { id: participationId, matchId },
  })
  if (!participation) {
    return NextResponse.json({ error: 'Participación no encontrada' }, { status: 404 })
  }

  const updated = await db.friendlyMatchPlayer.update({
    where: { id: participationId },
    data: { paid: parsed.data.paid },
    include: { friendlyPlayer: true },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/matches
git commit -m "feat(api): create friendly matches and toggle paid"
```

---

### Task 7: Admin UI — crear amistoso + marcar pago

**Files:**
- Create: `src/components/admin/FriendlyMatchForm.tsx`
- Create: `src/components/admin/FriendlyPaidToggle.tsx`
- Modify: `src/components/admin/MatchForm.tsx` — enviar `matchType: 'LEAGUE'`
- Modify: `src/app/(dashboard)/admin/matches/page.tsx`

- [ ] **Step 1: `MatchForm` envía `matchType: 'LEAGUE'`**

En el body de `submitJson`, agregar `matchType: 'LEAGUE'`.

- [ ] **Step 2: `FriendlyMatchForm`**

Client component props: `referees`, `friendlyPlayers: { id, firstName, lastName }[]`.

UI:
- Inputs `sideAName`, `sideBName`
- Dos multi-select o checklists (lado A / lado B) sobre el pool
- Árbitro, fecha, hora, cancha
- POST `/api/matches` con:

```ts
{
  matchType: 'FRIENDLY',
  sideAName,
  sideBName,
  refereeId: refereeId || undefined,
  venue: venue || undefined,
  scheduledAt: new Date(`${date}T${time}`).toISOString(),
  players: [
    ...sideAIds.map((id) => ({ friendlyPlayerId: id, side: 'A' })),
    ...sideBIds.map((id) => ({ friendlyPlayerId: id, side: 'B' })),
  ],
}
```

Validación client: al menos 1 por lado; no permitir el mismo id en ambos lados.

- [ ] **Step 3: `FriendlyPaidToggle`**

```tsx
'use client'
// props: matchId, participationId, initialPaid, playerLabel
// PATCH /api/matches/${matchId}/friendly-players/${participationId}/paid
// UI: checkbox o botón "Pagó" / "No pagó" en español
```

- [ ] **Step 4: Actualizar `admin/matches/page.tsx`**

- Cargar también `friendlyPlayers` pool + en matches include `friendlyPlayers: { include: { friendlyPlayer: true } }`
- Mostrar `MatchForm` (liga) y debajo `FriendlyMatchForm`
- En la lista: usar `matchDisplayName(match)`; si `FRIENDLY`, badge “Amistoso” y lista de participantes con `FriendlyPaidToggle`; season line: si no hay season, mostrar “Amistoso”

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/FriendlyMatchForm.tsx src/components/admin/FriendlyPaidToggle.tsx src/components/admin/MatchForm.tsx src/app/(dashboard)/admin/matches/page.tsx
git commit -m "feat(admin): create friendly matches and paid toggles"
```

---

### Task 8: Eventos amistosos — validation + `registerMatchEvent`

**Files:**
- Modify: `src/lib/validations/match-event.ts`
- Modify: `src/lib/match-events.ts`
- Modify: `tests/api/match-events.test.ts`

- [ ] **Step 1: Extend failing tests in `tests/api/match-events.test.ts`**

```ts
it('accepts friendly goal with friendlyPlayerId and side', () => {
  const result = createMatchEventSchema.safeParse({
    type: EventType.GOAL,
    minute: 12,
    friendlyPlayerId: 'fp-1',
    side: 'A',
  })
  expect(result.success).toBe(true)
})

it('accepts kickoff without player fields', () => {
  const result = createMatchEventSchema.safeParse({
    type: EventType.KICKOFF,
    minute: 0,
  })
  expect(result.success).toBe(true)
})
```

- [ ] **Step 2: Update `createMatchEventSchema`**

```ts
import { z } from 'zod'
import { EventType } from '@prisma/client'

const id = z.string().min(1)

export const createMatchEventSchema = z.object({
  type: z.nativeEnum(EventType),
  minute: z.number().int().min(0).max(130),
  playerId: id.optional(),
  teamId: id.optional(),
  friendlyPlayerId: id.optional(),
  side: z.enum(['A', 'B']).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>
```

- [ ] **Step 3: Bifurcar `registerMatchEvent`**

Lógica clave a implementar en `src/lib/match-events.ts`:

1. Cargar match con `matchType`.
2. Crear evento con los campos del input (incluye `friendlyPlayerId`, `side`).
3. Scoring:
   - LEAGUE: igual que hoy con `teamId` vs `homeTeamId`/`awayTeamId`.
   - FRIENDLY + GOAL: `side === 'A'` → `homeScore++`; `side === 'B'` → `awayScore++`.
   - FRIENDLY + OWN_GOAL: suma al lado contrario.
4. Status KICKOFF/HALFTIME/FULLTIME: igual.
5. Stats jugador liga: **solo** si `matchType === 'LEAGUE'` y hay `playerId` (código actual).
6. Amistoso: **no** incrementar `Player.*`.
7. `emitMatchUpdate` igual; el payload `event` debe poder incluir `friendlyPlayer` si se hace include al crear (opcional: re-fetch event con include).

Validación runtime antes de crear (devolver throw o dejar que la API valide):

- Si FRIENDLY y tipo necesita jugador → exigir `friendlyPlayerId` + `side`.
- Si LEAGUE → no aceptar `friendlyPlayerId`.

Preferible validar en la route de events leyendo el match, o al inicio de `registerMatchEvent` lanzando Error con mensaje claro.

Ejemplo scoring friendly:

```ts
if (match.matchType === 'FRIENDLY') {
  if (input.type === EventType.GOAL && input.side) {
    if (input.side === 'A') homeScore += 1
    if (input.side === 'B') awayScore += 1
  }
  if (input.type === EventType.OWN_GOAL && input.side) {
    if (input.side === 'A') awayScore += 1
    if (input.side === 'B') homeScore += 1
  }
} else {
  // existing teamId logic
}
```

Y envolver el bloque de `db.player.update` con `if (match.matchType === 'LEAGUE' && input.playerId)`.

- [ ] **Step 4: Update GET events include**

En `src/app/api/matches/[id]/events/route.ts` GET include:

```ts
include: {
  player: { include: { user: { select: { name: true } } } },
  friendlyPlayer: { select: { firstName: true, lastName: true } },
},
```

En POST, después de parsear, si el match es FRIENDLY y el tipo necesita jugador, rechazar 400 si faltan `friendlyPlayerId`/`side`; si es LEAGUE y viene `friendlyPlayerId`, 400.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/api/match-events.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/match-event.ts src/lib/match-events.ts src/app/api/matches/[id]/events/route.ts tests/api/match-events.test.ts
git commit -m "feat: register friendly match events without league stats"
```

---

### Task 9: Panel árbitro + lista para amistosos

**Files:**
- Modify: `src/components/referee/MatchControlPanel.tsx`
- Modify: `src/app/(dashboard)/referee/match/[id]/page.tsx`
- Modify: `src/app/(dashboard)/referee/page.tsx`

- [ ] **Step 1: Extender props de `MatchControlPanel`**

Soportar dos modos vía props opcionales:

```ts
type SideRoster = {
  id: string // 'A' | 'B' o team id
  name: string
  players: Array<{ id: string; label: string }>
}

type Props = {
  matchId: string
  matchType: 'LEAGUE' | 'FRIENDLY'
  homeTeam: SideRoster
  awayTeam: SideRoster
  initialHomeScore: number
  initialAwayScore: number
  initialStatus: string
}
```

En `submitEvent`:
- LEAGUE: body `{ type, minute, playerId, teamId: activeTeam.id }` (como hoy; mapear `label` desde `user.name` en la page).
- FRIENDLY: body `{ type, minute, friendlyPlayerId: selectedPlayer, side: selectedTeam === 'home' ? 'A' : 'B' }` (sin teamId/playerId).

Mostrar `player.label` en el select.

- [ ] **Step 2: Referee match page**

```tsx
if (match.matchType === 'FRIENDLY') {
  const participations = await db.friendlyMatchPlayer.findMany({
    where: { matchId: match.id },
    include: { friendlyPlayer: true },
  })
  const sideA = participations.filter((p) => p.side === 'A')
  const sideB = participations.filter((p) => p.side === 'B')
  return (
    <MatchControlPanel
      matchId={match.id}
      matchType="FRIENDLY"
      homeTeam={{
        id: 'A',
        name: match.sideAName ?? 'Lado A',
        players: sideA.map((p) => ({
          id: p.friendlyPlayerId,
          label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`,
        })),
      }}
      awayTeam={{
        id: 'B',
        name: match.sideBName ?? 'Lado B',
        players: sideB.map((p) => ({
          id: p.friendlyPlayerId,
          label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`,
        })),
      }}
      ...
    />
  )
}
// else existing league path, mapping players to { id, label: user.name }
```

Importante: no llamar `getTeamPlayers` con `homeTeamId` null.

- [ ] **Step 3: Referee list**

Include `matchType`, `sideAName`, `sideBName`; render `matchDisplayName(match)`.

- [ ] **Step 4: Commit**

```bash
git add src/components/referee/MatchControlPanel.tsx src/app/(dashboard)/referee
git commit -m "feat(referee): control panel for friendly match rosters"
```

---

### Task 10: Live scoreboard + landing

**Files:**
- Modify: `src/components/live/LiveScoreboard.tsx`
- Modify: `src/app/live/[matchId]/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Live page includes**

```ts
include: {
  homeTeam: true,
  awayTeam: true,
  events: {
    include: {
      player: { include: { user: { select: { name: true } } } },
      friendlyPlayer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { minute: 'asc' },
  },
},
```

Pasar a LiveScoreboard un shape normalizado:

```ts
const sides = matchSideNames(match)
<LiveScoreboard
  initialMatch={{
    id: match.id,
    homeTeam: { name: sides.home },
    awayTeam: { name: sides.away },
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    events: match.events.map((e) => ({
      id: e.id,
      type: e.type,
      minute: e.minute,
      playerName:
        e.friendlyPlayer
          ? `${e.friendlyPlayer.firstName} ${e.friendlyPlayer.lastName}`
          : e.player?.user.name ?? null,
    })),
  }}
/>
```

- [ ] **Step 2: Simplificar `LiveScoreboard` types**

Usar `playerName: string | null` en eventos (en vez de nested `player.user.name`). En socket update, si el event trae friendlyPlayer o player, derivar `playerName` al append (o aceptar que el live refetch no es perfecto hasta próximo reload — mínimo viable: incluir en `emitMatchUpdate` el event con includes).

Mejora mínima en `registerMatchEvent`: al crear, hacer `include: { player: { include: { user: true } }, friendlyPlayer: true }` y emitir ese event.

- [ ] **Step 3: Landing `src/app/page.tsx`**

```ts
include: {
  homeTeam: { select: { name: true } },
  awayTeam: { select: { name: true } },
  season: { select: { name: true } },
},
// map:
const sides = matchSideNames(match)
({
  id: match.id,
  homeTeam: sides.home,
  awayTeam: sides.away,
  ...
  seasonName: match.season?.name ?? 'Amistoso',
})
```

- [ ] **Step 4: Commit**

```bash
git add src/components/live/LiveScoreboard.tsx src/app/live src/app/page.tsx src/lib/match-events.ts
git commit -m "feat(live): show friendly sides and player names"
```

---

### Task 11: Stats amistosas

**Files:**
- Create: `src/lib/friendly-stats.ts`
- Create: `tests/lib/friendly-stats.test.ts`
- Create: `src/app/api/friendly-players/[id]/stats/route.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { aggregateFriendlyEvents } from '@/lib/friendly-stats'
import { EventType } from '@prisma/client'

describe('aggregateFriendlyEvents', () => {
  it('counts goals and cards', () => {
    const stats = aggregateFriendlyEvents([
      { type: EventType.GOAL },
      { type: EventType.GOAL },
      { type: EventType.YELLOW_CARD },
      { type: EventType.RED_CARD },
      { type: EventType.SHOT_ON_TARGET },
    ])
    expect(stats).toEqual({
      goals: 2,
      yellowCards: 1,
      redCards: 1,
    })
  })
})
```

- [ ] **Step 2: Implement**

```ts
import { EventType } from '@prisma/client'

export function aggregateFriendlyEvents(
  events: Array<{ type: EventType | string }>
) {
  return {
    goals: events.filter((e) => e.type === EventType.GOAL).length,
    yellowCards: events.filter((e) => e.type === EventType.YELLOW_CARD).length,
    redCards: events.filter((e) => e.type === EventType.RED_CARD).length,
  }
}
```

- [ ] **Step 3: API stats**

`GET /api/friendly-players/[id]/stats`:

- `requireRole([ADMIN])` **o** sesión cuyo `user.id` === `friendlyPlayer.userId`
- Query events where `friendlyPlayerId = id` and `match.matchType = FRIENDLY`
- Return `aggregateFriendlyEvents(events)`

- [ ] **Step 4: Run tests + commit**

```bash
npx vitest run tests/lib/friendly-stats.test.ts
git add src/lib/friendly-stats.ts tests/lib/friendly-stats.test.ts src/app/api/friendly-players/[id]/stats
git commit -m "feat: aggregate separate friendly player stats"
```

---

### Task 12: Registro / reclamación de perfil

**Files:**
- Create: `src/app/api/friendly-players/claim/route.ts`
- Create: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx` — link “Regístrate” → `/register` (si no existe)

- [ ] **Step 1: Claim API (público)**

```ts
// POST /api/friendly-players/claim
// parse claimFriendlyPlayerSchema
// find FriendlyPlayer by id; if !found → 404; if userId → 409
// if email taken → 400
// transaction: User PLAYER + Player (no team) + friendlyPlayer.userId = user.id
// return { ok: true }
```

No requiere sesión (es el alta).

- [ ] **Step 2: Register page**

Server component carga perfiles libres:

```ts
const available = await db.friendlyPlayer.findMany({
  where: { userId: null },
  orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
})
```

Client form: email, password, select `friendlyPlayerId` (label `Apellido, Nombre`), submit POST claim, luego `signIn('credentials', ...)` o redirect a `/login` con mensaje “Cuenta creada, ingresa”.

Textos ES-CL: “Crear cuenta”, “Elige tu perfil”, “Ya tienes cuenta? Ingresa”.

- [ ] **Step 3: Link desde login**

Agregar enlace a `/register` en la página de login.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/friendly-players/claim src/app/(auth)/register src/app/(auth)/login/page.tsx
git commit -m "feat: claim friendly player profile on registration"
```

---

### Task 13: Hardening — listas que asumen `homeTeam`

**Files (auditar y fijar con `matchDisplayName` / `matchSideNames`):**
- `src/app/(dashboard)/coach/page.tsx` — filtrar solo LEAGUE o proteger null (coach no opera amistosos: **filtrar `matchType: 'LEAGUE'`** en queries de coach/player callups)
- `src/app/(dashboard)/player/page.tsx` / `matches/page.tsx` — igual, solo liga vía callups (amistosos no usan CallUp; sin cambio funcional si queries son por callUp)
- `src/app/(dashboard)/coach/callups/[matchId]/page.tsx` — si alguien abre id amistoso, `notFound` o redirect
- Cualquier `match.homeTeam.name` restante en admin (ya cubierto en Task 7)

- [ ] **Step 1: Grep**

```bash
rg "homeTeam\.name" src
```

Fix cada hit que pueda recibir FRIENDLY.

- [ ] **Step 2: Coach queries**

Donde se listen partidos para coach, agregar `where: { matchType: 'LEAGUE', ... }` para no mostrar amistosos sin equipos.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
npx tsc --noEmit
```

Expected: tests PASS; TypeScript sin errores en archivos tocados (nullable relations).

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "fix: harden match lists for nullable teams on friendlies"
```

---

### Task 14: Verificación manual end-to-end

- [ ] **Step 1: Checklist manual**

1. Admin crea 4 jugadores amistosos (2 sin cuenta).
2. Admin crea amistoso Blancos vs Negros con planteles y árbitro.
3. Admin marca 2 jugadores como Pagó.
4. Árbitro abre el partido, inicia, gol lado A, amarilla lado B.
5. `/live/[id]` muestra lados, marcador y nombres.
6. Stats liga de un `Player` de equipo **no** cambian.
7. `GET .../friendly-players/[id]/stats` refleja goles/tarjetas.
8. Usuario reclama perfil libre en `/register` e inicia sesión.
9. Crear partido de liga sigue funcionando.

- [ ] **Step 2: Final commit if polish needed**

Solo si hubo fixes durante el checklist.

---

## Self-Review

**Spec coverage:**
| Spec requirement | Task |
|------------------|------|
| Pool FriendlyPlayer | 1, 4, 5 |
| Match FRIENDLY + lados | 1, 3, 6, 7 |
| paid por participación | 3, 6, 7 |
| Árbitro eventos | 8, 9 |
| Live público | 10 |
| Stats separadas | 8, 11 |
| Claim/registro | 12 |
| Liga sin regresión | 3, 13, 14 |

**Placeholders:** ninguno intencional; FriendlyMatchForm/PaidToggle descritos por contrato de API y patrón `submitJson` existente (copiar de `MatchForm`/`PlayerForm`).

**Type consistency:** `side: 'A' | 'B'`, `matchType: 'LEAGUE' | 'FRIENDLY'`, `homeScore`=lado A / `awayScore`=lado B en todos los tasks.
