# Admin CRUD completo + Identidad Kelme — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el panel de administración (editar/eliminar en todas las entidades, gestión de usuarios, manejo de errores en formularios) y cerrar la identidad de marca Kelme (seed con naming Kelme, iconos PWA reales, favicon).

**Architecture:** Se mantiene el patrón existente: páginas server components que consultan Prisma directamente + formularios client components que llaman a la API REST (`/api/*`) protegida con `requireRole`. Se agrega un helper compartido `submitJson` para manejo uniforme de errores, rutas `[id]` con PUT/DELETE por entidad, y componentes cliente de tabla editable por entidad. La identidad Kelme se cierra con assets generados desde el SVG existente (sharp) y renombrando el seed base.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + PostgreSQL, Auth.js v5, Zod v4, Tailwind v4, Vitest, sharp (solo dev, generación de iconos)

---

## Contexto para el implementador

- El proyecto corre con `npm run dev` (custom server con Socket.io). Build: `npm run build`. Tests: `npm run test`.
- La API ya tiene GET/POST para teams, players, seasons, matches, y PUT/DELETE **solo** para teams (`src/app/api/teams/[id]/route.ts`). Sigue ese patrón.
- `requireRole([Role.ADMIN])` (de `src/lib/auth.ts`) lanza si no hay permiso — ya se usa en todas las rutas.
- En Next.js 16 los `params` de route handlers son `Promise` — ya se maneja con `await params` (ver `teams/[id]/route.ts`).
- Clases CSS de marca ya definidas en `globals.css`: `input-kelme`, `btn-kelme`, `card-kelme`, colores `kelme-*`.
- **Dato importante:** existen datos demo con IDs que NO son cuid (ej. `demo-team-norte`). Los schemas Zod actuales usan `.cuid()`, lo que rompe la validación al operar sobre entidades demo. La Task 2 corrige esto.
- Los formularios admin actuales tienen un bug: `e.currentTarget.reset()` después de un `await` — React ya limpió `currentTarget` y explota con `Cannot read properties of null`. Además ignoran errores de la API. La Task 1 corrige ambos.

---

## Mapa de archivos

```
src/
├── components/admin/
│   ├── submit.ts                  # CREAR — helper fetch JSON + extracción de error
│   ├── DeleteButton.tsx           # CREAR — botón eliminar con confirm
│   ├── TeamForm.tsx               # MODIFICAR — error feedback + select de DT
│   ├── PlayerForm.tsx             # MODIFICAR — fix reset + error feedback
│   ├── SeasonForm.tsx             # MODIFICAR — fix reset + error feedback
│   ├── MatchForm.tsx              # MODIFICAR — fix reset + error feedback
│   ├── TeamsTable.tsx             # CREAR — tabla editable de equipos
│   ├── PlayersTable.tsx           # CREAR — tabla editable de jugadores
│   ├── SeasonsTable.tsx           # CREAR — tabla editable de temporadas
│   ├── MatchActions.tsx           # CREAR — editar/eliminar partido
│   ├── UserForm.tsx               # CREAR — alta de usuarios staff
│   └── UsersTable.tsx             # CREAR — tabla editable de usuarios
├── lib/validations/
│   ├── team.ts                    # MODIFICAR — updateTeamSchema, quitar .cuid()
│   ├── player.ts                  # MODIFICAR — updatePlayerSchema, quitar .cuid()
│   ├── match.ts                   # MODIFICAR — updateMatchSchema, quitar .cuid()
│   ├── season.ts                  # CREAR — mover schema desde la ruta + update
│   └── user.ts                    # CREAR — createUserSchema, updateUserSchema
├── app/api/
│   ├── players/[id]/route.ts      # CREAR — PUT, DELETE
│   ├── seasons/[id]/route.ts      # CREAR — PUT, DELETE
│   ├── matches/[id]/route.ts      # CREAR — PUT, DELETE
│   ├── teams/[id]/route.ts        # MODIFICAR — DELETE seguro, updateTeamSchema
│   ├── users/route.ts             # CREAR — GET, POST
│   └── users/[id]/route.ts        # CREAR — PUT, DELETE
├── app/(dashboard)/admin/
│   ├── teams/page.tsx             # MODIFICAR — usa TeamsTable
│   ├── players/page.tsx           # MODIFICAR — usa PlayersTable
│   ├── seasons/page.tsx           # MODIFICAR — usa SeasonsTable
│   ├── matches/page.tsx           # MODIFICAR — usa MatchActions
│   ├── users/page.tsx             # CREAR — gestión de usuarios
│   ├── layout.tsx                 # MODIFICAR — nav item Usuarios
│   └── page.tsx                   # MODIFICAR — card Usuarios
├── app/icon.svg                   # CREAR — favicon Kelme (convención Next)
tests/lib/validations.test.ts      # CREAR — tests de schemas nuevos
prisma/seed.ts                     # MODIFICAR — naming Kelme
scripts/generate-icons.mjs         # CREAR — genera PNGs desde icon.svg
public/manifest.json               # MODIFICAR — iconos PNG
public/icons/icon-192.png          # GENERADO
public/icons/icon-512.png          # GENERADO
```

---

# PARTE A — Pulir el Admin

### Task 1: Helper `submitJson` + fix de bug reset y errores en los 4 formularios

El bug: en `PlayerForm`, `SeasonForm` y `MatchForm` se llama `e.currentTarget.reset()` **después** de `await fetch(...)`. React recicla el evento sintético, `currentTarget` es `null` y explota. Además ningún formulario muestra errores de la API (ej. validación 400 o email duplicado).

