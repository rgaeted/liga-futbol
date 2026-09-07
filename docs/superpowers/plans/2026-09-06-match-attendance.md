# Asistencia al próximo amistoso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada jugador de la org anote su nombre en el próximo amistoso (el ritual del viernes de Los Lunes) sin que se choquen los mensajes: una lista compartida, en orden, con un toque.

**Architecture:** Tabla `MatchAttendance` (presencia = voy). GET público de la lista; POST/DELETE autenticados resuelven la ficha con `findPlayerInOrganization` sobre `match.organizationId` (no cookie). La UI es un widget cliente reutilizado en landing, panel jugador y tarjeta admin (admin solo lee). No se escribe en `FriendlyMatchPlayer` ni en `CallUp`.

**Tech Stack:** Next.js 16 App Router · Prisma 7 · PostgreSQL (Supabase) · Zod · Vitest · Auth.js

## Global Constraints

- UI y textos: **español chileno** (tú, no voseo). Copy fija: "¿Quién va?", "Voy", "Ya no voy", "Ingresa para anotar tu nombre", "El listado se cierra cuando empieza el partido."
- Commits: **uno por task**. No commitear `.env*`, `docs/handoff/`, `.superpowers/`, `supabase/.temp/`, `cookies*.txt`.
- Tras cambios Prisma: `npx prisma generate` antes de tests/build.
- Migraciones prod: manual con `DIRECT_URL` Session Pooler; Vercel build **no** corre `migrate deploy`.
- Solo partidos `matchType === FRIENDLY` y `status === SCHEDULED`. Liga sigue con `CallUp`.
- No auto-convocar: anotar **no** crea `FriendlyMatchPlayer` ni asigna lado A/B.
- Un registro por `(matchId, playerId)`. POST/DELETE **idempotentes** (repetir Voy o Ya no voy no es error).
- Orden de la lista: `createdAt ASC` (quién anotó primero, como el hilo de WhatsApp).
- Quién firma: usuario con ficha `Player` en `match.organizationId` (`findPlayerInOrganization`). Sin ficha → 403 con mensaje de enlace.
- GET lista: público (mismo criterio que formaciones/live). POST/DELETE: sesión.
- Auth de mutación: **no** usar `requireOrgRole` con cookie de org (falla multi-org). Resolver org desde el partido.
- Ventana: abierta mientras el amistoso está `SCHEDULED`. Sin candado de viernes.
- Fuera de v1: WhatsApp/envío de mensajes, “tal vez”, notificaciones, Realtime, app Expo, jugadores de org invitada en desafíos.
- Landing pública: no importar `db`/Prisma en componentes `'use client'`. El widget recibe props serializadas.

---

## File Map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Modelo `MatchAttendance` + relaciones en `Match` y `Player` |
| `prisma/migrations/20260907120000_match_attendance/migration.sql` | DDL + unique + índice |
| `src/lib/match-attendance.ts` | Guards, serialización, próximo amistoso, include Prisma |
| `src/lib/validations/match-attendance.ts` | Zod del body POST (vacío) |
| `src/lib/proxy-policy.ts` | GET `/api/matches/:id/attendance` público |
| `src/app/api/matches/[id]/attendance/route.ts` | GET/POST/DELETE |
| `src/components/match-attendance/MatchAttendanceBoard.tsx` | Lista + botones Voy / Ya no voy |
| `src/lib/org-public-landing.ts` | Campo `attendance` en el payload de landing |
| `src/app/(tenant)/[organizationSlug]/page.tsx` | Pasa `viewer` (sesión + ficha) al landing |
| `src/components/marketing/OrgPublicLanding.tsx` | Sección bajo Próximo partido |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx` | Bloque en Mi panel |
| `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/page.tsx` | Carga `attendances` |
| `src/components/admin/AdminMatchCard.tsx` | Conteo + nombres (solo lectura) |
| `src/lib/tenant-nav.ts` | Item jugador **¿Quién va?** → `/{slug}#asistencia` |
| `tests/lib/match-attendance.test.ts` | Guards y serialización |
| `tests/lib/proxy-policy.test.ts` | GET attendance público; POST no |

---

### Task 1: Schema Prisma y migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260907120000_match_attendance/migration.sql`

**Interfaces:**
- Produces: modelo Prisma `MatchAttendance` con `@@unique([matchId, playerId])` y relaciones `Match.attendances`, `Player.attendances`

- [ ] **Step 1: Agregar el modelo al schema**

En `prisma/schema.prisma`, en `model Match` (junto a `friendlyPlayers`):

```prisma
  attendances  MatchAttendance[]
```

En `model Player` (junto a `friendlyParticipations`):

```prisma
  attendances  MatchAttendance[]
```

