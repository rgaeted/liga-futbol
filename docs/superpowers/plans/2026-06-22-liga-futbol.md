# Liga de Fútbol — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una aplicación web multi-rol para gestionar una liga de fútbol de marca, con marcador en vivo y datos de partido en tiempo real, preparada para convertirse en app móvil.

**Architecture:** Monorepo con Next.js 15 (App Router) como frontend + API REST, Prisma/PostgreSQL como capa de datos, Auth.js para autenticación por roles, y Socket.io para eventos en vivo del partido. La API es la única fuente de verdad — la app móvil futura consumirá los mismos endpoints y canal WebSocket. Se implementa en 4 fases entregables: (1) fundación + auth, (2) admin + entidades core, (3) jugador + DT, (4) árbitro + marcador en vivo + PWA.

**Tech Stack:** Next.js 15, TypeScript, Prisma, PostgreSQL, Auth.js v5, Socket.io, Tailwind CSS, shadcn/ui, Vitest, Zod, React Hook Form

---

## Mapa de archivos (estructura final)

```
liga-futbol/
├── prisma/
│   └── schema.prisma              # Modelos: User, Team, Player, Match, MatchEvent, etc.
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/             # CRUD equipos, jugadores, partidos, temporadas
│   │   │   ├── player/            # Dashboard jugador
│   │   │   ├── coach/             # Citaciones, evaluaciones, plantilla
│   │   │   └── referee/           # Control de partido en vivo
│   │   ├── live/[matchId]/page.tsx # Marcador público en vivo
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── teams/route.ts
│   │       ├── players/route.ts
│   │       ├── matches/route.ts
│   │       ├── matches/[id]/events/route.ts
│   │       ├── callups/route.ts
│   │       └── evaluations/route.ts
│   ├── components/
│   │   ├── ui/                    # shadcn
│   │   ├── live/LiveScoreboard.tsx
│   │   ├── referee/MatchControlPanel.tsx
│   │   └── coach/CallUpForm.tsx
│   ├── lib/
│   │   ├── auth.ts                # Config Auth.js + helpers de rol
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── roles.ts               # Enum y guards de permisos
│   │   ├── validations/           # Schemas Zod
│   │   └── socket.ts              # Cliente Socket.io (browser)
│   ├── server/
│   │   └── socket.ts              # Servidor Socket.io (custom server)
│   └── types/
│       └── index.ts
├── server.ts                      # Entry point: Next.js + Socket.io
├── tests/
│   ├── lib/roles.test.ts
│   ├── api/teams.test.ts
│   └── api/match-events.test.ts
├── vitest.config.ts
├── package.json
└── .env.example
```

---

## Roles y permisos

| Rol | Código | Permisos |
|-----|--------|----------|
| Jugador | `PLAYER` | Ver sus datos, partidos pasados/futuros, estadísticas |
| Admin | `ADMIN` | CRUD completo: equipos, jugadores, partidos, temporadas, usuarios |
| DT (Director Técnico) | `COACH` | Citaciones, armar plantilla, evaluar jugadores de su equipo |
| Árbitro/Turno | `REFEREE` | Registrar eventos en partido asignado: goles, tarjetas, tiros, cambios |

---

## Fase 1 — Fundación

### Task 1: Scaffolding del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example`
- Create: `vitest.config.ts`

- [ ] **Step 1: Crear proyecto Next.js con TypeScript**

Run:
```bash
cd liga-futbol
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

- [ ] **Step 2: Instalar dependencias core**

Run:
```bash
npm install prisma @prisma/client next-auth@beta bcryptjs zod react-hook-form @hookform/resolvers socket.io socket.io-client date-fns
npm install -D vitest @vitejs/plugin-react jsdom @types/bcryptjs prisma
```

- [ ] **Step 3: Configurar Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Crear `.env.example`**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/liga_futbol"
AUTH_SECRET="genera-un-secreto-largo-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 5: Verificar que el proyecto arranca**

Run: `npm run dev`
Expected: App en `http://localhost:3000`

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with core dependencies"
```

---

### Task 2: Schema de base de datos (Prisma)

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Inicializar Prisma**

Run:
```bash
npx prisma init
```

- [ ] **Step 2: Escribir schema completo**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  PLAYER
  ADMIN
  COACH
  REFEREE
}

enum MatchStatus {
  SCHEDULED
  LIVE
  HALFTIME
  FINISHED
  CANCELLED
}

enum EventType {
  GOAL
  OWN_GOAL
  YELLOW_CARD
  RED_CARD
  SHOT_ON_TARGET
  SHOT_OFF_TARGET
  SUBSTITUTION
  FOUL
  KICKOFF
  HALFTIME
  FULLTIME
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  role          Role
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  player        Player?
  coachedTeam   Team?    @relation("TeamCoach")
  refereeMatches Match[] @relation("MatchReferee")
}

model Team {
  id        String   @id @default(cuid())
  name      String
  logoUrl   String?
  coachId   String?  @unique
  coach     User?    @relation("TeamCoach", fields: [coachId], references: [id])
  players   Player[]
  homeMatches Match[] @relation("HomeTeam")
  awayMatches Match[] @relation("AwayTeam")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Player {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  teamId       String?
  team         Team?    @relation(fields: [teamId], references: [id])
  jerseyNumber Int?
  position     String?
  goals        Int      @default(0)
  assists      Int      @default(0)
  yellowCards  Int      @default(0)
  redCards     Int      @default(0)
  callUps      CallUp[]
  evaluations  PlayerEvaluation[]
  matchEvents  MatchEvent[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Season {
  id        String   @id @default(cuid())
  name      String
  startDate DateTime
  endDate   DateTime
  isActive  Boolean  @default(true)
  matches   Match[]
  createdAt DateTime @default(now())
}

model Match {
  id           String      @id @default(cuid())
  seasonId     String
  season       Season      @relation(fields: [seasonId], references: [id])
  homeTeamId   String
  homeTeam     Team        @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeamId   String
  awayTeam     Team        @relation("AwayTeam", fields: [awayTeamId], references: [id])
  refereeId    String?
  referee      User?       @relation("MatchReferee", fields: [refereeId], references: [id])
  scheduledAt  DateTime
  venue        String?
  status       MatchStatus @default(SCHEDULED)
  homeScore    Int         @default(0)
  awayScore    Int         @default(0)
  events       MatchEvent[]
  callUps      CallUp[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model MatchEvent {
  id          String    @id @default(cuid())
  matchId     String
  match       Match     @relation(fields: [matchId], references: [id])
  type        EventType
  minute      Int
  playerId    String?
  player      Player?   @relation(fields: [playerId], references: [id])
  teamId      String?
  description String?
  metadata    Json?
  createdAt   DateTime  @default(now())
}

model CallUp {
  id        String   @id @default(cuid())
  matchId   String
  match     Match    @relation(fields: [matchId], references: [id])
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  isStarter Boolean  @default(false)
  createdAt DateTime @default(now())

  @@unique([matchId, playerId])
}

model PlayerEvaluation {
  id        String   @id @default(cuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  coachId   String
  matchId   String?
  rating    Int
  notes     String?
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Crear Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 4: Ejecutar migración**

Run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: Migración aplicada sin errores.

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: add database schema for league management"
```

