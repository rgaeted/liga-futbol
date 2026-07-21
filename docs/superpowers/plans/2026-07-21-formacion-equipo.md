# Formación de Equipo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir definir esquema táctico + slots en cancha (titulares) y banco para cada lado de cualquier partido (liga y amistoso), y mostrarlos en live.

**Architecture:** Catálogo de esquemas en código (`src/lib/formations.ts`). Persistencia: modelo `MatchFormation` (scheme por lado/equipo) + `slotKey`/`isStarter` en `CallUp` y `FriendlyMatchPlayer`. Editor compartido `FormationPitch`. Coach (liga) y admin (amistoso) escriben vía `PUT /api/matches/[id]/formations`. Live lee formaciones públicas. Se corrige el bug de callups que borra ambos equipos.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL, Zod, Vitest, Auth.js.

**Spec:** `docs/superpowers/specs/2026-07-21-formacion-equipo-design.md`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `src/lib/formations.ts` | CREAR — esquemas, slots, helpers de validación |
| `tests/lib/formations.test.ts` | CREAR |
| `prisma/schema.prisma` | `MatchFormation`; `CallUp.slotKey`; `FriendlyMatchPlayer.isStarter` + `slotKey` |
| `prisma/migrations/20260721140000_match_formations/` | Migración |
| `src/lib/validations/formation.ts` | CREAR — Zod PUT body |
| `tests/lib/validations-formation.test.ts` | CREAR |
| `src/app/api/matches/[id]/formations/route.ts` | CREAR — GET público / PUT coach\|admin |
| `src/app/api/callups/route.ts` | MODIFICAR — borrar solo callups del equipo del coach |
| `src/components/lineup/FormationPitch.tsx` | CREAR — cancha + slots + selector |
| `src/components/lineup/FormationEditor.tsx` | CREAR — scheme select + pitch + bench |
| `src/components/coach/CallUpForm.tsx` | MODIFICAR — integrar editor de formación |
| `src/app/(dashboard)/coach/callups/[matchId]/page.tsx` | MODIFICAR — cargar formación existente |
| `src/app/(dashboard)/admin/matches/[id]/lineup/page.tsx` | CREAR |
| `src/components/admin/FriendlyLineupEditor.tsx` | CREAR |
| `src/components/admin/LeagueLineupEditor.tsx` | CREAR — editor admin por teamId |
| `src/app/(dashboard)/admin/matches/page.tsx` | MODIFICAR — link “Formación” |
| `src/components/live/LiveScoreboard.tsx` | MODIFICAR — sección formaciones |
| `src/app/live/[matchId]/page.tsx` | MODIFICAR — include formaciones |
| `src/lib/match-lineup.ts` | CREAR — serialize lineup for live/API |
| `tests/lib/match-lineup.test.ts` | CREAR |

---

### Task 1: Catálogo de formaciones (TDD)

**Files:**
- Create: `src/lib/formations.ts`
- Create: `tests/lib/formations.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  FORMATION_SCHEMES,
  getFormationSlots,
  isValidSlotKey,
  assertUniqueSlotAssignments,
} from '@/lib/formations'

describe('formations catalog', () => {
  it('includes 4-3-3', () => {
    expect(FORMATION_SCHEMES).toContain('4-3-3')
  })

  it('4-3-3 has 11 slots including GK', () => {
    const slots = getFormationSlots('4-3-3')
    expect(slots).toHaveLength(11)
    expect(slots[0].key).toBe('GK')
    expect(slots.every((s) => typeof s.row === 'number' && typeof s.col === 'number')).toBe(true)
  })

  it('rejects unknown scheme slot keys', () => {
    expect(isValidSlotKey('4-3-3', 'GK')).toBe(true)
    expect(isValidSlotKey('4-3-3', 'NOPE')).toBe(false)
  })

  it('detects duplicate slot assignments', () => {
    const result = assertUniqueSlotAssignments([
      { slotKey: 'GK', playerId: 'p1' },
      { slotKey: 'GK', playerId: 'p2' },
    ])
    expect(result.ok).toBe(false)
  })

  it('accepts unique slot assignments', () => {
    const result = assertUniqueSlotAssignments([
      { slotKey: 'GK', playerId: 'p1' },
      { slotKey: 'ST', playerId: 'p2' },
    ])
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/formations.test.ts`

Expected: FAIL — cannot find module `@/lib/formations`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/formations.ts
export const FORMATION_SCHEMES = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'] as const
export type FormationScheme = (typeof FORMATION_SCHEMES)[number]

export type FormationSlot = {
  key: string
  label: string
  /** 0 = goalkeeper row (bottom), higher = more attacking */
  row: number
  /** 0..1 horizontal position */
  col: number
}