Después de `model FriendlyMatchPlayer`:

```prisma
model MatchAttendance {
  id        String   @id @default(cuid())
  matchId   String
  match     Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([matchId, playerId])
  @@index([matchId, createdAt])
}
```

- [ ] **Step 2: Escribir la migración SQL**

Crear `prisma/migrations/20260907120000_match_attendance/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "MatchAttendance" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchAttendance_matchId_playerId_key" ON "MatchAttendance"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "MatchAttendance_matchId_createdAt_idx" ON "MatchAttendance"("matchId", "createdAt");

-- AddForeignKey
ALTER TABLE "MatchAttendance" ADD CONSTRAINT "MatchAttendance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAttendance" ADD CONSTRAINT "MatchAttendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Generar el client**

Run: `npx prisma generate`

Expected: `Generated Prisma Client` y el tipo `MatchAttendance` existe.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260907120000_match_attendance/migration.sql
git commit -m "feat: add MatchAttendance for friendly RSVP list"
```

---

### Task 2: Dominio — guards, serialización y próximo amistoso

**Files:**
- Create: `src/lib/match-attendance.ts`
- Test: `tests/lib/match-attendance.test.ts`

**Interfaces:**
- Consumes: `MatchType`, `MatchStatus` de Prisma; `playerDisplayName`; `friendlyPlayerPhotoUrl`; `personHasPhoto`
- Produces:
  - `export type MatchAttendancePerson = { firstName: string; lastName: string; photoMimeType: string | null; photoData: Uint8Array \| Buffer \| null }`
  - `export type MatchAttendancePlayer = { id: string; person: MatchAttendancePerson }`
  - `export type MatchAttendanceRow = { playerId: string; createdAt: Date; player: MatchAttendancePlayer }`
  - `export type MatchAttendanceEntry = { playerId: string; name: string; photoUrl: string \| null; createdAt: string }`
  - `export function canOpenMatchAttendance(match: { matchType: string; status: string }): boolean`
  - `export function attendanceClosedMessage(): string`
  - `export function serializeMatchAttendance(rows: MatchAttendanceRow[]): MatchAttendanceEntry[]`
  - `export const MATCH_ATTENDANCE_INCLUDE` (Prisma include)

- [ ] **Step 1: Write the failing test**

Crear `tests/lib/match-attendance.test.ts`:

```ts
import { MatchStatus, MatchType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  attendanceClosedMessage,
  canOpenMatchAttendance,
  serializeMatchAttendance,
} from '@/lib/match-attendance'

describe('canOpenMatchAttendance', () => {
  it('opens only scheduled friendlies', () => {
    expect(
      canOpenMatchAttendance({ matchType: MatchType.FRIENDLY, status: MatchStatus.SCHEDULED })
    ).toBe(true)
    expect(
      canOpenMatchAttendance({ matchType: MatchType.LEAGUE, status: MatchStatus.SCHEDULED })
    ).toBe(false)
    expect(
      canOpenMatchAttendance({ matchType: MatchType.FRIENDLY, status: MatchStatus.LIVE })
    ).toBe(false)
    expect(
      canOpenMatchAttendance({ matchType: MatchType.FRIENDLY, status: MatchStatus.FINISHED })
    ).toBe(false)
  })
})

describe('serializeMatchAttendance', () => {
  it('keeps createdAt order and maps display name', () => {
    const rows = [
      {
        playerId: 'p2',
        createdAt: new Date('2026-09-05T22:01:00.000Z'),
        player: {
          id: 'p2',
          person: {
            firstName: 'Ana',
            lastName: 'Soto',
            photoMimeType: null,
            photoData: null,
          },
        },
      },
      {
        playerId: 'p1',
        createdAt: new Date('2026-09-05T22:00:00.000Z'),
        player: {
          id: 'p1',
          person: {
            firstName: 'Juan',
            lastName: 'Pérez',
            photoMimeType: 'image/jpeg',
            photoData: new Uint8Array([1, 2, 3]),
          },
        },
      },
    ]
    const serialized = serializeMatchAttendance(rows)
    expect(serialized.map((row) => row.playerId)).toEqual(['p2', 'p1'])
    expect(serialized[1]).toMatchObject({
      playerId: 'p1',
      name: 'Juan Pérez',
      photoUrl: '/api/players/p1/photo',
      createdAt: '2026-09-05T22:00:00.000Z',
    })
    expect(serialized[0].photoUrl).toBeNull()
  })
})

describe('attendanceClosedMessage', () => {
  it('uses Chilean copy', () => {
    expect(attendanceClosedMessage()).toBe(
      'El listado se cierra cuando empieza el partido.'
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/match-attendance.test.ts`