---

### Task 3: Roles y permisos

**Files:**
- Create: `src/lib/roles.ts`
- Test: `tests/lib/roles.test.ts`

- [ ] **Step 1: Escribir test fallido**

Create `tests/lib/roles.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { Role } from '@prisma/client'
import { canAccess, getDashboardPath } from '@/lib/roles'

describe('roles', () => {
  it('admin can access admin routes', () => {
    expect(canAccess(Role.ADMIN, 'admin')).toBe(true)
  })

  it('player cannot access admin routes', () => {
    expect(canAccess(Role.PLAYER, 'admin')).toBe(false)
  })

  it('returns correct dashboard path per role', () => {
    expect(getDashboardPath(Role.COACH)).toBe('/coach')
    expect(getDashboardPath(Role.REFEREE)).toBe('/referee')
  })
})
```

- [ ] **Step 2: Ejecutar test — debe fallar**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/roles'`

- [ ] **Step 3: Implementar roles**

Create `src/lib/roles.ts`:

```typescript
import { Role } from '@prisma/client'

type RouteArea = 'admin' | 'player' | 'coach' | 'referee' | 'live'

const ROLE_ACCESS: Record<Role, RouteArea[]> = {
  [Role.ADMIN]: ['admin', 'player', 'coach', 'referee', 'live'],
  [Role.PLAYER]: ['player', 'live'],
  [Role.COACH]: ['coach', 'live'],
  [Role.REFEREE]: ['referee', 'live'],
}

export function canAccess(role: Role, area: RouteArea): boolean {
  return ROLE_ACCESS[role].includes(area)
}

export function getDashboardPath(role: Role): string {
  const paths: Record<Role, string> = {
    [Role.ADMIN]: '/admin',
    [Role.PLAYER]: '/player',
    [Role.COACH]: '/coach',
    [Role.REFEREE]: '/referee',
  }
  return paths[role]
}
```

- [ ] **Step 4: Ejecutar test — debe pasar**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/roles.ts tests/lib/roles.test.ts
git commit -m "feat: add role-based access helpers"
```

---

### Task 4: Autenticación (Auth.js)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/middleware.ts`
- Create: `prisma/seed.ts`

- [ ] **Step 1: Configurar Auth.js**

Create `src/lib/auth.ts`:

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { getDashboardPath } from '@/lib/roles'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})