const SCHEME_SLOTS: Record<FormationScheme, FormationSlot[]> = {
  '4-4-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LB', label: 'LI', row: 1, col: 0.12 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'RB', label: 'LD', row: 1, col: 0.88 },
    { key: 'LM', label: 'MI', row: 2, col: 0.12 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.35 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.65 },
    { key: 'RM', label: 'MD', row: 2, col: 0.88 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '4-3-3': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LB', label: 'LI', row: 1, col: 0.12 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'RB', label: 'LD', row: 1, col: 0.88 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.25 },
    { key: 'CM', label: 'MCD', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.75 },
    { key: 'LW', label: 'EI', row: 3, col: 0.15 },
    { key: 'ST', label: 'DC', row: 3, col: 0.5 },
    { key: 'RW', label: 'ED', row: 3, col: 0.85 },
  ],
  '3-5-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.25 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.75 },
    { key: 'LWB', label: 'CI', row: 2, col: 0.08 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.3 },
    { key: 'CM', label: 'MCD', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.7 },
    { key: 'RWB', label: 'CD', row: 2, col: 0.92 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
  '4-2-3-1': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LB', label: 'LI', row: 1, col: 0.12 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.35 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.65 },
    { key: 'RB', label: 'LD', row: 1, col: 0.88 },
    { key: 'CDM_L', label: 'MCD', row: 2, col: 0.35 },
    { key: 'CDM_R', label: 'MCD', row: 2, col: 0.65 },
    { key: 'LAM', label: 'EI', row: 3, col: 0.15 },
    { key: 'CAM', label: 'MP', row: 3, col: 0.5 },
    { key: 'RAM', label: 'ED', row: 3, col: 0.85 },
    { key: 'ST', label: 'DC', row: 4, col: 0.5 },
  ],
  '5-3-2': [
    { key: 'GK', label: 'Arquero', row: 0, col: 0.5 },
    { key: 'LWB', label: 'CI', row: 1, col: 0.08 },
    { key: 'CB_L', label: 'DFC', row: 1, col: 0.28 },
    { key: 'CB', label: 'DFC', row: 1, col: 0.5 },
    { key: 'CB_R', label: 'DFC', row: 1, col: 0.72 },
    { key: 'RWB', label: 'CD', row: 1, col: 0.92 },
    { key: 'CM_L', label: 'MC', row: 2, col: 0.25 },
    { key: 'CM', label: 'MC', row: 2, col: 0.5 },
    { key: 'CM_R', label: 'MC', row: 2, col: 0.75 },
    { key: 'ST_L', label: 'DC', row: 3, col: 0.35 },
    { key: 'ST_R', label: 'DC', row: 3, col: 0.65 },
  ],
}

export function getFormationSlots(scheme: string): FormationSlot[] {
  if (!(scheme in SCHEME_SLOTS)) return []
  return SCHEME_SLOTS[scheme as FormationScheme]
}

export function isValidScheme(scheme: string): scheme is FormationScheme {
  return (FORMATION_SCHEMES as readonly string[]).includes(scheme)
}

export function isValidSlotKey(scheme: string, slotKey: string): boolean {
  return getFormationSlots(scheme).some((s) => s.key === slotKey)
}