**Files:**
- Create: `src/components/admin/submit.ts`
- Modify: `src/components/admin/TeamForm.tsx`
- Modify: `src/components/admin/PlayerForm.tsx`
- Modify: `src/components/admin/SeasonForm.tsx`
- Modify: `src/components/admin/MatchForm.tsx`

- [ ] **Step 1: Crear el helper `submitJson`**

Create `src/components/admin/submit.ts`:

```typescript
export type SubmitResult = { ok: true } | { ok: false; message: string }

// Las rutas API devuelven errores como { error: string } o
// { error: zodError.flatten() } → { fieldErrors: { campo: [msgs] } }
export async function submitJson(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<SubmitResult> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    return { ok: false, message: 'No se pudo conectar con el servidor' }
  }

  if (res.ok) return { ok: true }

  let message = `Error ${res.status}`
  try {
    const data = await res.json()
    if (typeof data?.error === 'string') {
      message = data.error
    } else if (data?.error?.fieldErrors) {
      const parts = Object.entries(
        data.error.fieldErrors as Record<string, string[]>
      )
        .filter(([, msgs]) => msgs.length > 0)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      if (parts.length > 0) message = parts.join(' · ')
    }
  } catch {
    // respuesta sin JSON — se mantiene el mensaje genérico
  }
  return { ok: false, message }
}
```

- [ ] **Step 2: Reescribir `PlayerForm` con captura del form y error visible**

Replace `src/components/admin/PlayerForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type Team = { id: string; name: string }

export function PlayerForm({ teams }: { teams: Team[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const result = await submitJson('/api/players', 'POST', {
      email: form.get('email'),
      name: form.get('name'),
      password: form.get('password'),
      teamId: form.get('teamId') || undefined,
      jerseyNumber: form.get('jerseyNumber')
        ? Number(form.get('jerseyNumber'))
        : undefined,
      position: form.get('position') || undefined,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
      <input name="name" placeholder="Nombre" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="password" type="password" placeholder="Contraseña" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <select name="teamId" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Sin equipo</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <input name="jerseyNumber" type="number" min={1} max={99} placeholder="Dorsal" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="position" placeholder="Posición" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      {error && <p className="font-ui text-sm text-kelme-red md:col-span-3">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-3">
        {loading ? 'Creando...' : 'Crear jugador'}
      </button>
    </form>
  )
}
```

Nota: conservar los campos/estructura visual que ya existen en el archivo actual (el bloque de arriba respeta el grid y clases actuales; si el archivo actual tiene algún campo adicional, mantenerlo con el mismo patrón).

- [ ] **Step 3: Reescribir `SeasonForm` con el mismo patrón**

Replace `src/components/admin/SeasonForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

export function SeasonForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const result = await submitJson('/api/seasons', 'POST', {
      name: form.get('name'),
      startDate: new Date(form.get('startDate') as string).toISOString(),
      endDate: new Date(form.get('endDate') as string).toISOString(),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-4">
      <input name="name" placeholder="Nombre temporada" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="startDate" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="endDate" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50">
        {loading ? 'Creando...' : 'Crear temporada'}
      </button>
      {error && <p className="font-ui text-sm text-kelme-red md:col-span-4">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 4: Reescribir `MatchForm` con el mismo patrón**

En `src/components/admin/MatchForm.tsx` aplicar exactamente el mismo cambio de patrón (mantener todos los selects/inputs existentes):

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type Option = { id: string; name: string }

type Props = {
  seasons: Option[]
  teams: Option[]
  referees: Array<{ id: string; name: string }>
}

export function MatchForm({ seasons, teams, referees }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const date = form.get('date') as string
    const time = form.get('time') as string
    const result = await submitJson('/api/matches', 'POST', {
      seasonId: form.get('seasonId'),
      homeTeamId: form.get('homeTeamId'),
      awayTeamId: form.get('awayTeamId'),
      refereeId: form.get('refereeId') || undefined,
      venue: form.get('venue') || undefined,
      scheduledAt: new Date(`${date}T${time}`).toISOString(),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
      <select name="seasonId" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Temporada</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select name="homeTeamId" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Local</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select name="awayTeamId" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Visitante</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select name="refereeId" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        <option value="">Árbitro</option>
        {referees.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <input name="date" type="date" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="time" type="time" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="venue" placeholder="Cancha" className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2" />
      {error && <p className="font-ui text-sm text-kelme-red md:col-span-3">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50">
        {loading ? 'Creando...' : 'Crear partido'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Actualizar `TeamForm` con error feedback (sin bug de reset porque usa estado controlado)**

Replace `src/components/admin/TeamForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

export function TeamForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await submitJson('/api/teams', 'POST', { name })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setName('')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del equipo"
          required
          className="rounded-lg border border-kelme-border bg-kelme-surface px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
        >
          Crear equipo
        </button>
      </form>
      {error && <p className="font-ui text-sm text-kelme-red">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: build exitoso sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/
git commit -m "fix: form reset crash and surface API errors in admin forms"
```

---

### Task 2: Schemas de validación para update + usuarios (TDD)

Además de los schemas nuevos, se corrige un bug real: los schemas usan `.cuid()` para IDs, pero los datos demo usan IDs como `demo-team-norte`, con lo cual crear un partido con equipos demo falla la validación. Se reemplaza `.cuid()` por `.min(1)`.

**Files:**
- Test: `tests/lib/validations.test.ts` (crear)
- Modify: `src/lib/validations/team.ts`
- Modify: `src/lib/validations/player.ts`
- Modify: `src/lib/validations/match.ts`
- Create: `src/lib/validations/season.ts`
- Create: `src/lib/validations/user.ts`

- [ ] **Step 1: Escribir tests que fallan**

Create `tests/lib/validations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createMatchSchema, updateMatchSchema } from '@/lib/validations/match'
import { updatePlayerSchema } from '@/lib/validations/player'
import { createSeasonSchema, updateSeasonSchema } from '@/lib/validations/season'
import { createUserSchema, updateUserSchema } from '@/lib/validations/user'