export async function requireRole(allowedRoles: string[]) {
  const session = await auth()
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  return session
}
```

Create `src/types/next-auth.d.ts`:

```typescript
import { Role } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: Role
  }
  interface Session {
    user: {
      id: string
      role: Role
      email: string
      name: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    id: string
  }
}
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 2: Crear seed con usuarios de prueba**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@liga.com' },
    update: {},
    create: {
      email: 'admin@liga.com',
      name: 'Admin Liga',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  const team = await prisma.team.upsert({
    where: { id: 'seed-team-1' },
    update: {},
    create: {
      id: 'seed-team-1',
      name: 'Equipo Marca FC',
    },
  })

  const coach = await prisma.user.upsert({
    where: { email: 'dt@liga.com' },
    update: {},
    create: {
      email: 'dt@liga.com',
      name: 'Director Técnico',
      passwordHash,
      role: Role.COACH,
    },
  })

  await prisma.team.update({
    where: { id: team.id },
    data: { coachId: coach.id },
  })

  const playerUser = await prisma.user.upsert({
    where: { email: 'jugador@liga.com' },
    update: {},
    create: {
      email: 'jugador@liga.com',
      name: 'Juan Pérez',
      passwordHash,
      role: Role.PLAYER,
    },
  })

  await prisma.player.upsert({
    where: { userId: playerUser.id },
    update: {},
    create: {
      userId: playerUser.id,
      teamId: team.id,
      jerseyNumber: 10,
      position: 'Delantero',
    },
  })

  await prisma.user.upsert({
    where: { email: 'arbitro@liga.com' },
    update: {},
    create: {
      email: 'arbitro@liga.com',
      name: 'Árbitro Principal',
      passwordHash,
      role: Role.REFEREE,
    },
  })

  console.log('Seed OK:', { admin: admin.email })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Run: `npm install -D tsx && npx prisma db seed`

- [ ] **Step 3: Crear página de login**

Create `src/app/(auth)/login/page.tsx`:

```tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenciales inválidas')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-slate-900 p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-white">Liga Fútbol</h1>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Middleware de protección por rol**

Create `src/middleware.ts`:

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { canAccess } from '@/lib/roles'
import { Role } from '@prisma/client'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/api/auth')

  if (isPublic) return NextResponse.next()

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = req.auth.user.role as Role
  const area = pathname.split('/')[1] as 'admin' | 'player' | 'coach' | 'referee'

  if (['admin', 'player', 'coach', 'referee'].includes(area) && !canAccess(role, area)) {
    return NextResponse.redirect(new URL(`/${area === role.toLowerCase() ? area : 'login'}`, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Página raíz con redirect por rol**

Create `src/app/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/roles'
import { Role } from '@prisma/client'

export default async function HomePage() {
  const session = await auth()
  if (!session) redirect('/login')
  redirect(getDashboardPath(session.user.role as Role))
}
```

- [ ] **Step 6: Verificar login manual**

Run: `npm run dev`
- Ir a `/login`
- Login: `admin@liga.com` / `password123`
- Expected: Redirect a `/admin` (404 por ahora — auth funciona)

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth src/app/(auth) src/middleware.ts src/app/page.tsx src/types prisma/seed.ts
git commit -m "feat: add Auth.js with role-based login and middleware"
```

---

## Fase 2 — Admin y entidades core

### Task 5: Validaciones Zod compartidas

**Files:**
- Create: `src/lib/validations/team.ts`
- Create: `src/lib/validations/player.ts`
- Create: `src/lib/validations/match.ts`
- Create: `src/lib/validations/match-event.ts`

- [ ] **Step 1: Schemas Zod**

Create `src/lib/validations/team.ts`:

```typescript
import { z } from 'zod'

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coachId: z.string().cuid().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
```

Create `src/lib/validations/player.ts`:

```typescript
import { z } from 'zod'

export const createPlayerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  teamId: z.string().cuid().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  position: z.string().optional(),
})

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
```

Create `src/lib/validations/match.ts`:

```typescript
import { z } from 'zod'

export const createMatchSchema = z.object({
  seasonId: z.string().cuid(),
  homeTeamId: z.string().cuid(),
  awayTeamId: z.string().cuid(),
  refereeId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime(),
  venue: z.string().optional(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>
```

Create `src/lib/validations/match-event.ts`:

```typescript
import { z } from 'zod'
import { EventType } from '@prisma/client'

export const createMatchEventSchema = z.object({
  type: z.nativeEnum(EventType),
  minute: z.number().int().min(0).max(130),
  playerId: z.string().cuid().optional(),
  teamId: z.string().cuid().optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/
git commit -m "feat: add Zod validation schemas for core entities"
```

---

### Task 6: API Admin — Equipos

**Files:**
- Create: `src/app/api/teams/route.ts`
- Create: `src/app/api/teams/[id]/route.ts`
- Test: `tests/api/teams.test.ts`

- [ ] **Step 1: Test fallido**

Create `tests/api/teams.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createTeamSchema } from '@/lib/validations/team'

describe('teams API validation', () => {
  it('accepts valid team name', () => {
    const result = createTeamSchema.safeParse({ name: 'Equipo A' })
    expect(result.success).toBe(true)
  })

  it('rejects empty team name', () => {
    const result = createTeamSchema.safeParse({ name: 'A' })
    expect(result.success).toBe(false)
  })
})
```

Run: `npm test` — Expected: PASS (validación)

- [ ] **Step 2: API route GET/POST equipos**

Create `src/app/api/teams/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createTeamSchema } from '@/lib/validations/team'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN, Role.COACH, Role.PLAYER, Role.REFEREE])
  const teams = await db.team.findMany({
    include: { coach: { select: { id: true, name: true } }, _count: { select: { players: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const body = await req.json()
  const parsed = createTeamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const team = await db.team.create({ data: parsed.data })
  return NextResponse.json(team, { status: 201 })
}
```

Create `src/app/api/teams/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createTeamSchema } from '@/lib/validations/team'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const body = await req.json()
  const parsed = createTeamSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const team = await db.team.update({ where: { id }, data: parsed.data })
  return NextResponse.json(team)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  await db.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/teams tests/api/teams.test.ts
git commit -m "feat: add teams CRUD API"
```

---

### Task 7: UI Admin — Equipos y Jugadores

**Files:**
- Create: `src/app/(dashboard)/admin/layout.tsx`
- Create: `src/app/(dashboard)/admin/page.tsx`
- Create: `src/app/(dashboard)/admin/teams/page.tsx`
- Create: `src/app/(dashboard)/admin/players/page.tsx`
- Create: `src/components/admin/TeamForm.tsx`
- Create: `src/components/admin/PlayerForm.tsx`

- [ ] **Step 1: Instalar shadcn/ui**

Run:
```bash
npx shadcn@latest init -y
npx shadcn@latest add button input label table card form select
```

- [ ] **Step 2: Layout admin**

Create `src/app/(dashboard)/admin/layout.tsx`:

```tsx
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== Role.ADMIN) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex gap-6">
          <Link href="/admin" className="font-bold text-emerald-400">Admin</Link>
          <Link href="/admin/teams">Equipos</Link>
          <Link href="/admin/players">Jugadores</Link>
          <Link href="/admin/matches">Partidos</Link>
          <Link href="/admin/seasons">Temporadas</Link>
        </div>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
          <button className="text-sm text-slate-400 hover:text-white">Salir</button>
        </form>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Página equipos con tabla + formulario**

Create `src/app/(dashboard)/admin/teams/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { TeamForm } from '@/components/admin/TeamForm'

export default async function AdminTeamsPage() {
  const teams = await db.team.findMany({
    include: { coach: true, _count: { select: { players: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Equipos</h1>
      <TeamForm />
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">DT</th>
              <th className="p-3">Jugadores</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-t border-slate-800">
                <td className="p-3">{team.name}</td>
                <td className="p-3">{team.coach?.name ?? '—'}</td>
                <td className="p-3">{team._count.players}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

Create `src/components/admin/TeamForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TeamForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setName('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del equipo"
        required
        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
      >
        Crear equipo
      </button>
    </form>
  )
}
```

- [ ] **Step 4: API y página de jugadores** (mismo patrón)

Create `src/app/api/players/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createPlayerSchema } from '@/lib/validations/player'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN, Role.COACH])
  const players = await db.player.findMany({
    include: { user: { select: { name: true, email: true } }, team: { select: { name: true } } },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const body = await req.json()
  const parsed = createPlayerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, password, teamId, jerseyNumber, position } = parsed.data
  const passwordHash = await bcrypt.hash(password, 10)

  const player = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash, role: Role.PLAYER },
    })
    return tx.player.create({
      data: { userId: user.id, teamId, jerseyNumber, position },
      include: { user: true, team: true },
    })
  })

  return NextResponse.json(player, { status: 201 })
}
```

Create `src/app/(dashboard)/admin/players/page.tsx` y `src/components/admin/PlayerForm.tsx` siguiendo el mismo patrón de equipos (formulario con email, nombre, contraseña, equipo, dorsal, posición → POST `/api/players`).

- [ ] **Step 5: Verificar en browser**

Run: `npm run dev`
- Login como admin
- Crear un equipo nuevo
- Crear un jugador y asignarlo al equipo
- Expected: Aparecen en las tablas

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/admin src/components/admin src/app/api/players
git commit -m "feat: add admin UI for teams and players"
```

---

### Task 8: Temporadas y Partidos (Admin)

**Files:**
- Create: `src/app/api/seasons/route.ts`
- Create: `src/app/api/matches/route.ts`
- Create: `src/app/api/matches/[id]/route.ts`
- Create: `src/app/(dashboard)/admin/seasons/page.tsx`
- Create: `src/app/(dashboard)/admin/matches/page.tsx`
- Create: `src/components/admin/MatchForm.tsx`

- [ ] **Step 1: API temporadas**

Create `src/app/api/seasons/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'

const seasonSchema = z.object({
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export async function GET() {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  return NextResponse.json(seasons)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = seasonSchema.safeParse(await req.json())
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

- [ ] **Step 2: API partidos**

Create `src/app/api/matches/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createMatchSchema } from '@/lib/validations/match'
import { Role } from '@prisma/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const teamId = searchParams.get('teamId')

  const matches = await db.match.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(teamId
        ? { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] }
        : {}),
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      referee: { select: { id: true, name: true } },
      season: true,
    },
    orderBy: { scheduledAt: 'asc' },
  })
  return NextResponse.json(matches)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.homeTeamId === parsed.data.awayTeamId) {
    return NextResponse.json({ error: 'Home and away team must differ' }, { status: 400 })
  }

  const match = await db.match.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
    include: { homeTeam: true, awayTeam: true },
  })
  return NextResponse.json(match, { status: 201 })
}
```

- [ ] **Step 3: UI admin partidos**

Create `src/app/(dashboard)/admin/matches/page.tsx` — lista de partidos con estado, equipos, fecha, árbitro asignado + `MatchForm` que carga equipos/temporadas/árbitros desde API y crea partido.

- [ ] **Step 4: Verificar**

- Crear temporada "2026 Apertura"
- Crear partido entre dos equipos con árbitro asignado
- Expected: Partido visible en lista con status SCHEDULED

- [ ] **Step 5: Commit**

```bash
git add src/app/api/seasons src/app/api/matches src/app/(dashboard)/admin
git commit -m "feat: add seasons and matches management"
```

---

## Fase 3 — Jugador y DT

### Task 9: Dashboard del Jugador

**Files:**
- Create: `src/app/(dashboard)/player/layout.tsx`
- Create: `src/app/(dashboard)/player/page.tsx`
- Create: `src/app/(dashboard)/player/matches/page.tsx`
- Create: `src/app/(dashboard)/player/stats/page.tsx`

- [ ] **Step 1: Layout jugador**

Create `src/app/(dashboard)/player/layout.tsx` (mismo patrón que admin, links: Inicio, Mis Partidos, Estadísticas).

- [ ] **Step 2: Página principal con resumen**

Create `src/app/(dashboard)/player/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PlayerDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      team: true,
      callUps: {
        include: {
          match: {
            include: { homeTeam: true, awayTeam: true },
          },
        },
        orderBy: { match: { scheduledAt: 'desc' } },
        take: 5,
      },
    },
  })

  if (!player) {
    return <p className="text-white">Perfil de jugador no encontrado.</p>
  }

  const upcoming = player.callUps.filter(
    (c) => c.match.status === 'SCHEDULED' || c.match.status === 'LIVE'
  )
  const played = player.callUps.filter((c) => c.match.status === 'FINISHED')

  return (
    <div className="space-y-6 text-white">
      <header>
        <h1 className="text-2xl font-bold">{session.user.name}</h1>
        <p className="text-slate-400">
          {player.team?.name ?? 'Sin equipo'} · #{player.jerseyNumber ?? '—'} · {player.position ?? '—'}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Goles" value={player.goals} />
        <StatCard label="Asistencias" value={player.assists} />
        <StatCard label="Amarillas" value={player.yellowCards} />
        <StatCard label="Rojas" value={player.redCards} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximos partidos</h2>
        <MatchList items={upcoming} emptyText="No hay partidos programados." />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Partidos jugados</h2>
        <MatchList items={played.slice(0, 5)} emptyText="Aún no jugaste partidos." />
      </section>

      <Link href="/player/matches" className="text-emerald-400 hover:underline">
        Ver todos mis partidos →
      </Link>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
      <p className="text-2xl font-bold text-emerald-400">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

function MatchList({
  items,
  emptyText,
}: {
  items: Array<{ match: { id: string; scheduledAt: Date; homeTeam: { name: string }; awayTeam: { name: string }; homeScore: number; awayScore: number; status: string } }>
  emptyText: string
}) {
  if (items.length === 0) return <p className="text-slate-500">{emptyText}</p>
  return (
    <ul className="space-y-2">
      {items.map(({ match }) => (
        <li key={match.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="flex justify-between">
            <span>
              {match.homeTeam.name} vs {match.awayTeam.name}
            </span>
            <span className="font-mono">
              {match.status === 'FINISHED'
                ? `${match.homeScore} - ${match.awayScore}`
                : new Date(match.scheduledAt).toLocaleDateString('es-AR')}
            </span>
          </div>
          {match.status === 'LIVE' && (
            <Link href={`/live/${match.id}`} className="text-xs text-red-400">
              EN VIVO →
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Verificar con jugador@liga.com**

Expected: Dashboard muestra stats, partidos (vacíos hasta citaciones).

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/player
git commit -m "feat: add player dashboard with stats and match history"
```

---

### Task 10: Citaciones (DT)

**Files:**
- Create: `src/app/api/callups/route.ts`
- Create: `src/app/(dashboard)/coach/layout.tsx`
- Create: `src/app/(dashboard)/coach/page.tsx`
- Create: `src/app/(dashboard)/coach/callups/[matchId]/page.tsx`
- Create: `src/components/coach/CallUpForm.tsx`

- [ ] **Step 1: API citaciones**

Create `src/app/api/callups/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'

const callUpSchema = z.object({
  matchId: z.string().cuid(),
  playerIds: z.array(z.string().cuid()).min(7).max(23),
  starters: z.array(z.string().cuid()),
})

export async function GET(req: Request) {
  const session = await requireRole([Role.COACH, Role.ADMIN])
  const { searchParams } = new URL(req.url)
  const matchId = searchParams.get('matchId')
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 })
  }

  const callUps = await db.callUp.findMany({
    where: { matchId },
    include: { player: { include: { user: { select: { name: true } } } } },
  })
  return NextResponse.json(callUps)
}

export async function POST(req: Request) {
  const session = await requireRole([Role.COACH, Role.ADMIN])
  const parsed = callUpSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { matchId, playerIds, starters } = parsed.data

  // Verificar que el DT solo cite jugadores de su equipo
  if (session.user.role === Role.COACH) {
    const team = await db.team.findUnique({ where: { coachId: session.user.id } })
    if (!team) {
      return NextResponse.json({ error: 'Coach has no team' }, { status: 403 })
    }
    const teamPlayers = await db.player.findMany({
      where: { teamId: team.id, id: { in: playerIds } },
    })
    if (teamPlayers.length !== playerIds.length) {
      return NextResponse.json({ error: 'Invalid players for team' }, { status: 403 })
    }
  }

  await db.callUp.deleteMany({ where: { matchId, playerId: { in: playerIds } } })

  const callUps = await db.$transaction(
    playerIds.map((playerId) =>
      db.callUp.create({
        data: {
          matchId,
          playerId,
          isStarter: starters.includes(playerId),
        },
      })
    )
  )

  return NextResponse.json(callUps, { status: 201 })
}
```

- [ ] **Step 2: UI citaciones del DT**

Create `src/app/(dashboard)/coach/page.tsx` — lista partidos del equipo del DT (filtrar por `homeTeamId` o `awayTeamId` del equipo que entrena).

Create `src/components/coach/CallUpForm.tsx` — checklist de jugadores del equipo, marcar titulares/suplentes, submit a POST `/api/callups`.

- [ ] **Step 3: Verificar flujo**

- Login como `dt@liga.com`
- Seleccionar partido → citar jugadores
- Login como `jugador@liga.com` → ver partido en "Próximos"

- [ ] **Step 4: Commit**

```bash
git add src/app/api/callups src/app/(dashboard)/coach src/components/coach
git commit -m "feat: add coach call-ups for match squads"
```

---

### Task 11: Evaluaciones de jugadores (DT)

**Files:**
- Create: `src/app/api/evaluations/route.ts`
- Create: `src/app/(dashboard)/coach/evaluations/page.tsx`
- Create: `src/components/coach/EvaluationForm.tsx`

- [ ] **Step 1: API evaluaciones**

Create `src/app/api/evaluations/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'

const evaluationSchema = z.object({
  playerId: z.string().cuid(),
  matchId: z.string().cuid().optional(),
  rating: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const session = await requireRole([Role.COACH, Role.ADMIN])
  const parsed = evaluationSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const evaluation = await db.playerEvaluation.create({
    data: {
      ...parsed.data,
      coachId: session.user.id,
    },
  })
  return NextResponse.json(evaluation, { status: 201 })
}

export async function GET(req: Request) {
  await requireRole([Role.COACH, Role.ADMIN, Role.PLAYER])
  const { searchParams } = new URL(req.url)
  const playerId = searchParams.get('playerId')
  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const evaluations = await db.playerEvaluation.findMany({
    where: { playerId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(evaluations)
}
```

- [ ] **Step 2: UI evaluaciones** — formulario con slider 1-10, notas, selector de jugador y partido opcional.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/evaluations src/app/(dashboard)/coach/evaluations src/components/coach/EvaluationForm.tsx
git commit -m "feat: add player evaluations by coach"
```

---

## Fase 4 — Árbitro y Marcador en Vivo

### Task 12: Servidor Socket.io

**Files:**
- Create: `src/server/socket.ts`
- Create: `server.ts`
- Create: `src/lib/socket-client.ts`
- Modify: `package.json` scripts

- [ ] **Step 1: Servidor Socket.io**

Create `src/server/socket.ts`:

```typescript
import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import type { MatchEvent } from '@prisma/client'

export type LiveMatchPayload = {
  matchId: string
  homeScore: number
  awayScore: number
  status: string
  event?: MatchEvent
}

let io: Server | null = null

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000' },
  })

  io.on('connection', (socket) => {
    socket.on('join-match', (matchId: string) => {
      socket.join(`match:${matchId}`)
    })

    socket.on('leave-match', (matchId: string) => {
      socket.leave(`match:${matchId}`)
    })
  })

  return io
}

export function emitMatchUpdate(payload: LiveMatchPayload) {
  io?.to(`match:${payload.matchId}`).emit('match-update', payload)
}
```

Create `server.ts`:

```typescript
import { createServer } from 'http'
import next from 'next'
import { initSocket } from './src/server/socket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res))
  initSocket(httpServer)

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
```

Update `package.json`:
```json
"dev": "tsx server.ts",
"start": "NODE_ENV=production tsx server.ts"
```

Run: `npm install -D tsx`

- [ ] **Step 2: Cliente Socket.io**

Create `src/lib/socket-client.ts`:

```typescript
'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? '', {
      autoConnect: false,
    })
  }
  return socket
}

export function joinMatchRoom(matchId: string) {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.emit('join-match', matchId)
}
```

Add to `.env.example`:
```env
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

- [ ] **Step 3: Commit**

```bash
git add src/server/socket.ts server.ts src/lib/socket-client.ts package.json
git commit -m "feat: add Socket.io server for live match updates"
```

---

### Task 13: API eventos de partido (Árbitro)

**Files:**
- Create: `src/app/api/matches/[id]/events/route.ts`
- Create: `src/lib/match-events.ts`
- Test: `tests/api/match-events.test.ts`

- [ ] **Step 1: Lógica de negocio para eventos**

Create `src/lib/match-events.ts`:

```typescript
import { db } from '@/lib/db'
import { EventType, MatchStatus } from '@prisma/client'
import { emitMatchUpdate } from '@/server/socket'
import type { CreateMatchEventInput } from '@/lib/validations/match-event'

export async function registerMatchEvent(matchId: string, input: CreateMatchEventInput) {
  const match = await db.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  })

  const event = await db.matchEvent.create({
    data: { matchId, ...input },
  })

  let homeScore = match.homeScore
  let awayScore = match.awayScore
  let status = match.status

  if (input.type === EventType.GOAL && input.teamId) {
    if (input.teamId === match.homeTeamId) homeScore += 1
    if (input.teamId === match.awayTeamId) awayScore += 1
  }
  if (input.type === EventType.OWN_GOAL && input.teamId) {
    if (input.teamId === match.homeTeamId) awayScore += 1
    if (input.teamId === match.awayTeamId) homeScore += 1
  }
  if (input.type === EventType.KICKOFF) status = MatchStatus.LIVE
  if (input.type === EventType.HALFTIME) status = MatchStatus.HALFTIME
  if (input.type === EventType.FULLTIME) status = MatchStatus.FINISHED

  const updatedMatch = await db.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status },
  })

  if (input.playerId) {
    if (input.type === EventType.GOAL) {
      await db.player.update({
        where: { id: input.playerId },
        data: { goals: { increment: 1 } },
      })
    }
    if (input.type === EventType.YELLOW_CARD) {
      await db.player.update({
        where: { id: input.playerId },
        data: { yellowCards: { increment: 1 } },
      })
    }
    if (input.type === EventType.RED_CARD) {
      await db.player.update({
        where: { id: input.playerId },
        data: { redCards: { increment: 1 } },
      })
    }
  }

  emitMatchUpdate({
    matchId,
    homeScore: updatedMatch.homeScore,
    awayScore: updatedMatch.awayScore,
    status: updatedMatch.status,
    event,
  })

  return { event, match: updatedMatch }
}
```

- [ ] **Step 2: Test de lógica de goles**

Create `tests/api/match-events.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createMatchEventSchema } from '@/lib/validations/match-event'
import { EventType } from '@prisma/client'

describe('match event validation', () => {
  it('accepts goal event', () => {
    const result = createMatchEventSchema.safeParse({
      type: EventType.GOAL,
      minute: 45,
      playerId: 'clxyz123456789012345678901',
      teamId: 'clxyz123456789012345678902',
    })
    expect(result.success).toBe(true)
  })

  it('rejects minute over 130', () => {
    const result = createMatchEventSchema.safeParse({
      type: EventType.GOAL,
      minute: 200,
    })
    expect(result.success).toBe(false)
  })
})
```

Run: `npm test` — Expected: PASS

- [ ] **Step 3: API route**

Create `src/app/api/matches/[id]/events/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createMatchEventSchema } from '@/lib/validations/match-event'
import { registerMatchEvent } from '@/lib/match-events'
import { Role } from '@prisma/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const events = await db.matchEvent.findMany({
    where: { matchId: id },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { minute: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole([Role.REFEREE, Role.ADMIN])
  const { id: matchId } = await params

  const match = await db.match.findUniqueOrThrow({ where: { id: matchId } })

  if (
    session.user.role === Role.REFEREE &&
    match.refereeId !== session.user.id
  ) {
    return NextResponse.json({ error: 'Not assigned referee' }, { status: 403 })
  }

  const parsed = createMatchEventSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const result = await registerMatchEvent(matchId, parsed.data)
  return NextResponse.json(result, { status: 201 })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/match-events.ts src/app/api/matches src/server tests/api/match-events.test.ts
git commit -m "feat: add match events API with live score updates"
```

---

### Task 14: Panel de control del Árbitro

**Files:**
- Create: `src/app/(dashboard)/referee/layout.tsx`
- Create: `src/app/(dashboard)/referee/page.tsx`
- Create: `src/app/(dashboard)/referee/match/[id]/page.tsx`
- Create: `src/components/referee/MatchControlPanel.tsx`

- [ ] **Step 1: Lista de partidos asignados**

Create `src/app/(dashboard)/referee/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RefereeDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const matches = await db.match.findMany({
    where: { refereeId: session.user.id },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <div className="space-y-4 text-white">
      <h1 className="text-2xl font-bold">Mis partidos</h1>
      {matches.map((match) => (
        <Link
          key={match.id}
          href={`/referee/match/${match.id}`}
          className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-emerald-600"
        >
          <p className="font-semibold">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </p>
          <p className="text-sm text-slate-400">
            {new Date(match.scheduledAt).toLocaleString('es-AR')} · {match.status}
          </p>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Panel de control con botones grandes**

Create `src/components/referee/MatchControlPanel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { EventType } from '@prisma/client'

type Player = { id: string; user: { name: string }; jerseyNumber: number | null }
type Team = { id: string; name: string; players: Player[] }

type Props = {
  matchId: string
  homeTeam: Team
  awayTeam: Team
  initialHomeScore: number
  initialAwayScore: number
  initialStatus: string
}

const QUICK_EVENTS = [
  { type: EventType.KICKOFF, label: '▶ Inicio', color: 'bg-emerald-600' },
  { type: EventType.GOAL, label: '⚽ Gol', color: 'bg-green-600' },
  { type: EventType.YELLOW_CARD, label: '🟨 Amarilla', color: 'bg-yellow-500 text-black' },
  { type: EventType.RED_CARD, label: '🟥 Roja', color: 'bg-red-600' },
  { type: EventType.SHOT_ON_TARGET, label: '🎯 Tiro al arco', color: 'bg-blue-600' },
  { type: EventType.SHOT_OFF_TARGET, label: '↗ Tiro fuera', color: 'bg-slate-600' },
  { type: EventType.SUBSTITUTION, label: '🔄 Cambio', color: 'bg-purple-600' },
  { type: EventType.FOUL, label: '⚠ Falta', color: 'bg-orange-600' },
  { type: EventType.HALFTIME, label: '⏸ Entretiempo', color: 'bg-slate-700' },
  { type: EventType.FULLTIME, label: '⏹ Final', color: 'bg-slate-800' },
] as const

export function MatchControlPanel({
  matchId,
  homeTeam,
  awayTeam,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
}: Props) {
  const [minute, setMinute] = useState(0)
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [status, setStatus] = useState(initialStatus)
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home')
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null)
  const [loading, setLoading] = useState(false)

  const activeTeam = selectedTeam === 'home' ? homeTeam : awayTeam

  async function submitEvent(type: EventType) {
    const needsPlayer = [
      EventType.GOAL,
      EventType.YELLOW_CARD,
      EventType.RED_CARD,
      EventType.SHOT_ON_TARGET,
      EventType.SHOT_OFF_TARGET,
      EventType.SUBSTITUTION,
    ].includes(type)

    if (needsPlayer && !selectedPlayer) {
      setPendingEvent(type)
      return
    }

    setLoading(true)
    const res = await fetch(`/api/matches/${matchId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        minute,
        playerId: selectedPlayer || undefined,
        teamId: activeTeam.id,
      }),
    })
    const data = await res.json()
    if (data.match) {
      setHomeScore(data.match.homeScore)
      setAwayScore(data.match.awayScore)
      setStatus(data.match.status)
    }
    setPendingEvent(null)
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 text-white">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-red-400">
          {status === 'LIVE' ? 'EN VIVO' : status}
        </p>
        <p className="text-5xl font-bold tabular-nums">
          {homeScore} - {awayScore}
        </p>
        <p className="text-slate-400">
          {homeTeam.name} vs {awayTeam.name}
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <label className="text-sm">Minuto</label>
        <input
          type="number"
          min={0}
          max={130}
          value={minute}
          onChange={(e) => setMinute(Number(e.target.value))}
          className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center text-xl font-bold"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedTeam('home')}
          className={`flex-1 rounded-lg py-2 ${selectedTeam === 'home' ? 'bg-emerald-600' : 'bg-slate-800'}`}
        >
          {homeTeam.name}
        </button>
        <button
          onClick={() => setSelectedTeam('away')}
          className={`flex-1 rounded-lg py-2 ${selectedTeam === 'away' ? 'bg-emerald-600' : 'bg-slate-800'}`}
        >
          {awayTeam.name}
        </button>
      </div>

      <select
        value={selectedPlayer}
        onChange={(e) => setSelectedPlayer(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3"
      >
        <option value="">Seleccionar jugador...</option>
        {activeTeam.players.map((p) => (
          <option key={p.id} value={p.id}>
            #{p.jerseyNumber ?? '—'} {p.user.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_EVENTS.map((ev) => (
          <button
            key={ev.type}
            disabled={loading}
            onClick={() => submitEvent(ev.type)}
            className={`rounded-xl py-4 text-lg font-bold ${ev.color} disabled:opacity-50`}
          >
            {ev.label}
          </button>
        ))}
      </div>

      {pendingEvent && (
        <p className="text-center text-yellow-400">
          Seleccioná un jugador para registrar este evento.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Página del partido para árbitro**

Create `src/app/(dashboard)/referee/match/[id]/page.tsx` — carga match + jugadores citados de ambos equipos, pasa props a `MatchControlPanel`.

- [ ] **Step 4: Verificar flujo árbitro**

- Login `arbitro@liga.com`
- Abrir partido asignado
- Registrar kickoff → gol → amarilla → final
- Expected: Marcador actualizado, stats de jugador incrementadas

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/referee src/components/referee
git commit -m "feat: add referee match control panel with quick actions"
```

---

### Task 15: Marcador en vivo (público)

**Files:**
- Create: `src/app/live/[matchId]/page.tsx`
- Create: `src/components/live/LiveScoreboard.tsx`

- [ ] **Step 1: Componente marcador en vivo**

Create `src/components/live/LiveScoreboard.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { getSocket, joinMatchRoom } from '@/lib/socket-client'
import type { LiveMatchPayload } from '@/server/socket'

type Match = {
  id: string
  homeTeam: { name: string }
  awayTeam: { name: string }
  homeScore: number
  awayScore: number
  status: string
  events: Array<{
    id: string
    type: string
    minute: number
    player?: { user: { name: string } } | null
  }>
}

export function LiveScoreboard({ initialMatch }: { initialMatch: Match }) {
  const [match, setMatch] = useState(initialMatch)

  useEffect(() => {
    joinMatchRoom(match.id)
    const socket = getSocket()

    function onUpdate(payload: LiveMatchPayload) {
      setMatch((prev) => ({
        ...prev,
        homeScore: payload.homeScore,
        awayScore: payload.awayScore,
        status: payload.status,
        events: payload.event
          ? [...prev.events, {
              id: payload.event.id,
              type: payload.event.type,
              minute: payload.event.minute,
              player: null,
            }]
          : prev.events,
      }))
    }

    socket.on('match-update', onUpdate)
    return () => {
      socket.off('match-update', onUpdate)
    }
  }, [match.id])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-2 text-center text-sm uppercase tracking-widest text-red-400">
          {match.status === 'LIVE' ? '● EN VIVO' : match.status}
        </p>

        <div className="mb-8 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex-1 text-center">
            <p className="text-lg font-semibold">{match.homeTeam.name}</p>
            <p className="text-6xl font-bold tabular-nums text-emerald-400">{match.homeScore}</p>
          </div>
          <p className="px-4 text-2xl text-slate-500">vs</p>
          <div className="flex-1 text-center">
            <p className="text-lg font-semibold">{match.awayTeam.name}</p>
            <p className="text-6xl font-bold tabular-nums text-emerald-400">{match.awayScore}</p>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-semibold">Cronología</h2>
        <ul className="space-y-2">
          {[...match.events].reverse().map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <span className="w-10 font-mono text-emerald-400">{event.minute}'</span>
              <span>{formatEvent(event.type)}</span>
              {event.player && (
                <span className="ml-auto text-slate-400">{event.player.user.name}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function formatEvent(type: string): string {
  const labels: Record<string, string> = {
    GOAL: '⚽ Gol',
    OWN_GOAL: '⚽ Gol en contra',
    YELLOW_CARD: '🟨 Tarjeta amarilla',
    RED_CARD: '🟥 Tarjeta roja',
    SHOT_ON_TARGET: '🎯 Tiro al arco',
    SHOT_OFF_TARGET: 'Tiro desviado',
    SUBSTITUTION: '🔄 Cambio',
    FOUL: '⚠ Falta',
    KICKOFF: '▶ Inicio del partido',
    HALFTIME: '⏸ Entretiempo',
    FULLTIME: '⏹ Final del partido',
  }
  return labels[type] ?? type
}
```

- [ ] **Step 2: Página pública**

Create `src/app/live/[matchId]/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
import { notFound } from 'next/navigation'

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        include: { player: { include: { user: { select: { name: true } } } } },
        orderBy: { minute: 'asc' },
      },
    },
  })

  if (!match) notFound()

  return <LiveScoreboard initialMatch={match} />
}
```

- [ ] **Step 3: Verificar tiempo real**

- Abrir `/live/[matchId]` en una pestaña
- En otra pestaña, árbitro registra un gol
- Expected: Marcador y cronología se actualizan sin refresh

- [ ] **Step 4: Commit**

```bash
git add src/app/live src/components/live
git commit -m "feat: add public live scoreboard with WebSocket updates"
```

---

### Task 16: PWA — Preparación mobile

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `src/app/layout.tsx`
- Create: `next.config.ts` PWA headers

- [ ] **Step 1: Web App Manifest**

Create `public/manifest.json`:

```json
{
  "name": "Liga Fútbol",
  "short_name": "Liga",
  "description": "Gestión de liga de fútbol con marcador en vivo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#020617",
  "theme_color": "#059669",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Meta tags PWA en layout**

Add to `src/app/layout.tsx` `<head>`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#059669" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

- [ ] **Step 3: Verificar instalabilidad**

Run: `npm run dev`
- Chrome DevTools → Application → Manifest
- Expected: Manifest válido, app instalable

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json src/app/layout.tsx
git commit -m "feat: add PWA manifest for mobile installability"
```

---

## Roadmap mobile nativo (post-MVP)

Cuando la web esté validada, crear app con **Expo (React Native)** reutilizando:

| Capa web | Equivalente mobile |
|----------|-------------------|
| `/api/*` REST | Mismos endpoints |
| Socket.io `match-update` | Mismo canal |
| Auth.js session cookie | Token JWT en header `Authorization` (agregar endpoint `/api/auth/mobile-login`) |
| Páginas por rol | Screens: `PlayerHome`, `CoachCallups`, `RefereePanel`, `LiveMatch` |

Agregar en fase 2 mobile:
- Task M1: Endpoint `/api/auth/mobile-login` que retorna JWT
- Task M2: Proyecto Expo en `apps/mobile/` monorepo
- Task M3: Pantalla árbitro optimizada para touch (botones extra grandes, vibración háptica)

---

## Self-Review

### 1. Spec coverage

| Requisito | Task |
|-----------|------|
| Jugador ve sus datos/partidos | Task 9 |
| Admin gestiona todo | Tasks 6-8 |
| DT citaciones | Task 10 |
| DT evaluaciones | Task 11 |
| DT armar equipos | Task 10 (titulares/suplentes) |
| Árbitro gestiona partido | Tasks 13-14 |
| Marcador en vivo | Tasks 12, 15 |
| Goles, tarjetas, tiros | Task 13-14 (EventType) |
| Preparación mobile | Task 16 + Roadmap mobile |

**Gap menor:** Estadísticas avanzadas (posesión, corners) no incluidas en MVP — se pueden agregar como nuevos `EventType` siguiendo Task 13.

### 2. Placeholder scan

Sin TBD/TODO/similar. Task 7 Step 4 indica patrón explícito para PlayerForm (mismo patrón que TeamForm).

### 3. Type consistency

- `Role`, `EventType`, `MatchStatus` definidos en Prisma y usados consistentemente
- `CreateMatchEventInput` usado en API y `registerMatchEvent`
- `LiveMatchPayload` compartido entre server socket y client scoreboard

---

## Orden de ejecución recomendado

```
Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16
```

Cada fase produce software funcional:
- **Fin Fase 1:** Login con roles
- **Fin Fase 2:** Admin operativo
- **Fin Fase 3:** Jugador + DT operativos
- **Fin Fase 4:** Partido en vivo + PWA