Expected: FAIL — `Cannot find module '@/lib/match-attendance'`

- [ ] **Step 3: Write minimal implementation**

Crear `src/lib/match-attendance.ts`:

```ts
import { MatchStatus, MatchType } from '@prisma/client'
import { friendlyPlayerPhotoUrl, personHasPhoto } from '@/lib/friendly-player-photo'
import { playerDisplayName, PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

export type MatchAttendancePerson = {
  firstName: string
  lastName: string
  photoMimeType: string | null
  photoData: Uint8Array | Buffer | null
}

export type MatchAttendancePlayer = {
  id: string
  person: MatchAttendancePerson
}

export type MatchAttendanceRow = {
  playerId: string
  createdAt: Date
  player: MatchAttendancePlayer
}

export type MatchAttendanceEntry = {
  playerId: string
  name: string
  photoUrl: string | null
  createdAt: string
}

export const MATCH_ATTENDANCE_INCLUDE = {
  player: {
    include: {
      person: {
        select: {
          firstName: true,
          lastName: true,
          photoMimeType: true,
          photoData: true,
        },
      },
    },
  },
} as const

export function canOpenMatchAttendance(match: {
  matchType: string
  status: string
}): boolean {
  return match.matchType === MatchType.FRIENDLY && match.status === MatchStatus.SCHEDULED
}

export function attendanceClosedMessage(): string {
  return 'El listado se cierra cuando empieza el partido.'
}

export function serializeMatchAttendance(rows: MatchAttendanceRow[]): MatchAttendanceEntry[] {
  return rows.map((row) => ({
    playerId: row.playerId,
    name: playerDisplayName(row.player),
    photoUrl: personHasPhoto(row.player.person)
      ? friendlyPlayerPhotoUrl(row.player.id)
      : null,
    createdAt: row.createdAt.toISOString(),
  }))
}

export function findNextFriendlyAttendanceWhere(organizationId: string, now: Date) {
  return {
    organizationId,
    matchType: MatchType.FRIENDLY,
    status: MatchStatus.SCHEDULED,
    scheduledAt: { gte: now },
  }
}
```

`PLAYER_PERSON_NAME_INCLUDE` queda importado solo si lo usas en el include; si el linter marca unused, quítalo. El include de foto es el de arriba, no el de nombre completo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/match-attendance.test.ts`

Expected: PASS (3 files / 3 describes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-attendance.ts tests/lib/match-attendance.test.ts
git commit -m "feat: add friendly attendance domain helpers"
```

---

### Task 3: GET público en el proxy

**Files:**
- Modify: `src/lib/proxy-policy.ts`
- Test: `tests/lib/proxy-policy.test.ts`

**Interfaces:**
- Consumes: `isPublicRequest(method, pathname)`
- Produces: `GET /api/matches/:id/attendance` y `HEAD` públicos; `POST`/`DELETE` siguen privados

- [ ] **Step 1: Write the failing test**

En `tests/lib/proxy-policy.test.ts`, dentro del describe existente, agregar:

```ts
  it('treats match attendance list as public GET only', () => {
    expect(isPublicRequest('GET', '/api/matches/match-1/attendance')).toBe(true)
    expect(isPublicRequest('HEAD', '/api/matches/match-1/attendance')).toBe(true)
    expect(isPublicRequest('POST', '/api/matches/match-1/attendance')).toBe(false)
    expect(isPublicRequest('DELETE', '/api/matches/match-1/attendance')).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/proxy-policy.test.ts -t "treats match attendance"`

Expected: FAIL — GET attendance es `false`

- [ ] **Step 3: Write minimal implementation**

En `isPublicRequest` de `src/lib/proxy-policy.ts`, junto a `isFormationsGet`:

```ts
  const isMatchAttendanceGet =
    (method === 'GET' || method === 'HEAD') &&
    /^\/api\/matches\/[^/]+\/attendance$/.test(pathname)
```

Incluir `isMatchAttendanceGet` en el `return` de `isPublicRequest`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/proxy-policy.test.ts`

Expected: PASS, incluido el caso nuevo. El test `preserves the existing public routes` no debe romperse.

- [ ] **Step 5: Commit**

```bash
git add src/lib/proxy-policy.ts tests/lib/proxy-policy.test.ts
git commit -m "feat: allow public GET of match attendance list"
```

---

### Task 4: API GET/POST/DELETE

**Files:**
- Create: `src/lib/validations/match-attendance.ts`
- Create: `src/app/api/matches/[id]/attendance/route.ts`
- Test: `tests/lib/validations-match-attendance.test.ts`

**Interfaces:**
- Consumes: `canOpenMatchAttendance`, `serializeMatchAttendance`, `MATCH_ATTENDANCE_INCLUDE`, `findPlayerInOrganization`, `auth`, `db`
- Produces:
  - `GET` → `{ matchId, open, attendees: MatchAttendanceEntry[] }`
  - `POST` → mismo JSON; agrega la ficha del usuario
  - `DELETE` → mismo JSON; quita la ficha del usuario
  - Errores: 401 `'Ingresa para anotar tu nombre.'` · 403 `'No tienes ficha de jugador en esta liga.'` · 404 `'Partido no encontrado'` · 409 `'El listado se cierra cuando empieza el partido.'`

- [ ] **Step 1: Write the failing validation test**

Crear `tests/lib/validations-match-attendance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { upsertMatchAttendanceSchema } from '@/lib/validations/match-attendance'