describe('match validations', () => {
  it('accepts demo-style (non-cuid) ids', () => {
    const result = createMatchSchema.safeParse({
      seasonId: 'demo-season-2026',
      homeTeamId: 'demo-team-norte',
      awayTeamId: 'demo-team-sur',
      scheduledAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it('updateMatchSchema accepts partial update with status', () => {
    const result = updateMatchSchema.safeParse({ status: 'CANCELLED' })
    expect(result.success).toBe(true)
  })

  it('updateMatchSchema rejects invalid status', () => {
    const result = updateMatchSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('updateMatchSchema allows unassigning referee with null', () => {
    const result = updateMatchSchema.safeParse({ refereeId: null })
    expect(result.success).toBe(true)
  })
})

describe('player validations', () => {
  it('updatePlayerSchema allows moving player out of a team', () => {
    const result = updatePlayerSchema.safeParse({ teamId: null })
    expect(result.success).toBe(true)
  })

  it('updatePlayerSchema rejects jersey number over 99', () => {
    const result = updatePlayerSchema.safeParse({ jerseyNumber: 100 })
    expect(result.success).toBe(false)
  })
})

describe('season validations', () => {
  it('createSeasonSchema accepts valid season', () => {
    const result = createSeasonSchema.safeParse({
      name: 'Torneos Kelme 2027',
      startDate: '2027-03-01T00:00:00.000Z',
      endDate: '2027-11-30T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('updateSeasonSchema accepts isActive toggle only', () => {
    const result = updateSeasonSchema.safeParse({ isActive: false })
    expect(result.success).toBe(true)
  })
})

describe('user validations', () => {
  it('createUserSchema accepts staff roles', () => {
    const result = createUserSchema.safeParse({
      email: 'nuevo-dt@liga.com',
      name: 'Nuevo DT',
      password: 'password123',
      role: 'COACH',
    })
    expect(result.success).toBe(true)
  })

  it('createUserSchema rejects PLAYER role (se crean desde Jugadores)', () => {
    const result = createUserSchema.safeParse({
      email: 'x@liga.com',
      name: 'X',
      password: 'password123',
      role: 'PLAYER',
    })
    expect(result.success).toBe(false)
  })

  it('updateUserSchema allows changing name without password', () => {
    const result = updateUserSchema.safeParse({ name: 'Nombre Nuevo' })
    expect(result.success).toBe(true)
  })

  it('updateUserSchema rejects short password when provided', () => {
    const result = updateUserSchema.safeParse({ password: '123' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Correr tests y verificar que fallan**

Run: `npm run test`
Expected: FAIL — no existen `updateMatchSchema`, `season.ts`, `user.ts`, etc.

- [ ] **Step 3: Implementar los schemas**

Replace `src/lib/validations/match.ts`:

```typescript
import { z } from 'zod'

const id = z.string().min(1)

export const createMatchSchema = z.object({
  seasonId: id,
  homeTeamId: id,
  awayTeamId: id,
  refereeId: id.optional(),
  scheduledAt: z.string().datetime(),
  venue: z.string().optional(),
})

export const updateMatchSchema = z.object({
  refereeId: id.nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  venue: z.string().nullable().optional(),
  status: z
    .enum(['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED'])
    .optional(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>
```

Replace `src/lib/validations/player.ts`:

```typescript
import { z } from 'zod'

const id = z.string().min(1)

export const createPlayerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  teamId: id.optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().optional(),
})

export const updatePlayerSchema = z.object({
  teamId: id.nullable().optional(),
  jerseyNumber: z.number().int().min(1).max(99).nullable().optional(),
  position: z.string().nullable().optional(),
})

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
```

Replace `src/lib/validations/team.ts`:

```typescript
import { z } from 'zod'

const id = z.string().min(1)

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coachId: id.optional(),
})

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal('')),
  coachId: id.nullable().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
```

Create `src/lib/validations/season.ts` (el schema hoy vive inline en `src/app/api/seasons/route.ts` — se centraliza acá):

```typescript
import { z } from 'zod'

export const createSeasonSchema = z.object({
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export const updateSeasonSchema = z.object({
  name: z.string().min(2).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>
```

Create `src/lib/validations/user.ts` (solo roles staff — los jugadores se crean desde `/admin/players`):

```typescript
import { z } from 'zod'

export const staffRoles = ['ADMIN', 'COACH', 'REFEREE'] as const

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(staffRoles),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(staffRoles).optional(),
  password: z.string().min(6).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

- [ ] **Step 4: Actualizar la ruta de seasons para usar el schema centralizado**

En `src/app/api/seasons/route.ts` eliminar el `seasonSchema` inline y el import de `zod`, e importar el nuevo:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createSeasonSchema } from '@/lib/validations/season'
import { Role } from '@prisma/client'

export async function GET() {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  return NextResponse.json(seasons)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createSeasonSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const season = await db.season.create({
    data: {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  })
  return NextResponse.json(season, { status: 201 })
}
```

- [ ] **Step 5: Correr tests y verificar que pasan**

Run: `npm run test`
Expected: PASS (los 7 tests previos + los nuevos).

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/ src/app/api/seasons/route.ts tests/lib/validations.test.ts
git commit -m "feat: add update/user validation schemas and accept non-cuid ids"
```

---

### Task 3: API PUT/DELETE para jugadores

**Files:**
- Create: `src/app/api/players/[id]/route.ts`

- [ ] **Step 1: Crear la ruta**

Create `src/app/api/players/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updatePlayerSchema } from '@/lib/validations/player'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updatePlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const player = await db.player.update({
    where: { id },
    data: parsed.data,
    include: { user: { select: { name: true, email: true } }, team: true },
  })
  return NextResponse.json(player)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const player = await db.player.findUnique({ where: { id } })
  if (!player) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }

  // Sin onDelete cascade en el schema: limpiar dependencias en orden.
  await db.$transaction([
    db.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: null } }),
    db.callUp.deleteMany({ where: { playerId: id } }),
    db.playerEvaluation.deleteMany({ where: { playerId: id } }),
    db.player.delete({ where: { id } }),
    db.user.delete({ where: { id: player.userId } }),
  ])
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/players/
git commit -m "feat: add player update and delete endpoints"
```

---

### Task 4: API PUT/DELETE para temporadas

**Files:**
- Create: `src/app/api/seasons/[id]/route.ts`

- [ ] **Step 1: Crear la ruta**

Create `src/app/api/seasons/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateSeasonSchema } from '@/lib/validations/season'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateSeasonSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { startDate, endDate, ...rest } = parsed.data
  const season = await db.season.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  })
  return NextResponse.json(season)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const matchCount = await db.match.count({ where: { seasonId: id } })
  if (matchCount > 0) {
    return NextResponse.json(
      { error: `La temporada tiene ${matchCount} partido(s). Eliminalos primero.` },
      { status: 409 }
    )
  }

  await db.season.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/seasons/
git commit -m "feat: add season update and delete endpoints"
```

---

### Task 5: API PUT/DELETE para partidos + DELETE seguro de equipos

**Files:**
- Create: `src/app/api/matches/[id]/route.ts`
- Modify: `src/app/api/teams/[id]/route.ts`

- [ ] **Step 1: Crear la ruta de partidos**

Create `src/app/api/matches/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateMatchSchema } from '@/lib/validations/match'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { scheduledAt, ...rest } = parsed.data
  const match = await db.match.update({
    where: { id },
    data: {
      ...rest,
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
    },
    include: { homeTeam: true, awayTeam: true },
  })
  return NextResponse.json(match)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  await db.$transaction([
    db.matchEvent.deleteMany({ where: { matchId: id } }),
    db.callUp.deleteMany({ where: { matchId: id } }),
    db.playerEvaluation.deleteMany({ where: { matchId: id } }),
    db.match.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Endurecer DELETE de equipos y usar `updateTeamSchema`**

Hoy `DELETE /api/teams/[id]` falla con error 500 de FK si el equipo tiene jugadores o partidos. Replace `src/app/api/teams/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateTeamSchema } from '@/lib/validations/team'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateTeamSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const team = await db.team.update({ where: { id }, data: parsed.data })
  return NextResponse.json(team)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const matchCount = await db.match.count({
    where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
  })
  if (matchCount > 0) {
    return NextResponse.json(
      { error: `El equipo tiene ${matchCount} partido(s). Eliminalos primero.` },
      { status: 409 }
    )
  }

  await db.$transaction([
    db.player.updateMany({ where: { teamId: id }, data: { teamId: null } }),
    db.team.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/matches/ src/app/api/teams/
git commit -m "feat: add match update/delete endpoints and safe team deletion"
```

---

### Task 6: Componente compartido `DeleteButton`

**Files:**
- Create: `src/components/admin/DeleteButton.tsx`

- [ ] **Step 1: Crear el componente**

Create `src/components/admin/DeleteButton.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type Props = {
  url: string
  confirmMessage: string
}

export function DeleteButton({ url, confirmMessage }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return
    setLoading(true)
    setError('')
    const result = await submitJson(url, 'DELETE')
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg border border-kelme-border px-2 py-1 text-xs text-kelme-red hover:border-kelme-red disabled:opacity-50"
      >
        {loading ? '...' : 'Eliminar'}
      </button>
      {error && <span className="text-xs text-kelme-red">{error}</span>}
    </span>
  )
}
```

- [ ] **Step 2: Verificar build y commit**

Run: `npm run build` → exitoso.

```bash
git add src/components/admin/DeleteButton.tsx
git commit -m "feat: add shared delete button with confirm for admin tables"
```

---

### Task 7: UI editar/eliminar Equipos (con asignación de DT)

**Files:**
- Create: `src/components/admin/TeamsTable.tsx`
- Modify: `src/app/(dashboard)/admin/teams/page.tsx`

- [ ] **Step 1: Crear `TeamsTable`**

Create `src/components/admin/TeamsTable.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type TeamRow = {
  id: string
  name: string
  coachId: string | null
  coachName: string | null
  playerCount: number
}

export type CoachOption = {
  id: string
  name: string
  assignedTeamId: string | null
}

export function TeamsTable({ teams, coaches }: { teams: TeamRow[]; coaches: CoachOption[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [coachId, setCoachId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(team: TeamRow) {
    setEditingId(team.id)
    setName(team.name)
    setCoachId(team.coachId ?? '')
    setError('')
  }

  async function save(teamId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/teams/${teamId}`, 'PUT', {
      name,
      coachId: coachId || null,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">DT</th>
            <th className="p-3">Jugadores</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className="border-t border-kelme-border">
              {editingId === team.id ? (
                <>
                  <td className="p-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      value={coachId}
                      onChange={(e) => setCoachId(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    >
                      <option value="">Sin DT</option>
                      {coaches.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={c.assignedTeamId !== null && c.assignedTeamId !== team.id}
                        >
                          {c.name}
                          {c.assignedTeamId && c.assignedTeamId !== team.id ? ' (asignado)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">{team.playerCount}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => save(team.id)}
                        disabled={saving}
                        className="rounded-lg bg-kelme-red px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                      {error && <span className="text-xs text-kelme-red">{error}</span>}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{team.name}</td>
                  <td className="p-3">{team.coachName ?? '—'}</td>
                  <td className="p-3">{team.playerCount}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(team)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        url={`/api/teams/${team.id}`}
                        confirmMessage={`¿Eliminar el equipo ${team.name}? Sus jugadores quedarán sin equipo.`}
                      />
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar la página de equipos**

Replace `src/app/(dashboard)/admin/teams/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { TeamForm } from '@/components/admin/TeamForm'
import { TeamsTable } from '@/components/admin/TeamsTable'

export default async function AdminTeamsPage() {
  const [teams, coaches] = await Promise.all([
    db.team.findMany({
      include: { coach: true, _count: { select: { players: true } } },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { role: Role.COACH },
      select: { id: true, name: true, coachedTeam: { select: { id: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Equipos</h1>
      <TeamForm />
      <TeamsTable
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          coachId: t.coachId,
          coachName: t.coach?.name ?? null,
          playerCount: t._count.players,
        }))}
        coaches={coaches.map((c) => ({
          id: c.id,
          name: c.name,
          assignedTeamId: c.coachedTeam?.id ?? null,
        }))}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar build y commit**

Run: `npm run build` → exitoso.

```bash
git add "src/components/admin/TeamsTable.tsx" "src/app/(dashboard)/admin/teams/page.tsx"
git commit -m "feat: edit and delete teams with coach assignment in admin"
```

---

### Task 8: UI editar/eliminar Jugadores

**Files:**
- Create: `src/components/admin/PlayersTable.tsx`
- Modify: `src/app/(dashboard)/admin/players/page.tsx`

- [ ] **Step 1: Crear `PlayersTable`**

Create `src/components/admin/PlayersTable.tsx` (mismo patrón que `TeamsTable`; nombre y email son de solo lectura — se editan desde Usuarios):

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type PlayerRow = {
  id: string
  name: string
  email: string
  teamId: string | null
  teamName: string | null
  jerseyNumber: number | null
  position: string | null
}

type TeamOption = { id: string; name: string }

export function PlayersTable({ players, teams }: { players: PlayerRow[]; teams: TeamOption[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(player: PlayerRow) {
    setEditingId(player.id)
    setTeamId(player.teamId ?? '')
    setJerseyNumber(player.jerseyNumber?.toString() ?? '')
    setPosition(player.position ?? '')
    setError('')
  }

  async function save(playerId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/players/${playerId}`, 'PUT', {
      teamId: teamId || null,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
      position: position || null,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Email</th>
            <th className="p-3">Equipo</th>
            <th className="p-3">Dorsal</th>
            <th className="p-3">Posición</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className="border-t border-kelme-border">
              <td className="p-3">{player.name}</td>
              <td className="p-3">{player.email}</td>
              {editingId === player.id ? (
                <>
                  <td className="p-3">
                    <select
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    >
                      <option value="">Sin equipo</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                      className="w-16 rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-32 rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => save(player.id)}
                        disabled={saving}
                        className="rounded-lg bg-kelme-red px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                      {error && <span className="text-xs text-kelme-red">{error}</span>}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{player.teamName ?? '—'}</td>
                  <td className="p-3">{player.jerseyNumber ?? '—'}</td>
                  <td className="p-3">{player.position ?? '—'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(player)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        url={`/api/players/${player.id}`}
                        confirmMessage={`¿Eliminar al jugador ${player.name}? Se borra también su usuario.`}
                      />
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar la página de jugadores**

Replace `src/app/(dashboard)/admin/players/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { PlayerForm } from '@/components/admin/PlayerForm'
import { PlayersTable } from '@/components/admin/PlayersTable'

export default async function AdminPlayersPage() {
  const [players, teams] = await Promise.all([
    db.player.findMany({
      include: {
        user: { select: { name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Jugadores</h1>
      <PlayerForm teams={teams} />
      <PlayersTable
        players={players.map((p) => ({
          id: p.id,
          name: p.user.name,
          email: p.user.email,
          teamId: p.team?.id ?? null,
          teamName: p.team?.name ?? null,
          jerseyNumber: p.jerseyNumber,
          position: p.position,
        }))}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar build y commit**

Run: `npm run build` → exitoso.

```bash
git add "src/components/admin/PlayersTable.tsx" "src/app/(dashboard)/admin/players/page.tsx"
git commit -m "feat: edit and delete players in admin"
```

---

### Task 9: UI editar/eliminar Temporadas

**Files:**
- Create: `src/components/admin/SeasonsTable.tsx`
- Modify: `src/app/(dashboard)/admin/seasons/page.tsx`

- [ ] **Step 1: Crear `SeasonsTable`**

Create `src/components/admin/SeasonsTable.tsx` (las fechas llegan como string ISO `yyyy-mm-dd` para inputs `type="date"`):

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type SeasonRow = {
  id: string
  name: string
  startDate: string // yyyy-mm-dd
  endDate: string // yyyy-mm-dd
  isActive: boolean
}

export function SeasonsTable({ seasons }: { seasons: SeasonRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(season: SeasonRow) {
    setEditingId(season.id)
    setName(season.name)
    setStartDate(season.startDate)
    setEndDate(season.endDate)
    setIsActive(season.isActive)
    setError('')
  }

  async function save(seasonId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/seasons/${seasonId}`, 'PUT', {
      name,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isActive,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Inicio</th>
            <th className="p-3">Fin</th>
            <th className="p-3">Activa</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.id} className="border-t border-kelme-border">
              {editingId === season.id ? (
                <>
                  <td className="p-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => save(season.id)}
                        disabled={saving}
                        className="rounded-lg bg-kelme-red px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                      {error && <span className="text-xs text-kelme-red">{error}</span>}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{season.name}</td>
                  <td className="p-3">{season.startDate}</td>
                  <td className="p-3">{season.endDate}</td>
                  <td className="p-3">{season.isActive ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(season)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        url={`/api/seasons/${season.id}`}
                        confirmMessage={`¿Eliminar la temporada ${season.name}?`}
                      />
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar la página de temporadas**

Replace `src/app/(dashboard)/admin/seasons/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { SeasonForm } from '@/components/admin/SeasonForm'
import { SeasonsTable } from '@/components/admin/SeasonsTable'

export default async function AdminSeasonsPage() {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Temporadas</h1>
      <SeasonForm />
      <SeasonsTable
        seasons={seasons.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate.toISOString().slice(0, 10),
          endDate: s.endDate.toISOString().slice(0, 10),
          isActive: s.isActive,
        }))}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar build y commit**

Run: `npm run build` → exitoso.

```bash
git add "src/components/admin/SeasonsTable.tsx" "src/app/(dashboard)/admin/seasons/page.tsx"
git commit -m "feat: edit and delete seasons in admin"
```

---

### Task 10: UI editar/eliminar Partidos

**Files:**
- Create: `src/components/admin/MatchActions.tsx`
- Modify: `src/app/(dashboard)/admin/matches/page.tsx`

- [ ] **Step 1: Crear `MatchActions`**

Create `src/components/admin/MatchActions.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type MatchRow = {
  id: string
  label: string // "Local vs Visitante"
  refereeId: string | null
  venue: string | null
  status: string
  date: string // yyyy-mm-dd
  time: string // HH:mm
}

type RefereeOption = { id: string; name: string }

const STATUSES = ['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED'] as const

export function MatchActions({ match, referees }: { match: MatchRow; referees: RefereeOption[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [refereeId, setRefereeId] = useState(match.refereeId ?? '')
  const [venue, setVenue] = useState(match.venue ?? '')
  const [status, setStatus] = useState(match.status)
  const [date, setDate] = useState(match.date)
  const [time, setTime] = useState(match.time)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/matches/${match.id}`, 'PUT', {
      refereeId: refereeId || null,
      venue: venue || null,
      status,
      scheduledAt: new Date(`${date}T${time}`).toISOString(),
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
        >
          Editar
        </button>
        <DeleteButton
          url={`/api/matches/${match.id}`}
          confirmMessage={`¿Eliminar el partido ${match.label}? Se borran sus eventos y citaciones.`}
        />
      </span>
    )
  }

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-kelme-border bg-kelme-gray-100 p-3 md:grid-cols-3">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        value={refereeId}
        onChange={(e) => setRefereeId(e.target.value)}
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      >
        <option value="">Sin árbitro</option>
        {referees.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <input
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        placeholder="Cancha"
        className="rounded-lg border border-kelme-border bg-white px-2 py-1 text-sm"
      />
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-kelme-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-kelme-border px-3 py-1 text-xs"
        >
          Cancelar
        </button>
      </span>
      {error && <p className="text-xs text-kelme-red md:col-span-3">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Integrar en la página de partidos**

Replace `src/app/(dashboard)/admin/matches/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { MatchForm } from '@/components/admin/MatchForm'
import { MatchActions } from '@/components/admin/MatchActions'
import Link from 'next/link'
import { Role } from '@prisma/client'

export default async function AdminMatchesPage() {
  const [matches, seasons, teams, referees] = await Promise.all([
    db.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: { select: { name: true } },
        season: true,
      },
      orderBy: { scheduledAt: 'desc' },
    }),
    db.season.findMany({ orderBy: { startDate: 'desc' } }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
    db.user.findMany({
      where: { role: Role.REFEREE },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Partidos</h1>
      <MatchForm seasons={seasons} teams={teams} referees={referees} />
      <div className="space-y-3">
        {matches.map((match) => (
          <div key={match.id} className="rounded-xl border border-kelme-border bg-kelme-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </p>
                <p className="text-sm text-kelme-gray-400">
                  {match.season.name} · {match.scheduledAt.toLocaleString('es-AR')}
                  {match.referee ? ` · ${match.referee.name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg">
                  {match.homeScore} - {match.awayScore}
                </span>
                <span className="rounded-full bg-kelme-gray-100 px-3 py-1 text-xs">{match.status}</span>
                <Link href={`/live/${match.id}`} className="text-sm text-kelme-red hover:underline">
                  Ver en vivo
                </Link>
                <MatchActions
                  match={{
                    id: match.id,
                    label: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                    refereeId: match.refereeId,
                    venue: match.venue,
                    status: match.status,
                    date: match.scheduledAt.toISOString().slice(0, 10),
                    time: match.scheduledAt.toISOString().slice(11, 16),
                  }}
                  referees={referees}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Nota: `toISOString()` da hora UTC; el desfase con hora local es aceptable en esta iteración (mismo criterio que la creación de partidos, que también convierte a ISO).

- [ ] **Step 3: Verificar build y commit**

Run: `npm run build` → exitoso.

```bash
git add "src/components/admin/MatchActions.tsx" "src/app/(dashboard)/admin/matches/page.tsx"
git commit -m "feat: edit and delete matches in admin"
```

---

### Task 11: Gestión de usuarios staff (`/admin/users`)

**Files:**
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`
- Create: `src/components/admin/UserForm.tsx`
- Create: `src/components/admin/UsersTable.tsx`
- Create: `src/app/(dashboard)/admin/users/page.tsx`
- Modify: `src/app/(dashboard)/admin/layout.tsx`
- Modify: `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1: Crear `/api/users` (GET, POST)**

Create `src/app/api/users/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createUserSchema } from '@/lib/validations/user'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN])
  const users = await db.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.COACH, Role.REFEREE] } },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, password, role } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: { email, name, passwordHash, role },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 2: Crear `/api/users/[id]` (PUT, DELETE)**

Create `src/app/api/users/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateUserSchema } from '@/lib/validations/user'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { password, ...rest } = parsed.data
  const user = await db.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole([Role.ADMIN])
  const { id } = await params

  if (session.user.id === id) {
    return NextResponse.json({ error: 'No podés eliminar tu propio usuario' }, { status: 409 })
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { player: { select: { id: true } } },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  if (user.player) {
    return NextResponse.json(
      { error: 'Es un jugador: eliminalo desde la sección Jugadores' },
      { status: 409 }
    )
  }

  // Desvincular relaciones antes de borrar (sin onDelete cascade en el schema)
  await db.$transaction([
    db.team.updateMany({ where: { coachId: id }, data: { coachId: null } }),
    db.match.updateMany({ where: { refereeId: id }, data: { refereeId: null } }),
    db.user.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Crear `UserForm`**

Create `src/components/admin/UserForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  COACH: 'DT',
  REFEREE: 'Árbitro',
}

export function UserForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setLoading(true)
    setError('')
    const form = new FormData(formEl)
    const result = await submitJson('/api/users', 'POST', {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      role: form.get('role'),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-4">
      <input name="name" placeholder="Nombre" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <input name="password" type="password" placeholder="Contraseña" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2" />
      <select name="role" required className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2">
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {error && <p className="font-ui text-sm text-kelme-red md:col-span-4">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-4">
        {loading ? 'Creando...' : 'Crear usuario'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Crear `UsersTable`**

Create `src/components/admin/UsersTable.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type UserRow = {
  id: string
  name: string
  email: string
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  COACH: 'DT',
  REFEREE: 'Árbitro',
}

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('COACH')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setName(user.name)
    setRole(user.role)
    setPassword('')
    setError('')
  }

  async function save(userId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/users/${userId}`, 'PUT', {
      name,
      role,
      ...(password ? { password } : {}),
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Email</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-kelme-border">
              {editingId === user.id ? (
                <>
                  <td className="p-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nueva contraseña (opcional)"
                        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => save(user.id)}
                        disabled={saving}
                        className="rounded-lg bg-kelme-red px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                      {error && <span className="text-xs text-kelme-red">{error}</span>}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{ROLE_LABELS[user.role] ?? user.role}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      {user.id !== currentUserId && (
                        <DeleteButton
                          url={`/api/users/${user.id}`}
                          confirmMessage={`¿Eliminar al usuario ${user.name}?`}
                        />
                      )}
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Crear la página `/admin/users`**

Create `src/app/(dashboard)/admin/users/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'
import { UserForm } from '@/components/admin/UserForm'
import { UsersTable } from '@/components/admin/UsersTable'

export default async function AdminUsersPage() {
  const session = await auth()
  const users = await db.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.COACH, Role.REFEREE] } },
    select: { id: true, email: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Usuarios</h1>
      <p className="text-sm text-kelme-gray-400">
        Admins, DTs y árbitros. Los jugadores se gestionan desde la sección Jugadores.
      </p>
      <UserForm />
      <UsersTable users={users} currentUserId={session!.user.id} />
    </div>
  )
}
```

- [ ] **Step 6: Agregar Usuarios al nav y al home del admin**

En `src/app/(dashboard)/admin/layout.tsx`, agregar al array `ADMIN_NAV`:

```typescript
const ADMIN_NAV = [
  { href: '/admin', label: 'Inicio' },
  { href: '/admin/teams', label: 'Equipos' },
  { href: '/admin/players', label: 'Jugadores' },
  { href: '/admin/matches', label: 'Partidos' },
  { href: '/admin/seasons', label: 'Temporadas' },
  { href: '/admin/users', label: 'Usuarios' },
]
```

En `src/app/(dashboard)/admin/page.tsx`, agregar al array de cards:

```typescript
{ href: '/admin/users', label: 'Usuarios' },
```

- [ ] **Step 7: Verificar build y commit**

Run: `npm run build` → exitoso.

```bash
git add src/app/api/users/ src/components/admin/UserForm.tsx src/components/admin/UsersTable.tsx "src/app/(dashboard)/admin/"
git commit -m "feat: add staff user management to admin"
```

---

# PARTE B — Cerrar identidad Kelme

### Task 12: Seed base con naming Kelme

El seed base todavía crea "Equipo Marca FC" (nombre pre-branding). Los datos demo ya usan naming Kelme.

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Renombrar el equipo del seed**

En `prisma/seed.ts`, cambiar el upsert del equipo (nota: se agrega `update` con el nombre para que bases existentes también se actualicen al re-correr el seed):

```typescript
  const team = await prisma.team.upsert({
    where: { id: 'seed-team-1' },
    update: { name: 'Kelme FC' },
    create: {
      id: 'seed-team-1',
      name: 'Kelme FC',
    },
  })
```

- [ ] **Step 2: Verificar ejecutando el seed**

Run: `npx prisma db seed`
Expected: `Seed OK: { admin: 'admin@liga.com' }` y el equipo renombrado (verificar en `/admin/teams`).

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: rename base seed team to Kelme branding"
```

---

### Task 13: Iconos PWA PNG + favicon Kelme

Hoy el manifest solo referencia un SVG; Android/Chrome requieren PNG (192 y 512) para instalar la PWA. Se generan desde el SVG existente con `sharp`. Además se agrega `src/app/icon.svg` (convención de Next.js App Router) para que el favicon sea el isotipo Kelme en vez del default.

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `src/app/icon.svg`
- Modify: `public/manifest.json`
- Modify: `package.json` (script `icons`)
- Generated: `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Step 1: Instalar sharp como dependencia dev**

Run: `npm install -D sharp`

- [ ] **Step 2: Crear el script de generación**

Create `scripts/generate-icons.mjs`:

```javascript
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const SOURCE = 'public/icons/icon.svg'
const SIZES = [192, 512]

await mkdir('public/icons', { recursive: true })

for (const size of SIZES) {
  const out = `public/icons/icon-${size}.png`
  await sharp(SOURCE, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`✓ ${out}`)
}
```

- [ ] **Step 3: Agregar script npm y generar**

En `package.json`, agregar a `scripts`:

```json
"icons": "node scripts/generate-icons.mjs"
```

Run: `npm run icons`
Expected:

```
✓ public/icons/icon-192.png
✓ public/icons/icon-512.png
```

- [ ] **Step 4: Actualizar el manifest**

Replace el array `icons` en `public/manifest.json`:

```json
{
  "name": "Torneos Kelme",
  "short_name": "Torneos Kelme",
  "description": "Plataforma oficial de gestión de torneos KELME con marcador en vivo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#CD212A",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 5: Crear el favicon con convención de Next**

Create `src/app/icon.svg` (isotipo sin texto, legible a 16px):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#CD212A"/>
  <path d="M160 340 C160 240, 220 180, 300 180 C360 180, 400 220, 400 270 C400 320, 360 360, 300 380 L256 400 L212 380 C180 365, 160 350, 160 340 Z" fill="none" stroke="#FFFFFF" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="330" cy="250" r="22" fill="#FFFFFF"/>
</svg>
```

Si existe `src/app/favicon.ico` (default de create-next-app), eliminarlo para que Next use `icon.svg`.

- [ ] **Step 6: Verificar**

Run: `npm run build`
Expected: build exitoso. Luego `npm run dev` y comprobar:
- Favicon Kelme en la pestaña del navegador
- `http://localhost:3000/manifest.json` lista los 4 iconos
- `http://localhost:3000/icons/icon-192.png` responde la imagen

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-icons.mjs src/app/icon.svg public/manifest.json public/icons/ package.json package-lock.json
git rm --cached src/app/favicon.ico 2>$null
git commit -m "feat: add PWA PNG icons and Kelme favicon"
```

---

## Pendientes bloqueados (fuera de este plan)

Estos ítems del spec de diseño siguen bloqueados por decisiones/assets del usuario y **no** se incluyen:

- **Logo oficial KELME**: cuando haya PNG/SVG oficial, reemplazar el path del isotipo en `src/components/kelme/KelmeLogo.tsx`, `public/icons/icon.svg` y `src/app/icon.svg`, y re-correr `npm run icons`.
- Confirmar si la liga es fútbol 11, futsal o ambos.
- Confirmar modo claro global vs. dark por defecto (hoy: claro en dashboards, dark solo en `/live`).

---

## Self-Review

**1. Spec coverage:**

| Requisito | Task |
|-----------|------|
| Fix bug `reset()` en formularios | Task 1 |
| Feedback de errores API en formularios | Task 1 (crear), Tasks 7-11 (editar/eliminar) |
| Editar/eliminar equipos | Tasks 5 (API), 7 (UI) |
| Editar/eliminar jugadores | Tasks 3 (API), 8 (UI) |
| Editar/eliminar temporadas | Tasks 4 (API), 9 (UI) |
| Editar/eliminar partidos | Tasks 5 (API), 10 (UI) |
| Gestión de usuarios staff | Task 11 |
| Asignar DT a equipo desde admin | Task 7 |
| Seed con naming Kelme | Task 12 |
| Iconos PWA + favicon | Task 13 |
| IDs demo no-cuid rompen validación (bug encontrado) | Task 2 |

**2. Placeholder scan:** sin TBD/TODO. Todos los pasos con código completo y comandos con salida esperada.

**3. Type consistency:** `submitJson` (Task 1) se usa en Tasks 6-11 con la misma firma. `updateTeamSchema`/`updatePlayerSchema`/`updateSeasonSchema`/`updateMatchSchema`/`createUserSchema`/`updateUserSchema` definidos en Task 2 coinciden con los usos en Tasks 3-5 y 11. `DeleteButton` (Task 6) usado en Tasks 7-11 con props `url`/`confirmMessage`. `session.user.id` existe (declarado en `src/types/next-auth.d.ts`).