export function assertUniqueSlotAssignments(
  slots: Array<{ slotKey: string; playerId: string }>
): { ok: true } | { ok: false; duplicateSlotKeys: string[] } {
  const seen = new Map<string, string>()
  const duplicateSlotKeys: string[] = []
  for (const s of slots) {
    if (seen.has(s.slotKey)) duplicateSlotKeys.push(s.slotKey)
    else seen.set(s.slotKey, s.playerId)
  }
  if (duplicateSlotKeys.length > 0) return { ok: false, duplicateSlotKeys }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/formations.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/formations.ts tests/lib/formations.test.ts
git commit -m "feat: add formation schemes and slot catalog"
```

---

### Task 2: Validación Zod del body de formación (TDD)

**Files:**
- Create: `src/lib/validations/formation.ts`
- Create: `tests/lib/validations-formation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { upsertMatchFormationSchema } from '@/lib/validations/formation'

describe('upsertMatchFormationSchema', () => {
  it('accepts league payload', () => {
    const result = upsertMatchFormationSchema.safeParse({
      teamId: 'team-1',
      scheme: '4-3-3',
      slots: [{ slotKey: 'GK', playerId: 'p1' }],
      benchPlayerIds: ['p2'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts friendly payload', () => {
    const result = upsertMatchFormationSchema.safeParse({
      side: 'A',
      scheme: '4-4-2',
      slots: [{ slotKey: 'GK', friendlyPlayerId: 'fp1' }],
      benchFriendlyPlayerIds: ['fp2'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty scheme', () => {
    const result = upsertMatchFormationSchema.safeParse({
      teamId: 'team-1',
      scheme: '',
      slots: [],
      benchPlayerIds: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects payload with neither teamId nor side', () => {
    const result = upsertMatchFormationSchema.safeParse({
      scheme: '4-3-3',
      slots: [],
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (module missing)

- [ ] **Step 3: Implement schema**

```ts
// src/lib/validations/formation.ts
import { z } from 'zod'
import { FORMATION_SCHEMES } from '@/lib/formations'

const id = z.string().min(1)

const leagueSlot = z.object({
  slotKey: z.string().min(1),
  playerId: id,
})

const friendlySlot = z.object({
  slotKey: z.string().min(1),
  friendlyPlayerId: id,
})

export const upsertMatchFormationSchema = z
  .object({
    scheme: z.enum(FORMATION_SCHEMES),
    teamId: id.optional(),
    side: z.enum(['A', 'B']).optional(),
    slots: z.array(z.union([leagueSlot, friendlySlot])).default([]),
    benchPlayerIds: z.array(id).optional(),
    benchFriendlyPlayerIds: z.array(id).optional(),
  })
  .superRefine((data, ctx) => {
    const hasTeam = Boolean(data.teamId)
    const hasSide = Boolean(data.side)
    if (hasTeam === hasSide) {
      ctx.addIssue({
        code: 'custom',
        message: 'Debes indicar teamId (liga) o side (amistoso), no ambos ni ninguno',
        path: hasTeam ? ['side'] : ['teamId'],
      })
    }
  })

export type UpsertMatchFormationInput = z.infer<typeof upsertMatchFormationSchema>
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/formation.ts tests/lib/validations-formation.test.ts
git commit -m "feat: add match formation zod schema"
```

---

### Task 3: Helpers de serialización lineup (TDD)

**Files:**
- Create: `src/lib/match-lineup.ts`
- Create: `tests/lib/match-lineup.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildLineupView } from '@/lib/match-lineup'

describe('buildLineupView', () => {
  it('maps slots to players and leaves empty slots', () => {
    const view = buildLineupView({
      scheme: '4-3-3',
      assignments: [{ slotKey: 'GK', playerId: 'p1', playerName: 'Arquero Uno' }],
      bench: [{ playerId: 'p2', playerName: 'Suplente' }],
    })
    expect(view.scheme).toBe('4-3-3')
    expect(view.pitch.find((s) => s.slotKey === 'GK')?.playerName).toBe('Arquero Uno')
    expect(view.pitch.find((s) => s.slotKey === 'ST')?.playerName).toBeNull()
    expect(view.bench).toEqual([{ playerId: 'p2', playerName: 'Suplente' }])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/match-lineup.ts
import { getFormationSlots } from '@/lib/formations'

export type LineupAssignment = {
  slotKey: string
  playerId: string
  playerName: string
}

export type LineupBenchPlayer = {
  playerId: string
  playerName: string
}

export type LineupView = {
  scheme: string
  pitch: Array<{
    slotKey: string
    label: string
    row: number
    col: number
    playerId: string | null
    playerName: string | null
  }>
  bench: LineupBenchPlayer[]
}

export function buildLineupView(input: {
  scheme: string
  assignments: LineupAssignment[]
  bench: LineupBenchPlayer[]
}): LineupView {
  const bySlot = new Map(input.assignments.map((a) => [a.slotKey, a]))
  const pitch = getFormationSlots(input.scheme).map((slot) => {
    const a = bySlot.get(slot.key)
    return {
      slotKey: slot.key,
      label: slot.label,
      row: slot.row,
      col: slot.col,
      playerId: a?.playerId ?? null,
      playerName: a?.playerName ?? null,
    }
  })
  return { scheme: input.scheme, pitch, bench: input.bench }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-lineup.ts tests/lib/match-lineup.test.ts
git commit -m "feat: add lineup view builder for formations"
```

---

### Task 4: Schema Prisma + migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260721140000_match_formations/migration.sql`

- [ ] **Step 1: Update schema**

En `Match`, agregar:

```prisma
  formations MatchFormation[]
```

Agregar modelo:

```prisma
model MatchFormation {
  id        String        @id @default(cuid())
  matchId   String
  match     Match         @relation(fields: [matchId], references: [id], onDelete: Cascade)
  teamId    String?
  side      FriendlySide?
  scheme    String
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@unique([matchId, teamId])
  @@unique([matchId, side])
}
```

En `CallUp`:

```prisma
  slotKey   String?
```

En `FriendlyMatchPlayer`:

```prisma
  isStarter Boolean @default(false)
  slotKey   String?
```

- [ ] **Step 2: Migration SQL**

```sql
-- CreateTable
CREATE TABLE "MatchFormation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT,
    "side" "FriendlySide",
    "scheme" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchFormation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchFormation_matchId_teamId_key" ON "MatchFormation"("matchId", "teamId");
CREATE UNIQUE INDEX "MatchFormation_matchId_side_key" ON "MatchFormation"("matchId", "side");

ALTER TABLE "MatchFormation" ADD CONSTRAINT "MatchFormation_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallUp" ADD COLUMN "slotKey" TEXT;

ALTER TABLE "FriendlyMatchPlayer" ADD COLUMN "isStarter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FriendlyMatchPlayer" ADD COLUMN "slotKey" TEXT;
```

- [ ] **Step 3: Generate + deploy local**

```bash
npx prisma generate
npx prisma migrate deploy
```

Expected: success

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260721140000_match_formations/
git commit -m "feat: add MatchFormation and lineup slot fields"
```

---

### Task 5: Fix callups scoped por equipo + slotKey

**Files:**
- Modify: `src/app/api/callups/route.ts`

- [ ] **Step 1: Update POST para no borrar al rival**

Reemplazar el wipe global. Lógica:

```ts
  const { matchId, playerIds, starters, slots } = parsed.data
  // slots?: Array<{ playerId: string, slotKey: string }> — agregar al schema zod opcional

  let teamIdFilter: string | undefined
  if (session.user.role === Role.COACH) {
    const team = await db.team.findUnique({ where: { coachId: session.user.id } })
    if (!team) {
      return NextResponse.json({ error: 'No tienes equipo asignado' }, { status: 403 })
    }
    teamIdFilter = team.id
    const teamPlayers = await db.player.findMany({
      where: { teamId: team.id, id: { in: playerIds } },
    })
    if (teamPlayers.length !== playerIds.length) {
      return NextResponse.json({ error: 'Jugadores inválidos para tu equipo' }, { status: 403 })
    }
  }

  await db.$transaction(async (tx) => {
    await tx.callUp.deleteMany({
      where: {
        matchId,
        ...(teamIdFilter
          ? { player: { teamId: teamIdFilter } }
          : { playerId: { in: playerIds } }),
      },
    })

    const slotByPlayer = new Map(
      (slots ?? []).map((s: { playerId: string; slotKey: string }) => [s.playerId, s.slotKey])
    )

    for (const playerId of playerIds) {
      const slotKey = slotByPlayer.get(playerId) ?? null
      await tx.callUp.create({
        data: {
          matchId,
          playerId,
          isStarter: starters.includes(playerId) || Boolean(slotKey),
          slotKey,
        },
      })
    }
  })
```

Actualizar `callUpSchema`:

```ts
const callUpSchema = z.object({
  matchId: z.string().min(1),
  playerIds: z.array(z.string().min(1)).min(7).max(23),
  starters: z.array(z.string().min(1)),
  slots: z
    .array(z.object({ playerId: z.string().min(1), slotKey: z.string().min(1) }))
    .optional(),
})
```

Nota: preferir `z.string().min(1)` sobre `.cuid()` si los ids demo no son cuid estrictos (ya hay ids tipo `demo-…` en seeds).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/callups/route.ts
git commit -m "fix: scope callup replace to coach team and store slotKey"
```

---

### Task 6: API GET/PUT formaciones

**Files:**
- Create: `src/app/api/matches/[id]/formations/route.ts`

- [ ] **Step 1: Implement GET (público)**

```ts
import { NextResponse } from 'next/server'
import { MatchType, Role } from '@prisma/client'
import { db } from '@/lib/db'
import { auth, requireRole } from '@/lib/auth'
import { upsertMatchFormationSchema } from '@/lib/validations/formation'
import {
  assertUniqueSlotAssignments,
  isValidScheme,
  isValidSlotKey,
} from '@/lib/formations'
import { buildLineupView } from '@/lib/match-lineup'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      formations: true,
      callUps: {
        include: { player: { include: { user: { select: { name: true } } } } },
      },
      friendlyPlayers: {
        include: { friendlyPlayer: true },
      },
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
  })
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  // Build lineup views per side — see Step details below in full file when implementing.
  // For LEAGUE: group callUps by player.teamId matching home/away + formation.scheme
  // For FRIENDLY: group friendlyPlayers by side
  return NextResponse.json({ /* lineups array */ })
}
```

Implementación concreta del JSON de respuesta:

```ts
type SideLineup = {
  key: string // teamId or "A"|"B"
  label: string
  lineup: ReturnType<typeof buildLineupView> | null
}

// LEAGUE example for one team:
function leagueSide(
  teamId: string,
  label: string,
  formations: typeof match.formations,
  callUps: typeof match.callUps
): SideLineup {
  const formation = formations.find((f) => f.teamId === teamId)
  if (!formation) return { key: teamId, label, lineup: null }
  const teamCallUps = callUps.filter((c) => c.player.teamId === teamId)
  return {
    key: teamId,
    label,
    lineup: buildLineupView({
      scheme: formation.scheme,
      assignments: teamCallUps
        .filter((c) => c.slotKey)
        .map((c) => ({
          slotKey: c.slotKey!,
          playerId: c.playerId,
          playerName: c.player.user.name,
        })),
      bench: teamCallUps
        .filter((c) => !c.slotKey)
        .map((c) => ({ playerId: c.playerId, playerName: c.player.user.name })),
    }),
  }
}
```

- [ ] **Step 2: Implement PUT**

```ts
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole([Role.COACH, Role.ADMIN])
  const { id: matchId } = await params
  const match = await db.match.findUniqueOrThrow({ where: { id: matchId } })

  const parsed = upsertMatchFormationSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  if (!isValidScheme(data.scheme)) {
    return NextResponse.json({ error: 'Esquema inválido' }, { status: 400 })
  }

  for (const slot of data.slots) {
    if (!isValidSlotKey(data.scheme, slot.slotKey)) {
      return NextResponse.json(
        { error: `Slot inválido para ${data.scheme}: ${slot.slotKey}` },
        { status: 400 }
      )
    }
  }

  const uniqueness = assertUniqueSlotAssignments(
    data.slots.map((s) => ({
      slotKey: s.slotKey,
      playerId: 'playerId' in s ? s.playerId : s.friendlyPlayerId,
    }))
  )
  if (!uniqueness.ok) {
    return NextResponse.json({ error: 'Hay slots duplicados' }, { status: 400 })
  }

  if (match.matchType === MatchType.LEAGUE) {
    if (!data.teamId) {
      return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })
    }
    if (data.teamId !== match.homeTeamId && data.teamId !== match.awayTeamId) {
      return NextResponse.json({ error: 'Equipo no pertenece al partido' }, { status: 400 })
    }
    if (session.user.role === Role.COACH) {
      const team = await db.team.findUnique({ where: { coachId: session.user.id } })
      if (!team || team.id !== data.teamId) {
        return NextResponse.json({ error: 'Solo puedes editar tu equipo' }, { status: 403 })
      }
    }

    const slotPlayerIds = data.slots
      .filter((s): s is { slotKey: string; playerId: string } => 'playerId' in s)
      .map((s) => s.playerId)
    const benchIds = data.benchPlayerIds ?? []
    const allIds = [...new Set([...slotPlayerIds, ...benchIds])]

    await db.$transaction(async (tx) => {
      await tx.matchFormation.upsert({
        where: { matchId_teamId: { matchId, teamId: data.teamId! } },
        create: { matchId, teamId: data.teamId!, scheme: data.scheme },
        update: { scheme: data.scheme },
      })

      await tx.callUp.deleteMany({
        where: { matchId, player: { teamId: data.teamId! } },
      })

      const slotByPlayer = new Map(
        data.slots
          .filter((s): s is { slotKey: string; playerId: string } => 'playerId' in s)
          .map((s) => [s.playerId, s.slotKey])
      )

      for (const playerId of allIds) {
        const slotKey = slotByPlayer.get(playerId) ?? null
        await tx.callUp.create({
          data: {
            matchId,
            playerId,
            slotKey,
            isStarter: Boolean(slotKey),
          },
        })
      }
    })
  } else {
    // FRIENDLY branch — mirror with side + friendlyPlayerId / FriendlyMatchPlayer updates
    if (!data.side) {
      return NextResponse.json({ error: 'side requerido' }, { status: 400 })
    }
    // ADMIN only for friendlies
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Solo admin edita formaciones amistosas' }, { status: 403 })
    }

    const slotFpIds = data.slots
      .filter((s): s is { slotKey: string; friendlyPlayerId: string } => 'friendlyPlayerId' in s)
      .map((s) => s.friendlyPlayerId)
    const benchFp = data.benchFriendlyPlayerIds ?? []
    const allFp = [...new Set([...slotFpIds, ...benchFp])]

    // Verify all belong to match plantel on that side
    const parts = await db.friendlyMatchPlayer.findMany({
      where: { matchId, side: data.side, friendlyPlayerId: { in: allFp } },
    })
    if (parts.length !== allFp.length) {
      return NextResponse.json(
        { error: 'Todos los jugadores deben estar en el plantel de ese lado' },
        { status: 400 }
      )
    }

    await db.$transaction(async (tx) => {
      await tx.matchFormation.upsert({
        where: { matchId_side: { matchId, side: data.side! } },
        create: { matchId, side: data.side!, scheme: data.scheme },
        update: { scheme: data.scheme },
      })

      // Clear slots for this side first
      await tx.friendlyMatchPlayer.updateMany({
        where: { matchId, side: data.side! },
        data: { isStarter: false, slotKey: null },
      })

      const slotByFp = new Map(
        data.slots
          .filter((s): s is { slotKey: string; friendlyPlayerId: string } =>
            'friendlyPlayerId' in s
          )
          .map((s) => [s.friendlyPlayerId, s.slotKey])
      )

      for (const friendlyPlayerId of allFp) {
        const slotKey = slotByFp.get(friendlyPlayerId) ?? null
        await tx.friendlyMatchPlayer.update({
          where: {
            matchId_friendlyPlayerId: { matchId, friendlyPlayerId },
          },
          data: {
            slotKey,
            isStarter: Boolean(slotKey),
          },
        })
      }
    })
  }

  return NextResponse.json({ ok: true })
}
```

**Nota de implementación:** el archivo completo debe compilar; al escribir, unificar tipos de slots (league vs friendly) con type guards claros como arriba. GET debe devolver `{ sides: SideLineup[] }`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/matches/[id]/formations/route.ts
git commit -m "feat: add match formations GET/PUT API"
```

---

### Task 7: UI compartida — FormationPitch + FormationEditor

**Files:**
- Create: `src/components/lineup/FormationPitch.tsx`
- Create: `src/components/lineup/FormationEditor.tsx`

- [ ] **Step 1: FormationPitch (solo lectura o interactivo)**

```tsx
'use client'

import type { LineupView } from '@/lib/match-lineup'

type Props = {
  lineup: LineupView
  /** If provided, empty slots become selectable */
  onSelectSlot?: (slotKey: string) => void
  selectedSlotKey?: string | null
  className?: string
}

export function FormationPitch({
  lineup,
  onSelectSlot,
  selectedSlotKey,
  className = '',
}: Props) {
  const maxRow = Math.max(...lineup.pitch.map((s) => s.row), 0)

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-emerald-800 bg-gradient-to-b from-emerald-700 to-emerald-900 ${className}`}
    >
      <p className="absolute left-2 top-2 z-10 rounded bg-black/40 px-2 py-0.5 text-xs text-white">
        {lineup.scheme}
      </p>
      {lineup.pitch.map((slot) => {
        const top = `${((maxRow - slot.row) / (maxRow + 1)) * 85 + 5}%`
        const left = `${slot.col * 100}%`
        const filled = Boolean(slot.playerName)
        return (
          <button
            key={slot.slotKey}
            type="button"
            disabled={!onSelectSlot}
            onClick={() => onSelectSlot?.(slot.slotKey)}
            style={{ top, left, transform: 'translate(-50%, -50%)' }}
            className={`absolute flex h-14 w-14 flex-col items-center justify-center rounded-full border text-center text-[10px] leading-tight ${
              selectedSlotKey === slot.slotKey
                ? 'border-kelme-red bg-white text-kelme-gray-900'
                : filled
                  ? 'border-white/60 bg-kelme-gray-900/80 text-white'
                  : 'border-dashed border-white/40 bg-black/20 text-white/70'
            }`}
          >
            <span className="font-semibold">{slot.label}</span>
            <span className="line-clamp-2 px-0.5">
              {slot.playerName ?? '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: FormationEditor**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { FORMATION_SCHEMES, getFormationSlots } from '@/lib/formations'
import { buildLineupView } from '@/lib/match-lineup'
import { FormationPitch } from './FormationPitch'

export type EditorPlayer = { id: string; label: string }

type Props = {
  initialScheme?: string
  initialSlots?: Record<string, string> // slotKey -> playerId
  players: EditorPlayer[]
  onSave: (payload: {
    scheme: string
    slots: Array<{ slotKey: string; playerId: string }>
    benchPlayerIds: string[]
  }) => Promise<void>
}

export function FormationEditor({
  initialScheme = '4-3-3',
  initialSlots = {},
  players,
  onSave,
}: Props) {
  const [scheme, setScheme] = useState(initialScheme)
  const [slots, setSlots] = useState<Record<string, string>>(initialSlots)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const assignedIds = useMemo(() => new Set(Object.values(slots)), [slots])

  const lineup = buildLineupView({
    scheme,
    assignments: Object.entries(slots).map(([slotKey, playerId]) => ({
      slotKey,
      playerId,
      playerName: players.find((p) => p.id === playerId)?.label ?? playerId,
    })),
    bench: players
      .filter((p) => !assignedIds.has(p.id))
      .map((p) => ({ playerId: p.id, playerName: p.label })),
  })

  function onSchemeChange(next: string) {
    setScheme(next)
    const valid = new Set(getFormationSlots(next).map((s) => s.key))
    setSlots((prev) => {
      const nextSlots: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (valid.has(k)) nextSlots[k] = v
      }
      return nextSlots
    })
    setSelectedSlot(null)
  }

  function assignPlayerToSelected(playerId: string) {
    if (!selectedSlot) return
    setSlots((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(next)) {
        if (v === playerId) delete next[k]
      }
      next[selectedSlot] = playerId
      return next
    })
  }

  function clearSelectedSlot() {
    if (!selectedSlot) return
    setSlots((prev) => {
      const next = { ...prev }
      delete next[selectedSlot]
      return next
    })
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      await onSave({
        scheme,
        slots: Object.entries(slots).map(([slotKey, playerId]) => ({
          slotKey,
          playerId,
        })),
        benchPlayerIds: players
          .filter((p) => !assignedIds.has(p.id))
          .map((p) => p.id),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <label className="block text-sm font-medium">
          Esquema
          <select
            value={scheme}
            onChange={(e) => onSchemeChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          >
            {FORMATION_SCHEMES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <FormationPitch
          lineup={lineup}
          selectedSlotKey={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
        {selectedSlot && (
          <button
            type="button"
            onClick={clearSelectedSlot}
            className="text-sm text-kelme-gray-400 hover:underline"
          >
            Quitar jugador del slot {selectedSlot}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-kelme-gray-400">
          {selectedSlot
            ? `Elige jugador para ${selectedSlot}`
            : 'Toca un slot en la cancha, luego elige un jugador'}
        </p>
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {players.map((p) => {
            const inPitch = assignedIds.has(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => assignPlayerToSelected(p.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40 ${
                    inPitch
                      ? 'border-kelme-red/40 bg-kelme-red/5'
                      : 'border-kelme-border bg-kelme-surface'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-xs text-kelme-gray-400">
                    {inPitch ? 'En cancha' : 'Banco'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="w-full rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Guardar formación'}
        </button>
        {error && <p className="text-sm text-kelme-red">{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/lineup/
git commit -m "feat: add shared formation pitch editor components"
```

---

### Task 8: Integrar editor en citación del coach

**Files:**
- Modify: `src/components/coach/CallUpForm.tsx`
- Modify: `src/app/(dashboard)/coach/callups/[matchId]/page.tsx`

- [ ] **Step 1: Page carga callups + formation existentes**

En `callups/[matchId]/page.tsx`:

```tsx
const callUps = await db.callUp.findMany({
  where: { matchId, player: { teamId: team.id } },
  include: { player: { include: { user: { select: { name: true } } } } },
})
const formation = await db.matchFormation.findFirst({
  where: { matchId, teamId: team.id },
})

// Pass to CallUpForm:
// initialSelected, initialSlots, initialScheme, teamId, matchId
```

- [ ] **Step 2: CallUpForm usa FormationEditor**

Flujo UX:

1. Mantener lista de convocados (checkboxes) como hoy — mínimo 7.
2. Debajo, `FormationEditor` con `players` = solo los seleccionados.
3. Al guardar formación, llamar:

```ts
await fetch(`/api/matches/${matchId}/formations`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamId,
    scheme,
    slots: slots.map((s) => ({ slotKey: s.slotKey, playerId: s.playerId })),
    benchPlayerIds,
  }),
})
```

Y/o seguir usando POST callups con `slots` para mantener sync.

**Recomendación del plan:** un solo botón “Guardar citación y formación” que:

1. Valida `selected.length >= 7`
2. PUT formations (incluye recrear callups del equipo en el API PUT)

Así se evita doble fuente de verdad. La lista de checkboxes define el universo de jugadores; el pitch asigna slots.

- [ ] **Step 3: Commit**

```bash
git add src/components/coach/CallUpForm.tsx "src/app/(dashboard)/coach/callups/"
git commit -m "feat: coach can set team formation on callups"
```

---

### Task 9: Admin — página lineup amistoso (y liga)

**Files:**
- Create: `src/app/(dashboard)/admin/matches/[id]/lineup/page.tsx`
- Create: `src/components/admin/FriendlyLineupEditor.tsx`
- Modify: `src/app/(dashboard)/admin/matches/page.tsx` — link “Formación”

- [ ] **Step 1: Page**

```tsx
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { MatchType } from '@prisma/client'
import { matchDisplayName, matchSideNames } from '@/lib/match-label'
import { FriendlyLineupEditor } from '@/components/admin/FriendlyLineupEditor'
import { FormationEditor } from '@/components/lineup/FormationEditor'
import Link from 'next/link'

export default async function AdminMatchLineupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const match = await db.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      formations: true,
      callUps: {
        include: { player: { include: { user: { select: { name: true } } } } },
      },
      friendlyPlayers: { include: { friendlyPlayer: true } },
    },
  })
  if (!match) notFound()

  const title = matchDisplayName(match)
  const sides = matchSideNames(match)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/matches" className="text-sm text-kelme-red hover:underline">
          ← Partidos
        </Link>
        <h1 className="font-display text-2xl font-bold">Formación — {title}</h1>
      </div>

      {match.matchType === MatchType.FRIENDLY ? (
        <FriendlyLineupEditor
          matchId={match.id}
          homeLabel={sides.home}
          awayLabel={sides.away}
          formations={match.formations}
          participations={match.friendlyPlayers.map((p) => ({
            id: p.friendlyPlayerId,
            side: p.side,
            label: `${p.friendlyPlayer.firstName} ${p.friendlyPlayer.lastName}`,
            slotKey: p.slotKey,
          }))}
        />
      ) : (
        <div className="space-y-10">
          {/* Import LeagueLineupEditor (client). For each of home/away: */}
          {/* <LeagueLineupEditor
               matchId={match.id}
               teamId={match.homeTeamId!}
               label={sides.home}
               players={callUpsOfHome.map(...)}
               initialScheme={formation?.scheme ?? '4-3-3'}
               initialSlots={{ [slotKey]: playerId, ... }}
             /> */}
        </div>
      )}
```

**Crear** `src/components/admin/LeagueLineupEditor.tsx` (client): wrapper de `FormationEditor` cuyo `onSave` hace PUT:

```ts
body: JSON.stringify({
  teamId,
  scheme,
  slots: slots.map((s) => ({ slotKey: s.slotKey, playerId: s.playerId })),
  benchPlayerIds,
})
```

Si `players.length === 0`, mostrar: “Primero el coach debe citar jugadores.”

- [ ] **Step 2: FriendlyLineupEditor**

Componente client con dos `FormationEditor` (lado A y B). `onSave` para A:

```ts
await fetch(`/api/matches/${matchId}/formations`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    side: 'A',
    scheme,
    slots: slots.map((s) => ({
      slotKey: s.slotKey,
      friendlyPlayerId: s.playerId,
    })),
    benchFriendlyPlayerIds: benchPlayerIds,
  }),
})
```

Importante: el `FormationEditor` usa `playerId` genérico en UI; el wrapper traduce a `friendlyPlayerId` al enviar.

- [ ] **Step 3: Link en lista de partidos**

Junto a “Cronología”:

```tsx
<Link href={`/admin/matches/${match.id}/lineup`} className="text-sm text-kelme-gray-600 hover:underline">
  Formación
</Link>
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/admin/matches/" src/components/admin/FriendlyLineupEditor.tsx
git commit -m "feat: admin match lineup editor for both match types"
```

---

### Task 10: Live — mostrar formaciones

**Files:**
- Modify: `src/app/live/[matchId]/page.tsx`
- Modify: `src/components/live/LiveScoreboard.tsx`
- Create (opcional): `src/components/live/LiveFormations.tsx`

- [ ] **Step 1: Page include**

```ts
formations: true,
callUps: {
  include: {
    player: {
      include: {
        user: { select: { name: true } },
        team: { select: { id: true } },
      },
    },
  },
},
// friendlyPlayers already included — add slotKey fields via select
```

Construir `sides` lineup con `buildLineupView` (misma lógica que GET API) y pasar a `LiveScoreboard` como:

```ts
initialFormations: Array<{
  label: string
  lineup: LineupView | null
}>
```

- [ ] **Step 2: UI en LiveScoreboard**

Debajo del marcador, si alguna formación existe:

```tsx
{(initialFormations?.some((f) => f.lineup) ?? false) && (
  <section className="mb-8">
    <h2 className="mb-4 font-display text-lg font-bold">Formaciones</h2>
    <div className="grid gap-4 md:grid-cols-2">
      {initialFormations.map((side) =>
        side.lineup ? (
          <div key={side.label}>
            <p className="mb-2 text-center font-ui text-sm text-white/70">{side.label}</p>
            <FormationPitch lineup={side.lineup} />
            {side.lineup.bench.length > 0 && (
              <p className="mt-2 text-center text-xs text-white/40">
                Banco: {side.lineup.bench.map((b) => b.playerName).join(', ')}
              </p>
            )}
          </div>
        ) : null
      )}
    </div>
  </section>
)}
```

`FormationPitch` en live: **sin** `onSelectSlot` (solo lectura).

- [ ] **Step 3: Commit**

```bash
git add src/app/live/ src/components/live/ src/components/lineup/FormationPitch.tsx
git commit -m "feat: show team formations on live scoreboard"
```

---

### Task 11: Middleware / auth público GET

**Files:**
- Modify: `src/middleware.ts` (si las APIs públicas necesitan whitelist)

- [ ] **Step 1: Revisar middleware**

Si `/api/matches/[id]/clock` ya es público, agregar el mismo patrón para `/api/matches/*/formations` **GET** (no PUT).

Buscar en `src/middleware.ts` cómo se exceptúa clock/photo y replicar.

- [ ] **Step 2: Commit si hubo cambio**

```bash
git add src/middleware.ts
git commit -m "fix: allow public GET for match formations"
```

---

### Task 12: Verificación final

- [ ] **Step 1: Suite**

```bash
npx vitest run
npx tsc --noEmit
```

Expected: all green

- [ ] **Step 2: Checklist manual**

1. Liga: coach A guarda 4-3-3; coach B guarda 4-4-2 — ninguno borra al otro
2. Live muestra ambas canchas + bancos
3. Admin amistoso: formar lados A/B desde plantel; slots vacíos ok
4. Partido sin formación: live sin sección (no error)
5. Cambiar esquema limpia slots incompatibles en UI
6. PUT con slot inválido → 400
7. Coach no puede PUT formation del rival → 403

- [ ] **Step 3: Commit docs**

```bash
git add docs/superpowers/specs/2026-07-21-formacion-equipo-design.md docs/superpowers/plans/2026-07-21-formacion-equipo.md
git commit -m "docs: team formation design and implementation plan"
```

---

## Self-Review

**1. Spec coverage**

| Requisito | Task |
|-----------|------|
| Esquemas + slots | 1 |
| MatchFormation + slotKey | 4 |
| Coach liga | 5, 6, 8 |
| Admin amistoso (+ liga) | 6, 9 |
| Live | 10 |
| Validación Zod/API | 2, 6 |
| Fix callups wipe rival | 5 |
| Partidos legacy sin formación | 10 (sección condicional) |

**2. Placeholder scan:** sin TBD. Task 9 liga admin usa `LeagueLineupEditor` client (espejo de friendly) con PUT `teamId`.

**3. Type consistency:** `scheme` string de `FORMATION_SCHEMES`; slots usan `slotKey`; league `playerId` / friendly `friendlyPlayerId`; `buildLineupView` unifica la vista.

**YAGNI explícito:** sin drag-and-drop avanzado, sin cambios de formación vía eventos en vivo, sin forzar 11 titulares en amistosos.