describe('upsertMatchAttendanceSchema', () => {
  it('accepts an empty body', () => {
    expect(upsertMatchAttendanceSchema.safeParse({}).success).toBe(true)
    expect(upsertMatchAttendanceSchema.safeParse(undefined).success).toBe(true)
  })

  it('rejects unknown fields', () => {
    expect(upsertMatchAttendanceSchema.safeParse({ playerId: 'p1' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations-match-attendance.test.ts`

Expected: FAIL — módulo no existe

- [ ] **Step 3: Write validation + route**

`src/lib/validations/match-attendance.ts`:

```ts
import { z } from 'zod'

export const upsertMatchAttendanceSchema = z
  .object({})
  .strict()
  .optional()
```

`src/app/api/matches/[id]/attendance/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import {
  MATCH_ATTENDANCE_INCLUDE,
  attendanceClosedMessage,
  canOpenMatchAttendance,
  serializeMatchAttendance,
} from '@/lib/match-attendance'
import { upsertMatchAttendanceSchema } from '@/lib/validations/match-attendance'

async function loadMatch(id: string) {
  return db.match.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      matchType: true,
      status: true,
    },
  })
}

async function loadAttendees(matchId: string) {
  const rows = await db.matchAttendance.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
    include: MATCH_ATTENDANCE_INCLUDE,
  })
  return serializeMatchAttendance(rows)
}

function listPayload(
  match: { id: string; matchType: string; status: string },
  attendees: Awaited<ReturnType<typeof loadAttendees>>
) {
  return {
    matchId: match.id,
    open: canOpenMatchAttendance(match),
    attendees,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const match = await loadMatch(id)
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  return NextResponse.json(listPayload(match, await loadAttendees(match.id)))
}

async function requireSigner(matchId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Ingresa para anotar tu nombre.' }, { status: 401 }) }
  }
  const match = await loadMatch(matchId)
  if (!match) {
    return { error: NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 }) }
  }
  if (!canOpenMatchAttendance(match)) {
    return {
      error: NextResponse.json({ error: attendanceClosedMessage() }, { status: 409 }),
    }
  }
  const player = await findPlayerInOrganization(session.user.id, match.organizationId)
  if (!player) {
    return {
      error: NextResponse.json(
        { error: 'No tienes ficha de jugador en esta liga.' },
        { status: 403 }
      ),
    }
  }
  return { match, player }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const raw = await req.json().catch(() => ({}))
  const parsed = upsertMatchAttendanceSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const signed = await requireSigner(id)
  if ('error' in signed) return signed.error

  await db.matchAttendance.upsert({
    where: {
      matchId_playerId: { matchId: signed.match.id, playerId: signed.player.id },
    },
    create: { matchId: signed.match.id, playerId: signed.player.id },
    update: {},
  })

  return NextResponse.json(listPayload(signed.match, await loadAttendees(signed.match.id)))
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const signed = await requireSigner(id)
  if ('error' in signed) return signed.error

  await db.matchAttendance.deleteMany({
    where: { matchId: signed.match.id, playerId: signed.player.id },
  })

  return NextResponse.json(listPayload(signed.match, await loadAttendees(signed.match.id)))
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/validations-match-attendance.test.ts tests/lib/match-attendance.test.ts tests/lib/proxy-policy.test.ts`

Expected: PASS. Typecheck del route: `npx tsc --noEmit` no debe quejarse de `MatchAttendance` (si falla, confirma `prisma generate`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/match-attendance.ts src/app/api/matches/[id]/attendance/route.ts tests/lib/validations-match-attendance.test.ts
git commit -m "feat: add match attendance API for friendly RSVP"
```

---

### Task 5: Widget de lista (cliente)

**Files:**
- Create: `src/components/match-attendance/MatchAttendanceBoard.tsx`

**Interfaces:**
- Consumes: `MatchAttendanceEntry`; `submitJson` de `src/components/admin/submit.ts`
- Produces: `export function MatchAttendanceBoard(props: MatchAttendanceBoardProps)`

```ts
export type AttendanceViewer = {
  signedIn: boolean
  canSign: boolean
  myPlayerId: string | null
  loginHref: string
}

export type MatchAttendanceBoardProps = {
  matchId: string
  open: boolean
  attendees: MatchAttendanceEntry[]
  viewer: AttendanceViewer
  accent?: 'org' | 'neutral'
}
```

- [ ] **Step 1: Write a serialize/viewer helper test (no DOM)**

En `tests/lib/match-attendance.test.ts` agregar:

```ts
import { isViewerGoing } from '@/lib/match-attendance'

describe('isViewerGoing', () => {
  it('is true only when myPlayerId is in the list', () => {
    expect(isViewerGoing('p1', [{ playerId: 'p1' }, { playerId: 'p2' }])).toBe(true)
    expect(isViewerGoing('p3', [{ playerId: 'p1' }])).toBe(false)
    expect(isViewerGoing(null, [{ playerId: 'p1' }])).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/match-attendance.test.ts -t "isViewerGoing"`

Expected: FAIL — `isViewerGoing` no exportado

- [ ] **Step 3: Implement helper + widget**

En `src/lib/match-attendance.ts`:

```ts
export function isViewerGoing(
  myPlayerId: string | null,
  attendees: Array<{ playerId: string }>
): boolean {
  return Boolean(myPlayerId && attendees.some((row) => row.playerId === myPlayerId))
}
```

Crear `src/components/match-attendance/MatchAttendanceBoard.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { submitJson } from '@/components/admin/submit'
import { isViewerGoing, type MatchAttendanceEntry } from '@/lib/match-attendance'

export type AttendanceViewer = {
  signedIn: boolean
  canSign: boolean
  myPlayerId: string | null
  loginHref: string
}

type Props = {
  matchId: string
  open: boolean
  attendees: MatchAttendanceEntry[]
  viewer: AttendanceViewer
}

export function MatchAttendanceBoard({ matchId, open, attendees, viewer }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState(attendees)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const going = isViewerGoing(viewer.myPlayerId, rows)
  const countLabel = rows.length === 1 ? '1 anotado' : `${rows.length} anotados`

  async function toggle() {
    setPending(true)
    setError('')
    const result = await submitJson(
      `/api/matches/${matchId}/attendance`,
      going ? 'DELETE' : 'POST',
      going ? undefined : {}
    )
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
    const res = await fetch(`/api/matches/${matchId}/attendance`)
    if (res.ok) {
      const data = (await res.json()) as { attendees: MatchAttendanceEntry[] }
      setRows(data.attendees)
    }
  }

  return (
    <section id="asistencia" className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-org-primary">
            Lista del grupo
          </p>
          <h2 className="mt-1 font-display text-[28px] font-semibold uppercase tracking-[-0.035em]">
            ¿Quién va?
          </h2>
        </div>
        <p className="text-sm text-[#9ca59f]">{countLabel}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-[#2a302d] bg-[#131615] px-4 py-5 text-sm text-[#9ca59f]">
          Todavía nadie anotó su nombre.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.playerId}
              className="flex items-center gap-3 rounded-xl border border-[#2a302d] bg-[#131615] px-3 py-2.5"
            >
              <span className="w-7 font-data text-xs text-[#8A938C]">{index + 1}</span>
              {row.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.photoUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0e110f] text-[10px] font-bold uppercase text-[#E8E4D8]">
                  {row.name.slice(0, 2)}
                </span>
              )}
              <span className="min-w-0 truncate font-semibold">{row.name}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4">
        {!open ? (
          <p className="text-sm text-[#9ca59f]">
            El listado se cierra cuando empieza el partido.
          </p>
        ) : !viewer.signedIn ? (
          <Link href={viewer.loginHref} className="btn-kelme inline-flex">
            Ingresa para anotar tu nombre
          </Link>
        ) : !viewer.canSign ? (
          <p className="text-sm text-[#9ca59f]">
            No tienes ficha de jugador en esta liga. Pide al administrador que enlace tu cuenta.
          </p>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="btn-kelme disabled:opacity-50"
          >
            {pending ? 'Guardando…' : going ? 'Ya no voy' : 'Voy'}
          </button>
        )}
        {error ? <p className="mt-2 text-sm text-kelme-red">{error}</p> : null}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/match-attendance.test.ts`

Expected: PASS incluido `isViewerGoing`

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-attendance.ts src/components/match-attendance/MatchAttendanceBoard.tsx tests/lib/match-attendance.test.ts
git commit -m "feat: add shared match attendance board"
```

---

### Task 6: Landing pública `/{slug}`

**Files:**
- Modify: `src/lib/org-public-landing.ts`
- Modify: `src/app/(tenant)/[organizationSlug]/page.tsx`
- Modify: `src/components/marketing/OrgPublicLanding.tsx`
- Modify: `src/lib/tenant-nav.ts`

**Interfaces:**
- Consumes: `findNextFriendlyAttendanceWhere`, `MATCH_ATTENDANCE_INCLUDE`, `serializeMatchAttendance`, `canOpenMatchAttendance`, `auth`, `findPlayerInOrganization`
- Produces: `OrgPublicLanding.attendance: { matchId: string; open: boolean; attendees: MatchAttendanceEntry[] } | null`
- Produces: `AttendanceViewer` pasado desde la page (no desde el loader Prisma)

- [ ] **Step 1: Write the failing shape test**

En `tests/lib/match-attendance.test.ts`:

```ts
import { findNextFriendlyAttendanceWhere } from '@/lib/match-attendance'
import { MatchStatus, MatchType } from '@prisma/client'

describe('findNextFriendlyAttendanceWhere', () => {
  it('filters scheduled friendlies from now', () => {
    const now = new Date('2026-09-08T12:00:00.000Z')
    expect(findNextFriendlyAttendanceWhere('org_1', now)).toEqual({
      organizationId: 'org_1',
      matchType: MatchType.FRIENDLY,
      status: MatchStatus.SCHEDULED,
      scheduledAt: { gte: now },
    })
  })
})
```

(Si el helper ya existe de Task 2, este test debe pasar de una; si no estaba exportado, expórtalo ahora.)

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/lib/match-attendance.test.ts -t "findNextFriendlyAttendanceWhere"`

Expected: PASS si Task 2 exportó el helper; si no, FAIL y agrégalo.

- [ ] **Step 3: Cargar attendance en el loader y pintar la sección**

En `src/lib/org-public-landing.ts`, agregar al tipo `OrgPublicLanding`:

```ts
  attendance: {
    matchId: string
    open: boolean
    attendees: Array<{
      playerId: string
      name: string
      photoUrl: string | null
      createdAt: string
    }>
  } | null
```

En `getOrgPublicLanding`, **después** de resolver `org` y `now`, query extra (puede ir en el `Promise.all` existente):

```ts
db.match.findFirst({
  where: findNextFriendlyAttendanceWhere(org.id, now),
  orderBy: { scheduledAt: 'asc' },
  select: {
    id: true,
    matchType: true,
    status: true,
    attendances: {
      orderBy: { createdAt: 'asc' },
      include: MATCH_ATTENDANCE_INCLUDE,
    },
  },
}),
```

Mapear:

```ts
attendance: nextFriendly
  ? {
      matchId: nextFriendly.id,
      open: canOpenMatchAttendance(nextFriendly),
      attendees: serializeMatchAttendance(nextFriendly.attendances),
    }
  : null
```

En `src/app/(tenant)/[organizationSlug]/page.tsx`:

```ts
import { auth } from '@/lib/auth'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { db } from '@/lib/db'

// junto a getOrgPublicLanding:
const session = await auth()
let viewer = {
  signedIn: false,
  canSign: false,
  myPlayerId: null as string | null,
  loginHref: `/login?callbackUrl=/${organizationSlug}#asistencia`,
}
if (session?.user?.id && data) {
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true },
  })
  if (org) {
    const player = await findPlayerInOrganization(session.user.id, org.id)
    viewer = {
      signedIn: true,
      canSign: Boolean(player),
      myPlayerId: player?.id ?? null,
      loginHref: `/login?callbackUrl=/${organizationSlug}#asistencia`,
    }
  }
}

return <OrgPublicLanding data={data} panelHref={panelHref} attendanceViewer={viewer} />
```

Evitar un query extra de org si `getOrgPublicLanding` ya puede devolver `organizationId` interno: **no** lo expongas en el payload público. El `findUnique` por slug está bien (1 row).

En `OrgPublicLanding`, después del bloque `{nextMatch ? ( ... ) : null}`:

```tsx
{data.attendance ? (
  <section className="py-[26px]">
    <div className="mx-auto w-[min(1180px,calc(100%-32px))]">
      <MatchAttendanceBoard
        matchId={data.attendance.matchId}
        open={data.attendance.open}
        attendees={data.attendance.attendees}
        viewer={attendanceViewer}
      />
    </div>
  </section>
) : null}
```

Importar el widget. Extender props de `OrgPublicLanding` con `attendanceViewer: AttendanceViewer`.

En `src/lib/tenant-nav.ts`, en el grupo Jugador:

```ts
{
  href: `/${slug}#asistencia`,
  label: '¿Quién va?',
  icon: 'VA',
},
```

Usar `orgPath` si el resto del grupo lo usa: `href` no puede ser `orgPath(slug, '#asistencia')` si eso produce `/{slug}/#asistencia` — preferir `` `${orgPath(slug, '')}#asistencia` `` o `` `/${slug}#asistencia` ``. Revisar `orgPath` y dejar un href que abra la landing pública, no `/player`.

- [ ] **Step 4: Verificar**

Run: `npx vitest run tests/lib/org-public-landing.test.ts tests/lib/match-attendance.test.ts tests/lib/admin-nav.test.ts`

Expected: PASS. Si `admin-nav` / tenant-nav tests asertan el número de items del grupo Jugador, actualiza el expect a +1 item.

Manual: `npm run dev` → `/{slug}` Los Lunes con un amistoso `SCHEDULED` futuro muestra **¿Quién va?**; sin sesión el CTA va a login.

- [ ] **Step 5: Commit**

```bash
git add src/lib/org-public-landing.ts src/app/(tenant)/[organizationSlug]/page.tsx src/components/marketing/OrgPublicLanding.tsx src/lib/tenant-nav.ts tests/lib/admin-nav.test.ts tests/lib/match-attendance.test.ts
git commit -m "feat: show next-friendly attendance list on org landing"
```

---

### Task 7: Panel del jugador

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx`

**Interfaces:**
- Consumes: `findNextFriendlyAttendanceWhere`, `MatchAttendanceBoard`, `canOpenMatchAttendance`, `serializeMatchAttendance`
- Produces: bloque arriba de “Mis partidos” cuando hay próximo amistoso

- [ ] **Step 1: Write a page-data helper test**

En `tests/lib/match-attendance.test.ts`:

```ts
import { attendanceViewerFromPlayer } from '@/lib/match-attendance'

describe('attendanceViewerFromPlayer', () => {
  it('builds a signer viewer', () => {
    expect(
      attendanceViewerFromPlayer({
        signedIn: true,
        playerId: 'p1',
        loginHref: '/login',
      })
    ).toEqual({
      signedIn: true,
      canSign: true,
      myPlayerId: 'p1',
      loginHref: '/login',
    })
  })

  it('builds a logged-in viewer without ficha', () => {
    expect(
      attendanceViewerFromPlayer({
        signedIn: true,
        playerId: null,
        loginHref: '/login',
      })
    ).toEqual({
      signedIn: true,
      canSign: false,
      myPlayerId: null,
      loginHref: '/login',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/match-attendance.test.ts -t "attendanceViewerFromPlayer"`

Expected: FAIL — helper no existe

- [ ] **Step 3: Helper + UI en el panel**

En `src/lib/match-attendance.ts`:

```ts
export function attendanceViewerFromPlayer(input: {
  signedIn: boolean
  playerId: string | null
  loginHref: string
}) {
  return {
    signedIn: input.signedIn,
    canSign: Boolean(input.signedIn && input.playerId),
    myPlayerId: input.playerId,
    loginHref: input.loginHref,
  }
}
```

En `player/page.tsx`, si hay `player`, cargar el próximo amistoso en el `Promise.all` existente:

```ts
db.match.findFirst({
  where: findNextFriendlyAttendanceWhere(organizationId, new Date()),
  orderBy: { scheduledAt: 'asc' },
  select: {
    id: true,
    matchType: true,
    status: true,
    scheduledAt: true,
    attendances: {
      orderBy: { createdAt: 'asc' },
      include: MATCH_ATTENDANCE_INCLUDE,
    },
  },
}),
```

Render **antes** de las listas de partidos:

```tsx
{nextFriendly ? (
  <div className="mb-8">
    <MatchAttendanceBoard
      matchId={nextFriendly.id}
      open={canOpenMatchAttendance(nextFriendly)}
      attendees={serializeMatchAttendance(nextFriendly.attendances)}
      viewer={attendanceViewerFromPlayer({
        signedIn: true,
        playerId: player.id,
        loginHref: `/login?callbackUrl=/${organizationSlug}/player`,
      })}
    />
  </div>
) : null}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/match-attendance.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-attendance.ts src/app/(tenant)/[organizationSlug]/(dashboard)/player/page.tsx tests/lib/match-attendance.test.ts
git commit -m "feat: let players RSVP from their dashboard"
```

---

### Task 8: Admin — ver quién anotó

**Files:**
- Modify: `src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/page.tsx`
- Modify: `src/components/admin/AdminMatchCard.tsx`

**Interfaces:**
- Consumes: `serializeMatchAttendance` (o solo `name[]` + `count`)
- Produces: en tarjetas `FRIENDLY` + `SCHEDULED`, texto `N anotados` y lista compacta de nombres. Sin botones Voy.

- [ ] **Step 1: Write a label helper test**

En `tests/lib/match-attendance.test.ts`:

```ts
import { attendanceCountLabel } from '@/lib/match-attendance'

describe('attendanceCountLabel', () => {
  it('uses singular and plural Chilean copy', () => {
    expect(attendanceCountLabel(0)).toBe('0 anotados')
    expect(attendanceCountLabel(1)).toBe('1 anotado')
    expect(attendanceCountLabel(8)).toBe('8 anotados')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/match-attendance.test.ts -t "attendanceCountLabel"`

Expected: FAIL

- [ ] **Step 3: Helper + tarjeta admin**

```ts
export function attendanceCountLabel(count: number): string {
  return count === 1 ? '1 anotado' : `${count} anotados`
}
```

En el `include` de `admin/matches/page.tsx`:

```ts
attendances: {
  orderBy: { createdAt: 'asc' },
  include: MATCH_ATTENDANCE_INCLUDE,
},
```

Pasar a `AdminMatchCard`:

```ts
attendanceNames={
  match.matchType === 'FRIENDLY'
    ? serializeMatchAttendance(match.attendances).map((row) => row.name)
    : []
}
```

En `AdminMatchCard`, bajo el encabezado de un amistoso `SCHEDULED`:

```tsx
{matchType === 'FRIENDLY' && attendanceNames.length >= 0 ? (
  <p className="mt-2 text-xs text-kelme-gray-600">
    {attendanceCountLabel(attendanceNames.length)}
    {attendanceNames.length > 0 ? `: ${attendanceNames.join(', ')}` : ''}
  </p>
) : null}
```

Mostrar también con 0 (`0 anotados`) para que el admin vea que el listado existe.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/match-attendance.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-attendance.ts src/app/(tenant)/[organizationSlug]/(dashboard)/admin/matches/page.tsx src/components/admin/AdminMatchCard.tsx tests/lib/match-attendance.test.ts
git commit -m "feat: show friendly RSVP names on admin match cards"
```

---

## Verificación final (después de Task 8)

Run:

```bash
npx vitest run tests/lib/match-attendance.test.ts tests/lib/validations-match-attendance.test.ts tests/lib/proxy-policy.test.ts tests/lib/org-public-landing.test.ts tests/lib/admin-nav.test.ts
npx tsc --noEmit
```

Expected: 0 failures.

Manual en `loslunes` (amistoso `SCHEDULED` a futuro):

1. Sin sesión: `/{slug}#asistencia` muestra la lista y **Ingresa para anotar tu nombre**.
2. Login como jugador con ficha → **Voy** → tu nombre aparece al final; recargar mantiene el orden.
3. Dos pestañas / dos usuarios: ambos pueden anotarse; no se pisan (unique).
4. **Ya no voy** saca el nombre.
5. Sin ficha: mensaje de enlace, sin botón Voy.
6. Al pasar el partido a LIVE, el botón desaparece y queda el texto de cierre.
7. Admin ve el conteo en `/admin/matches`.
8. Un partido de liga no muestra la sección.

Prod: aplicar `20260907120000_match_attendance` con `node scripts/prisma-migrate-production.mjs deploy` (o el flujo actual de `DIRECT_URL`) **antes** del deploy que use el modelo. Actualizar `docs/handoff/SESSION-CONTEXT.md` en la misma sesión de prod.

---

## Spec coverage (self-review)

| Requisito | Task |
|-----------|------|
| Lista compartida tipo “escribo mi nombre” | 5, 6 |
| Sin choque de mensajes (unique + upsert) | 1, 4 |
| Solo el próximo amistoso | 2 (`findNextFriendlyAttendanceWhere`), 6, 7 |
| Login para anotarse; lista visible | 3, 4, 6 |
| Cierre al iniciar el partido | 2, 4, 5 |
| No mezclar con convocatoria/lados | Constraints + Task 4 no toca `FriendlyMatchPlayer` |
| Admin ve quién va | 8 |
| es-CL, tú | Constraints + copy en widget |
| Multi-org sin cookie | Task 4 `match.organizationId` |
| Sin WhatsApp / Expo / Realtime | Constraints (fuera de v1) |

## Placeholder scan

Sin TBD, “similar a Task N” ni “añadir error handling” suelto. Firmas de `MatchAttendanceEntry`, `AttendanceViewer` y helpers coinciden entre tasks.

## Type consistency

- `MatchAttendanceEntry.createdAt` es `string` ISO en UI y GET.
- `canOpenMatchAttendance` recibe `{ matchType, status }`.
- API y widget usan el mismo JSON `{ matchId, open, attendees }`.
