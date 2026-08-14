# Vercel/Supabase Phase 3 Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar Vercel, reutilizar el Supabase Preview validado en fase 2, crear Supabase Production Free, añadir un health check diario autenticado, ejecutar el corte final desde Render/Neon, validar cada rol, observar durante siete días y retirar la infraestructura anterior con backups y rollback seguros.

**Architecture:** Vercel ejecutará Next.js 16 en Node.js 22.x y región `gru1`; Preview y Production usarán proyectos Supabase Free distintos con Supavisor Transaction Mode en runtime y Session Mode para operaciones. Auth.js Credentials/JWT permanece como única autenticación. Vercel Cron llamará diariamente una ruta protegida por `CRON_SECRET` que ejecuta una consulta mínima; backups lógicos semanales y pre-release mitigan la ausencia de backups automáticos y se conserva un mínimo de cuatro fuera del repositorio.

**Tech Stack:** Next.js 16 App Router, Node.js 22.x, Vercel Hobby, Vercel Cron, Supabase Free Postgres y Realtime, Prisma 7, Auth.js v5, Vitest, PostgreSQL 17 client tools, Docker y PowerShell.

---

## Global Constraints

1. Este plan cubre solo fase 3: proyecto Vercel, proyectos Supabase, health check, variables Preview/Production, activación del mantenimiento ya implementado, corte final, smoke tests, rollback, observación, backups y retiro.
2. Fase 1 ya es dueña de `src/proxy.ts`, el rename desde `middleware.ts`, `MIGRATION_MAINTENANCE_MODE`, `MIGRATION_REDIRECT_URL` y `src/app/mantenimiento/page.tsx`. Fase 3 no reimplementa ese comportamiento; solo agrega la excepción pública exacta para el health check y verifica/activa los controles.
3. Fase 2 ya es dueña de `scripts/verify-database-migration.ts`, el dump/restore de ensayo y su aprobación. Fase 3 consume ese verificador para el dump final, pero no rediseña el ensayo.
4. Mantener exactamente dos proyectos Supabase Free aislados:
   - `torneos-kelme-preview`
   - `torneos-kelme-production`
   Preview ya existe y fue validado en fase 2; esta fase crea únicamente Production.
5. Se acepta que Supabase Free pueda pausar un proyecto por baja actividad y que el cron diario no garantice evitarlo. La mitigación obligatoria es cron autenticado, monitoreo, backups lógicos y runbook de recuperación.
6. Mantener al menos cuatro backups lógicos semanales de Production fuera del repositorio. Los backups pre-release se crean antes de cada release que pueda cambiar código de persistencia, Prisma, Auth.js, Realtime o esquema y no cuentan dentro de los cuatro semanales.
7. Preview y Production nunca comparten base de datos, URL Supabase, claves Realtime, `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` ni `CRON_SECRET`.
8. Supabase se usa para Postgres y Realtime. No habilitar Supabase Auth ni crear Supabase Storage.
9. Auth.js Credentials/JWT se conserva con `trustHost: true`; Production reutiliza el `AUTH_SECRET` de Render. El cambio de dominio exige nuevo login porque las cookies de Render no pertenecen a `vercel.app`.
10. Usar la URL gratuita inicial `*.vercel.app`; no agregar dominio propio en esta fase.
11. Vercel usa Node.js `22.x`, Install Command `npm ci`, Build Command `npm run build` y región `gru1`.
12. Ningún build Vercel puede ejecutar `prisma migrate deploy`, `prisma db push`, `psql`, `pg_restore` ni un script de migración. Prisma Client sí se genera durante `npm run build`.
13. `DATABASE_URL` usa Supavisor Transaction Mode, puerto `6543`, con `pgbouncer=true&connection_limit=1`.
14. `DIRECT_URL`, `prisma migrate status`, `pg_dump`, `pg_restore` y `psql` usan Supavisor Session Mode, puerto `5432`.
15. No volver a aplicar las 20 migraciones históricas después de restaurar el dump completo: `_prisma_migrations` viene en el dump.
16. Nunca escribir secretos en Git, Markdown, chat, screenshots, URLs de comandos, historial de PowerShell ni logs. Los valores se guardan en un password manager y se cargan mediante prompts seguros.
17. Dumps, hashes, inventarios y archivos temporales viven fuera del repositorio.
18. No iniciar el corte con partidos `LIVE` o `HALFTIME`. Un partido real activo cancela y reprograma la ventana.
19. Neon es la fuente de verdad hasta la primera escritura exitosa en Supabase Production. Después de esa escritura, Supabase es la única fuente de verdad, aunque Vercel falle.
20. Render permanece en mantenimiento y bloquea mutaciones durante siete días. Sus navegaciones GET se redirigen temporalmente a Vercel después de publicar la URL.
21. Toda operación destructiva valida inmediatamente antes el hostname, proyecto, ambiente y archivo objetivo.
22. Todos los comandos de este plan están escritos para PowerShell. No usar sintaxis heredoc de Bash.
23. Cada commit incluye solo los archivos indicados y se crea únicamente después de pruebas verdes.

## File Map

### Create

- `src/lib/database-health.ts` — autorización constante y reconocimiento de la ruta pública del cron.
- `src/app/api/health/database/route.ts` — `GET` autenticado que ejecuta una consulta PostgreSQL mínima.
- `tests/api/database-health.test.ts` — pruebas unitarias de autorización, consulta exitosa, error degradado y excepción pública.
- `vercel.json` — región `gru1` y cron diario.
- `docs/operations/vercel-supabase-cutover.md` — runbook de corte, backups, rollback, pausa y retiro.

### Modify

- `src/proxy.ts` — importar el helper y declarar pública exclusivamente la petición `GET /api/health/database`; no tocar mantenimiento, redirect ni RBAC de fase 1.
- `render.yaml` — retirar migraciones automáticas del build durante la convivencia.
- `.env.example` — documentar `CRON_SECRET` y los entornos Supabase sin valores reales.
- `README.md` — describir Vercel/Supabase y enlazar operación.
- `docs/DEPLOY.md` — documentar configuración permanente, backups y releases manuales.
- `docs/handoff/SESSION-CONTEXT.md` — actualizar localmente después del corte; está ignorado por Git.

### Verify without modifying

- `src/app/mantenimiento/page.tsx`
- `scripts/verify-database-migration.ts`
- `prisma.config.ts`
- `src/lib/db.ts`
- `package.json`
- `package-lock.json`
- módulos de snapshot y Supabase Realtime de fase 1

### Delete after seven stable days

- `render.yaml`

## Interfaces

### Database health helper

```typescript
export function isDatabaseHealthRequest(
  method: string,
  pathname: string
): boolean

export function hasValidCronAuthorization(
  authorization: string | null,
  secret: string | undefined
): boolean
```

### Database health API

```http
GET /api/health/database
Authorization: Bearer [value injected automatically by Vercel from CRON_SECRET]
```

Responses:

```typescript
type DatabaseHealthResponse =
  | { status: 'ok'; database: 'reachable' }
  | { error: 'No autorizado' }
  | { status: 'error'; database: 'unreachable' }
```

- `200`: authorization valid and `SELECT 1` succeeds.
- `401`: secret missing, malformed or incorrect; database is not queried.
- `503`: authorization valid but database query fails; internal error details are not returned.

### Vercel Cron

```json
{
  "path": "/api/health/database",
  "schedule": "0 12 * * *"
}
```

Vercel schedules in UTC. `12:00 UTC` is morning in Chile and invokes only Production.

### Phase 1 proxy integration

```typescript
const isDatabaseHealthGet = isDatabaseHealthRequest(
  req.method,
  pathname
)

const isPublic =
  existingPublicConditions ||
  isDatabaseHealthGet
```

The route is public only at the proxy layer; `CRON_SECRET` authenticates inside the Route Handler.

### Phase 2 verifier

```powershell
npx tsx scripts/verify-database-migration.ts
```

Required environment:

```text
NEON_DIRECT_URL
SUPABASE_SESSION_URL
```

Expected success:

```text
Database migration verification passed
```

Exit code must be `0`; any unexplained difference blocks the cutover.

### Environment matrix

| Variable | Preview | Production |
|---|---|---|
| `DATABASE_URL` | Preview Transaction Pooler | Production Transaction Pooler |
| `DIRECT_URL` | Preview Session Pooler | Production Session Pooler |
| `AUTH_SECRET` | Unique Preview secret | Existing Render secret |
| `NEXTAUTH_URL` | Stable Preview branch alias | Initial free Vercel URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preview publishable key | Production publishable key |
| `SUPABASE_SECRET_KEY` | Preview secret key | Production secret key |
| `CRON_SECRET` | Unique Preview secret | Unique Production secret |

`MIGRATION_MAINTENANCE_MODE` and `MIGRATION_REDIRECT_URL` remain absent in normal Vercel operation. They are activated in Vercel only during paused-project recovery.

### Authority state machine

```text
Neon authoritative
  → Render maintenance
  → final dump
  → restore and verify Supabase Production
  → Vercel read-only smoke
  → first Supabase write
  → Supabase permanently authoritative
  → publish and redirect
  → seven-day observation
  → Render retired and Neon archived
```

---

### Task 1: Verify phase 1 and phase 2 prerequisites

**Files:** none.

- [ ] **Step 1: Create the phase branch**

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/vercel-supabase-cutover
```

Expected: current branch is `feat/vercel-supabase-cutover`.

- [ ] **Step 2: Verify phase 1 artifacts**

```powershell
$required = @(
  'src/proxy.ts',
  'src/app/mantenimiento/page.tsx',
  'src/lib/live-match-snapshot.ts',
  'src/lib/supabase-realtime-server.ts',
  'src/lib/supabase-realtime-client.ts',
  'src/hooks/useMatchRealtime.ts',
  'src/app/api/matches/[id]/live/route.ts'
)
$missing = $required | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing.Count -gt 0) {
  throw "Fase 1 incompleta: $($missing -join ', ')"
}
if (Test-Path -LiteralPath 'src/middleware.ts') {
  throw 'Fase 1 incompleta: src/middleware.ts todavía existe'
}
if (Test-Path -LiteralPath 'server.ts') {
  throw 'Fase 1 incompleta: server.ts todavía existe'
}
```

Expected: command exits without output.

- [ ] **Step 3: Verify maintenance behavior is already present**

```powershell
rg -n "MIGRATION_MAINTENANCE_MODE|MIGRATION_REDIRECT_URL|/mantenimiento" src/proxy.ts src/app/mantenimiento/page.tsx
```

Expected: both environment variables and the maintenance route are found. Do not proceed if any is absent.

- [ ] **Step 4: Verify phase 2 artifacts and rehearsal evidence**

```powershell
$required = @(
  'scripts/verify-database-migration.ts',
  'prisma.config.ts',
  'src/lib/db.ts'
)
$missing = $required | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing.Count -gt 0) {
  throw "Fase 2 incompleta: $($missing -join ', ')"
}
```

Review the signed rehearsal record from phase 2. It must show:

- exact Neon/Supabase parity;
- 20 `_prisma_migrations` rows;
- preserved users, roles and password hashes;
- preserved `BYTEA`;
- Preview role smoke passed;
- dump/restore commands and elapsed time;
- successful `prisma migrate status`.

Expected: phase 2 is approved before phase 3 implementation starts.

- [ ] **Step 5: Verify build policy**

```powershell
node -e "const p=require('./package.json'); if(!p.scripts.build.includes('prisma generate')) throw Error('build no genera Prisma Client'); if(p.scripts.build.includes('migrate')) throw Error('build ejecuta migraciones');"
rg -n "migrate deploy|prisma db push|prisma-migrate-deploy" package.json
```

Expected: Node exits `0`; `rg` returns no matches.

- [ ] **Step 6: Establish the green baseline**

```powershell
npm ci
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: all commands exit `0`.

---

### Task 2: Add the authenticated database health route with TDD

**Files:**
- Create: `tests/api/database-health.test.ts`
- Create: `src/lib/database-health.ts`
- Create: `src/app/api/health/database/route.ts`
- Modify: `src/proxy.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/api/database-health.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: mocks.queryRaw,
  },
}))

import {
  hasValidCronAuthorization,
  isDatabaseHealthRequest,
} from '@/lib/database-health'
import { GET } from '@/app/api/health/database/route'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  mocks.queryRaw.mockReset()
})

describe('database health request', () => {
  it('recognizes only the exact GET health path', () => {
    expect(
      isDatabaseHealthRequest('GET', '/api/health/database')
    ).toBe(true)
    expect(
      isDatabaseHealthRequest('POST', '/api/health/database')
    ).toBe(false)
    expect(
      isDatabaseHealthRequest('GET', '/api/health/database/extra')
    ).toBe(false)
  })

  it('accepts only the exact bearer secret', () => {
    expect(
      hasValidCronAuthorization('Bearer daily-secret', 'daily-secret')
    ).toBe(true)
    expect(
      hasValidCronAuthorization('Bearer wrong-secret', 'daily-secret')
    ).toBe(false)
    expect(
      hasValidCronAuthorization(null, 'daily-secret')
    ).toBe(false)
    expect(
      hasValidCronAuthorization('Bearer daily-secret', undefined)
    ).toBe(false)
  })
})

describe('GET /api/health/database', () => {
  it('returns 401 without querying for an invalid secret', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')

    const response = await GET(
      new Request('https://torneos-kelme.vercel.app/api/health/database')
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'No autorizado',
    })
    expect(mocks.queryRaw).not.toHaveBeenCalled()
  })

  it('returns 200 after the database responds', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')
    mocks.queryRaw.mockResolvedValue([{ ok: 1 }])

    const response = await GET(
      new Request(
        'https://torneos-kelme.vercel.app/api/health/database',
        {
          headers: {
            authorization: 'Bearer daily-secret',
          },
        }
      )
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      database: 'reachable',
    })
    expect(mocks.queryRaw).toHaveBeenCalledOnce()
  })

  it('returns a generic 503 when PostgreSQL is unavailable', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')
    mocks.queryRaw.mockRejectedValue(
      new Error('postgresql://secret-host/internal')
    )
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(
      new Request(
        'https://torneos-kelme.vercel.app/api/health/database',
        {
          headers: {
            authorization: 'Bearer daily-secret',
          },
        }
      )
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      status: 'error',
      database: 'unreachable',
    })
  })
})
```

- [ ] **Step 2: Run tests and verify red**

```powershell
npx vitest run tests/api/database-health.test.ts
```

Expected: FAIL because the helper and Route Handler do not exist.

- [ ] **Step 3: Implement constant-time authorization helpers**

Create `src/lib/database-health.ts`:

```typescript
import { timingSafeEqual } from 'node:crypto'

export function isDatabaseHealthRequest(
  method: string,
  pathname: string
): boolean {
  return method === 'GET' && pathname === '/api/health/database'
}

export function hasValidCronAuthorization(
  authorization: string | null,
  secret: string | undefined
): boolean {
  if (!authorization || !secret) return false

  const actual = Buffer.from(authorization)
  const expected = Buffer.from(`Bearer ${secret}`)

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  )
}
```

- [ ] **Step 4: Implement the Route Handler**

Create `src/app/api/health/database/route.ts`:

```typescript
import { db } from '@/lib/db'
import { hasValidCronAuthorization } from '@/lib/database-health'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (
    !hasValidCronAuthorization(
      request.headers.get('authorization'),
      process.env.CRON_SECRET
    )
  ) {
    return Response.json(
      { error: 'No autorizado' },
      { status: 401 }
    )
  }

  try {
    await db.$queryRaw`SELECT 1 AS ok`

    return Response.json({
      status: 'ok',
      database: 'reachable',
    })
  } catch (error) {
    console.error('GET /api/health/database failed', {
      error:
        error instanceof Error
          ? error.name
          : 'UnknownDatabaseHealthError',
    })

    return Response.json(
      {
        status: 'error',
        database: 'unreachable',
      },
      { status: 503 }
    )
  }
}
```

- [ ] **Step 5: Add only the proxy public-route exception**

In `src/proxy.ts`, add:

```typescript
import { isDatabaseHealthRequest } from '@/lib/database-health'
```

After phase 1 obtains `pathname`, add:

```typescript
const isDatabaseHealthGet = isDatabaseHealthRequest(
  req.method,
  pathname
)
```

Add `isDatabaseHealthGet` to the existing `isPublic` expression. Do not replace the file and do not change maintenance, redirect, login callbacks, API `401` behavior or RBAC.

- [ ] **Step 6: Run focused tests and verify green**

```powershell
npx vitest run tests/api/database-health.test.ts
```

Expected: all database health tests PASS.

- [ ] **Step 7: Run full verification**

```powershell
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/database-health.ts src/app/api/health/database/route.ts src/proxy.ts tests/api/database-health.test.ts
git commit -m "feat: add authenticated database health check"
```

---

### Task 3: Configure the Vercel region and daily Cron

**Files:**
- Create: `vercel.json`
- Modify: `render.yaml`

- [ ] **Step 1: Verify the Node.js 22 prerequisite from phase 1**

```powershell
node -e "const p=require('./package.json'); if(p.engines.node!=='22.x') throw Error('Fase 1 no fijó Node 22.x')"
npm ls @types/node
```

Expected: both commands exit `0`; this phase does not change `package.json` or `package-lock.json`.

- [ ] **Step 2: Create Vercel configuration**

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["gru1"],
  "crons": [
    {
      "path": "/api/health/database",
      "schedule": "0 12 * * *"
    }
  ]
}
```

- [ ] **Step 3: Verify exact configuration and migration absence**

Before verification, replace only the Render build command:

```yaml
buildCommand: npm ci --include=dev && npm run build
```

Keep `startCommand: npm start`, the health check and all existing environment entries unchanged.

```powershell
node -e "const p=require('./package.json'); if(p.engines.node!=='22.x') throw Error('Node incorrecto'); const v=require('./vercel.json'); if(v.regions[0]!=='gru1') throw Error('Región incorrecta'); if(v.crons[0].path!=='/api/health/database'||v.crons[0].schedule!=='0 12 * * *') throw Error('Cron incorrecto');"
rg -n "migrate deploy|prisma db push|prisma-migrate-deploy" package.json vercel.json render.yaml
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: config assertion and all verification commands pass; migration search has no matches.

- [ ] **Step 4: Commit**

```powershell
git add vercel.json render.yaml
git commit -m "chore: use manual migrations for platform cutover"
```

---

### Task 4: Document environments, backups and paused-project recovery

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/DEPLOY.md`
- Create: `docs/operations/vercel-supabase-cutover.md`

- [ ] **Step 1: Add environment documentation**

Add to `.env.example` without real values:

```env
# Vercel Cron; usar valores distintos en Preview y Production
CRON_SECRET=""
```

Ensure the same file documents:

```env
DATABASE_URL=""
DIRECT_URL=""
AUTH_SECRET=""
NEXTAUTH_URL=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_SECRET_KEY=""
```

Retain phase 1 documentation for:

```env
MIGRATION_MAINTENANCE_MODE="false"
MIGRATION_REDIRECT_URL=""
```

- [ ] **Step 2: Add permanent deployment rules to `docs/DEPLOY.md`**

Document exactly:

````markdown
## Vercel y Supabase

- Runtime: Node.js 22.x.
- Región Vercel: `gru1`.
- Supabase Preview: `torneos-kelme-preview` en Free.
- Supabase Production: `torneos-kelme-production` en Free.
- Preview y Production usan credenciales y bases aisladas.
- Auth.js Credentials/JWT permanece activo.
- La URL inicial de producción es la URL gratuita `*.vercel.app`.

## Builds y migraciones

Vercel instala con `npm ci` y compila con `npm run build`. El build genera Prisma Client y ejecuta `next build`; nunca ejecuta migraciones.

Las migraciones de esquema se ejecutan manualmente desde un equipo autorizado, usando `DIRECT_URL` de Session Pooler, después de crear un backup pre-release:

```powershell
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

## Health diario

Vercel Cron llama diariamente `GET /api/health/database` a las `12:00 UTC`. Vercel envía `Authorization: Bearer` usando `CRON_SECRET`. La ruta ejecuta `SELECT 1`, responde `200` si PostgreSQL está disponible, `401` si la autorización falla y `503` si la base no responde.

El cron reduce el tiempo sin actividad, pero no garantiza que Supabase Free no pause el proyecto.

## Backups

Se crea un dump lógico de Production cada semana y antes de cada release que pueda afectar persistencia, Prisma, Auth.js, Realtime o esquema. Los archivos se guardan fuera del repositorio en `C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\production`, con hash SHA-256 y acceso restringido.

Se conservan al menos cuatro backups semanales. Los backups pre-release se conservan aparte y no se eliminan con la rotación semanal.

La recuperación por pausa y los comandos completos están en `docs/operations/vercel-supabase-cutover.md`.
````

- [ ] **Step 3: Create the operations runbook**

Create `docs/operations/vercel-supabase-cutover.md` with these exact sections and commands:

````markdown
# Runbook Vercel/Supabase

## Entornos

- Vercel project: `torneos-kelme`.
- Supabase Preview: `torneos-kelme-preview`.
- Supabase Production: `torneos-kelme-production`.
- Plan Supabase: Free en ambos proyectos.
- Región: São Paulo; Vercel `gru1`.
- Production URL: URL gratuita `*.vercel.app` asignada por Vercel.

## Cargar una URL secreta en PowerShell

```powershell
function Set-SecretProcessVariable([string]$Name) {
  $secure = Read-Host "Ingresa $Name" -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    [Environment]::SetEnvironmentVariable($Name, $value, 'Process')
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}
```

## Backup semanal

```powershell
Set-SecretProcessVariable 'SUPABASE_SESSION_URL'
$backupRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\production'
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "production-weekly-$stamp.dump"
$envFile = Join-Path $env:TEMP "torneos-kelme-backup-$stamp.env"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "SUPABASE_SESSION_URL=$env:SUPABASE_SESSION_URL`nBACKUP_FILE=$fileName`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    sh -lc 'pg_dump "$SUPABASE_SESSION_URL" --format=custom --schema=public --no-owner --no-privileges --file="/backup/$BACKUP_FILE"'
  if ($LASTEXITCODE -ne 0) { throw 'Falló pg_dump semanal' }

  $dumpPath = Join-Path $backupRoot $fileName
  Get-FileHash -Algorithm SHA256 $dumpPath |
    Format-List |
    Out-File "$dumpPath.sha256.txt"

  docker run --rm `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    pg_restore --list "/backup/$fileName" |
    Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'El backup no es legible' }

  $weekly = Get-ChildItem -LiteralPath $backupRoot -Filter 'production-weekly-*.dump' |
    Sort-Object LastWriteTimeUtc -Descending
  $weekly | Select-Object -Skip 4 | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    $hashPath = "$($_.FullName).sha256.txt"
    if (Test-Path -LiteralPath $hashPath) {
      Remove-Item -LiteralPath $hashPath -Force
    }
  }

  $retained = @(
    Get-ChildItem -LiteralPath $backupRoot -Filter 'production-weekly-*.dump'
  ).Count
  if ($retained -lt 4 -and $weekly.Count -ge 4) {
    throw 'La rotación dejó menos de cuatro backups semanales'
  }
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\SUPABASE_SESSION_URL -ErrorAction SilentlyContinue
}
```

Durante las primeras cuatro semanas conservar todos los backups existentes; desde la cuarta, el comando mantiene los cuatro más recientes.

## Backup pre-release

Ejecutar antes de cada release que afecte persistencia, Prisma, Auth.js, Realtime o esquema:

```powershell
Set-SecretProcessVariable 'SUPABASE_SESSION_URL'
$backupRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\production'
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "production-pre-release-$stamp.dump"
$envFile = Join-Path $env:TEMP "torneos-kelme-pre-release-$stamp.env"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "SUPABASE_SESSION_URL=$env:SUPABASE_SESSION_URL`nBACKUP_FILE=$fileName`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    sh -lc 'pg_dump "$SUPABASE_SESSION_URL" --format=custom --schema=public --no-owner --no-privileges --file="/backup/$BACKUP_FILE"'
  if ($LASTEXITCODE -ne 0) { throw 'Falló pg_dump pre-release' }

  $dumpPath = Join-Path $backupRoot $fileName
  Get-FileHash -Algorithm SHA256 $dumpPath |
    Format-List |
    Out-File "$dumpPath.sha256.txt"

  docker run --rm `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    pg_restore --list "/backup/$fileName" |
    Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'El backup pre-release no es legible' }
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\SUPABASE_SESSION_URL -ErrorAction SilentlyContinue
}
```

Los archivos `production-pre-release-*.dump` no participan en la rotación semanal.

## Recuperación de Supabase Production pausado

1. Confirmar en Vercel Cron y Functions que `/api/health/database` responde `503`.
2. En Vercel Production, definir temporalmente `MIGRATION_MAINTENANCE_MODE=true` y redeployar el mismo commit. No definir `MIGRATION_REDIRECT_URL`.
3. En Supabase Dashboard abrir `torneos-kelme-production` y seleccionar **Resume project**.
4. Esperar estado **Healthy**.
5. Cargar Session Pooler Production como `DIRECT_URL`.
6. Ejecutar:

```powershell
npx prisma migrate status
```

Resultado esperado: `Database schema is up to date!`.

7. Probar el health check manualmente sin imprimir el secreto:

```powershell
$secure = Read-Host 'Ingresa CRON_SECRET de Production' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $cronSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $headers = @{ Authorization = "Bearer $cronSecret" }
  Invoke-RestMethod `
    -Method Get `
    -Uri "$env:VERCEL_PRODUCTION_URL/api/health/database" `
    -Headers $headers
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  Remove-Variable cronSecret -ErrorAction SilentlyContinue
}
```

Resultado esperado:

```json
{"status":"ok","database":"reachable"}
```

8. Verificar landing, login Admin, panel Admin, una lectura pública live, una imagen `BYTEA` y una lectura por cada rol.
9. Revisar conteos de `User`, `Match`, `MatchEvent`, `FriendlyPlayer`, `Team` y `_prisma_migrations` contra el último registro operacional previo a la pausa.
10. Remover `MIGRATION_MAINTENANCE_MODE` de Vercel Production y redeployar el mismo commit.
11. Confirmar login y una mutación controlada.
12. Registrar fecha, duración, causa y validaciones en el handoff.

Si **Resume project** no recupera datos íntegros:

1. Mantener Vercel en mantenimiento.
2. Pausar `torneos-kelme-preview` para liberar uno de los dos proyectos Free activos.
3. Pausar el Production dañado si Supabase todavía lo considera activo.
4. Crear `torneos-kelme-production-recovery` en South America (São Paulo), plan Free.
5. Restaurar el backup lógico válido más reciente mediante su Session Pooler.
6. Ejecutar `prisma migrate status`.
7. Verificar conteos, Auth.js, imágenes, cada rol y Realtime.
8. Reemplazar las variables Production de Vercel por las credenciales de `torneos-kelme-production-recovery`.
9. Redeployar el mismo commit.
10. Remover `MIGRATION_MAINTENANCE_MODE` solo después de todas las validaciones.
11. Mantener el proyecto dañado pausado hasta cerrar el incidente.

## Rollback

Antes de la primera escritura en Supabase Production, Render/Neon puede volver a ser autoritativo desactivando mantenimiento.

Después de la primera escritura en Supabase Production, Neon queda prohibido como destino. Si Vercel falla, desplegar el mismo commit en Render apuntando a Supabase Production y mantener una única fuente de verdad.
````

- [ ] **Step 4: Update README**

Add:

```markdown
## Producción

La aplicación se despliega en Vercel con Node.js 22.x y usa dos proyectos Supabase Free separados para Preview y Production. Auth.js Credentials/JWT se conserva; Supabase Auth y Storage no se usan.

El health check diario, backups semanales, backups pre-release, recuperación por pausa y corte desde Render/Neon están documentados en [docs/operations/vercel-supabase-cutover.md](docs/operations/vercel-supabase-cutover.md).
```

- [ ] **Step 5: Verify docs and commit**

```powershell
rg -n "CRON_SECRET|cuatro backups|pre-release|Resume project|Node.js 22" .env.example README.md docs/DEPLOY.md docs/operations/vercel-supabase-cutover.md
git add .env.example README.md docs/DEPLOY.md docs/operations/vercel-supabase-cutover.md
git commit -m "docs: add Supabase Free backup and recovery operations"
```

Expected: all required policies are found and the commit succeeds.

---

### Task 5: Verify Supabase Preview and create Production plus Vercel

**Files:** none; manual external operations.

- [ ] **Step 1: Verify the secured Supabase account from phase 2**

1. Open `https://supabase.com/dashboard`.
2. Sign in with the GitHub account controlling `rgaeted/liga-futbol`.
3. Confirm MFA remains enabled and recovery codes are stored securely.
4. Confirm Supabase Auth providers remain disabled.
5. Confirm no Storage buckets exist.

Expected: authenticated Supabase account containing only the validated `torneos-kelme-preview` project.

- [ ] **Step 2: Verify Preview instead of recreating it**

Verify:

- Name: `torneos-kelme-preview`.
- Plan: Free.
- Region: South America (São Paulo).
- Phase-2 database verification passed.
- The rehearsal data remains disposable and isolated from Production.

Confirm the password manager already contains:

- project ref;
- project URL;
- Transaction Pooler URL;
- Session Pooler URL;
- publishable key;
- secret key;
- database password.

- [ ] **Step 3: Create Production**

Create:

- Name: `torneos-kelme-production`.
- Plan: Free.
- Region: South America (São Paulo).
- Different generated database password.

Store the same seven items in a distinct password-manager entry.

- [ ] **Step 4: Verify isolation**

Confirm:

- project refs differ;
- URLs differ;
- pooler usernames include their respective refs;
- publishable and secret keys differ;
- neither project has Supabase Auth users or Storage buckets.

Expected: two independent projects.

- [ ] **Step 5: Create and secure the Vercel account**

1. Open `https://vercel.com/signup`.
2. Sign in with GitHub.
3. Enable MFA.
4. Authorize only `rgaeted/liga-futbol`.
5. Use Hobby.

Expected: Vercel account ready to import the repository.

---

### Task 6: Import Vercel and configure Preview/Production

**Files:** none; Vercel dashboard and Git.

- [ ] **Step 1: Push the implementation branch**

```powershell
git push -u origin feat/vercel-supabase-cutover
```

Expected: branch visible on GitHub.

- [ ] **Step 2: Import the repository**

In Vercel:

- Add New → Project.
- Import `rgaeted/liga-futbol`.
- Project Name: `torneos-kelme`.
- Framework Preset: Next.js.
- Root Directory: repository root.
- Node.js Version: `22.x`.
- Install Command: `npm ci`.
- Build Command: `npm run build`.
- Region: `gru1`, read from `vercel.json`.

The first deployment receives a free Vercel production URL. Do not announce or redirect traffic to it yet.

- [ ] **Step 3: Freeze final production promotion**

Project Settings → Environments → Production → Branch Tracking:

```text
vercel-production
```

Expected: merges to `main` do not perform the final production cutover.

- [ ] **Step 4: Configure Preview environment**

Add each variable scoped only to Preview:

- `DATABASE_URL`: Preview Transaction Pooler with `pgbouncer=true&connection_limit=1`.
- `DIRECT_URL`: Preview Session Pooler.
- `AUTH_SECRET`: Preview-only generated secret.
- `NEXT_PUBLIC_SUPABASE_URL`: Preview project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Preview publishable key.
- `SUPABASE_SECRET_KEY`: Preview secret key.
- `CRON_SECRET`: Preview-only generated secret of at least 32 random bytes.

After the first branch deployment, copy its stable branch alias and set Preview `NEXTAUTH_URL` to that exact HTTPS URL. Redeploy Preview.

- [ ] **Step 5: Configure Production environment**

Add each variable scoped only to Production:

- `DATABASE_URL`: Production Transaction Pooler with `pgbouncer=true&connection_limit=1`.
- `DIRECT_URL`: Production Session Pooler.
- `AUTH_SECRET`: exact current Render secret.
- `NEXTAUTH_URL`: exact initial free Production URL shown in Vercel Domains.
- `NEXT_PUBLIC_SUPABASE_URL`: Production project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Production publishable key.
- `SUPABASE_SECRET_KEY`: Production secret key.
- `CRON_SECRET`: Production-only generated secret of at least 32 random bytes.

Do not add either `MIGRATION_*` variable during normal deployment.

- [ ] **Step 6: Audit the Preview build**

Expected log stages:

```text
npm ci
prisma generate
next build
```

Reject any log containing:

```text
prisma migrate deploy
prisma db push
psql
pg_restore
```

- [ ] **Step 7: Test the Preview health endpoint**

Load Preview `CRON_SECRET` securely and invoke the stable Preview alias.

Expected authorized response:

```json
{"status":"ok","database":"reachable"}
```

Invoke once without the header.

Expected: HTTP `401` with `{"error":"No autorizado"}`.

---

### Task 7: Confirm phase 2 rehearsal and approve Preview

**Files:** none.

- [ ] **Step 1: Confirm the phase 2 restored Preview database**

Run the phase 2 verifier with Neon as source and Supabase Preview Session Pooler as target:

```powershell
npx tsx scripts/verify-database-migration.ts
```

Expected:

```text
Database migration verification passed
```

- [ ] **Step 2: Confirm migration history without applying migrations**

```powershell
$env:DIRECT_URL = $env:SUPABASE_SESSION_URL
npx prisma migrate status
```

Expected:

```text
Database schema is up to date!
```

Do not execute `prisma migrate deploy`.

- [ ] **Step 3: Run Preview role smoke**

Verify:

- public landing, `/ayuda` and `/live/demo-match-finished`;
- `GET /api/matches/demo-match-finished/live`;
- Admin dashboard and controlled create/delete;
- Coach callups and formations;
- Player dashboard and matches;
- Friendly Coach player-area access;
- Referee kickoff, event, halftime, second half and fulltime;
- live invalidation in a second browser;
- reconnect and polling convergence;
- upload, read and cleanup of one image `BYTEA`;
- protected API `401`;
- health API `401` without `CRON_SECRET` and `200` with it.

Expected: all roles and public behavior pass against Preview only.

- [ ] **Step 4: Run automated acceptance**

```powershell
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: all commands exit `0`.

---

### Task 8: Merge phase 3 and prepare Render maintenance

**Files:** no new implementation.

- [ ] **Step 1: Create the pull request**

```powershell
gh pr create `
  --base main `
  --head feat/vercel-supabase-cutover `
  --title "feat: prepare Vercel Supabase cutover" `
  --body "Adds the authenticated database health check, daily Vercel Cron, manual migration policy, Supabase Free backup policy, paused-project recovery and phase 3 cutover documentation."
```

Expected: PR contains only phase 3 changes.

- [ ] **Step 2: Review and merge**

Merge through GitHub after CI and review pass. Do not bypass checks.

- [ ] **Step 3: Verify Render deploy**

Render must deploy phase 1 maintenance controls and phase 3 health exception without running database migrations in its build.

Expected before the window:

```text
MIGRATION_MAINTENANCE_MODE=false
MIGRATION_REDIRECT_URL absent
```

- [ ] **Step 4: Verify dormant behavior**

Expected:

- Render landing and login work;
- Render still writes only to Neon;
- maintenance page exists;
- normal requests are not redirected;
- health route still requires `CRON_SECRET`.

---

### Task 9: Prepare the final cutover

**Files:** none.

- [ ] **Step 1: Create the mandatory pre-release Neon backup**

Load Neon direct/session URL into `NEON_DIRECT_URL`, then run:

```powershell
$backupRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\cutover'
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$envFile = Join-Path $env:TEMP 'torneos-kelme-neon-pre-cutover.env'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "NEON_DIRECT_URL=$env:NEON_DIRECT_URL`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    sh -lc 'pg_dump "$NEON_DIRECT_URL" --format=custom --schema=public --no-owner --no-privileges --file=/backup/neon-pre-cutover-20260803.dump'
  if ($LASTEXITCODE -ne 0) { throw 'Falló backup pre-cutover de Neon' }

  docker run --rm `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    pg_restore --list /backup/neon-pre-cutover-20260803.dump |
    Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Backup pre-cutover ilegible' }
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
}
```

Generate:

```powershell
Get-FileHash `
  -Algorithm SHA256 `
  'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\cutover\neon-pre-cutover-20260803.dump'
```

Expected: readable dump and recorded SHA-256.

- [ ] **Step 2: Announce the maintenance window**

Use:

```text
Torneos Kelme estará en mantenimiento durante el cambio de plataforma. No se podrán registrar cambios durante la ventana. Avisaremos cuando el servicio esté disponible en su nueva dirección.
```

- [ ] **Step 3: Confirm no active matches**

Load Neon Session/direct URL into `NEON_DIRECT_URL`, create a temporary env file and run:

```powershell
$envFile = Join-Path $env:TEMP 'torneos-kelme-neon-status.env'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "NEON_DIRECT_URL=$env:NEON_DIRECT_URL`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    postgres:17 `
    sh -lc 'psql "$NEON_DIRECT_URL" --set ON_ERROR_STOP=1 --command="SELECT ""id"", ""status"", ""scheduledAt"" FROM ""Match"" WHERE ""status"" IN (''LIVE'', ''HALFTIME'') ORDER BY ""scheduledAt"";"'
  if ($LASTEXITCODE -ne 0) { throw 'Falló consulta de partidos activos' }
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
}
```

Expected: zero rows. Any real active match cancels the window.

- [ ] **Step 4: Confirm release SHA and clean tree**

```powershell
git switch main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
```

Expected: clean tree and reviewed SHA recorded.

- [ ] **Step 5: Confirm final environment**

Verify:

- Vercel Production has all eight variables;
- Node.js is `22.x`;
- region is `gru1`;
- Production Branch is `vercel-production`;
- Production URL is the free `*.vercel.app` URL;
- build command is `npm run build`;
- no Vercel environment has active migration controls;
- Render still targets Neon.

---

### Task 10: Execute the final cutover

**Files:** none during the critical window.

- [ ] **Step 1: Activate existing Render maintenance**

Set:

```text
MIGRATION_MAINTENANCE_MODE=true
```

Keep `MIGRATION_REDIRECT_URL` absent and deploy the environment change.

- [ ] **Step 2: Verify phase 1 maintenance behavior**

Expected:

- public reads return `200`;
- private pages redirect to `/mantenimiento`;
- all mutations return `503`;
- no request is redirected to Vercel yet.

- [ ] **Step 3: Recheck active matches after write freeze**

Repeat Task 9 Step 3.

Expected: zero rows.

- [ ] **Step 4: Create final Neon dump**

```powershell
$cutoverRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\cutover'
New-Item -ItemType Directory -Force -Path $cutoverRoot | Out-Null
$envFile = Join-Path $env:TEMP 'torneos-kelme-final-cutover.env'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "NEON_DIRECT_URL=$env:NEON_DIRECT_URL`nSUPABASE_SESSION_URL=$env:SUPABASE_SESSION_URL`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    -v "${cutoverRoot}:/work" `
    postgres:17 `
    sh -lc 'pg_dump "$NEON_DIRECT_URL" --clean --if-exists --schema=public --quote-all-identifiers --no-owner --no-privileges --file=/work/neon-final-20260803.sql'
  if ($LASTEXITCODE -ne 0) { throw 'Falló dump final' }

  Get-FileHash `
    -Algorithm SHA256 `
    (Join-Path $cutoverRoot 'neon-final-20260803.sql') |
    Format-List
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
}
```

Expected: final dump succeeds after maintenance and hash is recorded.

- [ ] **Step 5: Validate Production target before restore**

```powershell
$target = [Uri]$env:SUPABASE_SESSION_URL
$target.Host
$target.Port
```

Expected: hostname belongs to `torneos-kelme-production`, port is `5432`, and it does not reference Preview.

- [ ] **Step 6: Restore final dump**

Create the temporary env file and restore:

```powershell
$envFile = Join-Path $env:TEMP 'torneos-kelme-final-restore.env'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "SUPABASE_SESSION_URL=$env:SUPABASE_SESSION_URL`n",
  $utf8NoBom
)

docker run --rm `
  --env-file $envFile `
  -v "${cutoverRoot}:/work" `
  postgres:17 `
  sh -lc 'psql "$SUPABASE_SESSION_URL" --set ON_ERROR_STOP=1 --single-transaction --file=/work/neon-final-20260803.sql'
if ($LASTEXITCODE -ne 0) { throw 'Falló restore final' }

Remove-Item -LiteralPath $envFile -Force
```

Expected: restore exits `0`.

- [ ] **Step 7: Verify exact parity and migration history**

```powershell
npx tsx scripts/verify-database-migration.ts
if ($LASTEXITCODE -ne 0) { throw 'Verificación final rechazada' }

$env:DIRECT_URL = $env:SUPABASE_SESSION_URL
npx prisma migrate status
```

Expected:

```text
Database migration verification passed
Database schema is up to date!
```

Do not run `prisma migrate deploy`.

- [ ] **Step 8: Deploy the reviewed SHA**

```powershell
git push origin main:vercel-production
```

Expected: Production build uses Production variables and contains no migration command.

- [ ] **Step 9: Perform read-only Production smoke**

Against the exact free Vercel URL verify:

- landing;
- `/ayuda`;
- login;
- Admin, Coach, Player, Friendly Coach and Referee reads;
- public live snapshot;
- images `BYTEA`;
- health route with and without Production `CRON_SECRET`;
- Realtime connection status.

No form save, create, update, delete or referee event yet.

Expected: all reads work. Neon remains eligible for rollback until the next step.

- [ ] **Step 10: Cross the first-write gate deliberately**

As Admin:

1. Create team `SMOKE CUTOVER 2026-08-03`.
2. Reload and confirm it exists.
3. Delete it.

The successful create permanently makes Supabase Production authoritative, even after cleanup.

- [ ] **Step 11: Complete role and Realtime smoke**

Verify:

- Admin controlled CRUD;
- Coach callup/formations save;
- Player pages;
- Friendly Coach access;
- Referee kickoff, event, halftime, second half and final;
- spectator update in a separate browser;
- disconnect and polling/resync recovery;
- upload/read/delete lifecycle for one temporary image.

Expected: all roles and Realtime pass.

- [ ] **Step 12: Publish and redirect**

Announce the exact initial free Vercel URL.

In Render, keep:

```text
MIGRATION_MAINTENANCE_MODE=true
```

Copy the Production URL directly from Vercel → Project → Settings → Domains into the Render variable `MIGRATION_REDIRECT_URL`; do not type or reconstruct the hostname.

Verify a browser navigation receives temporary redirect preserving path/query and Render mutations remain `503`.

- [ ] **Step 13: Remove transient secrets**

```powershell
Remove-Item Env:\NEON_DIRECT_URL -ErrorAction SilentlyContinue
Remove-Item Env:\SUPABASE_SESSION_URL -ErrorAction SilentlyContinue
Remove-Item Env:\DIRECT_URL -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
```

Expected: no secret remains in the process or temporary files.

---

### Task 11: Apply rollback rules

**Files:** none.

- [ ] **Step 1: Roll back before first Supabase write**

Allowed only before Task 10 Step 10 succeeds:

1. Remove `MIGRATION_REDIRECT_URL` from Render.
2. Set `MIGRATION_MAINTENANCE_MODE=false`.
3. Confirm Render still points to Neon.
4. Verify login and one controlled Render mutation.
5. Do not publish Vercel.
6. Diagnose and repeat the final dump from the beginning.

- [ ] **Step 2: Fall back after first Supabase write**

Neon is forbidden.

Configure Render with:

- Supabase Production Transaction Pooler as `DATABASE_URL`;
- Supabase Production Session Pooler as `DIRECT_URL`;
- unchanged Production `AUTH_SECRET`;
- Render URL as `NEXTAUTH_URL`;
- Production Supabase URL and Realtime keys;
- `MIGRATION_MAINTENANCE_MODE=false`;
- no `MIGRATION_REDIRECT_URL`.

Deploy the same Git SHA as Vercel.

Expected: Render serves the same application against Supabase Production and does not run migrations.

- [ ] **Step 3: Reject split-brain recovery**

Never:

- write to Neon after the first Supabase write;
- leave Render and Vercel writable against different databases;
- merge records manually between databases;
- restore the stale Neon dump over active Supabase Production;
- regenerate `AUTH_SECRET` during fallback.

---

### Task 12: Observe for seven days

**Files:**
- Update locally after observations: `docs/handoff/SESSION-CONTEXT.md`

- [ ] **Step 1: Verify cron daily**

Each day inspect Vercel → Project → Cron Jobs and Functions.

Expected:

- invocation around `12:00 UTC`;
- HTTP `200`;
- response `{ "status": "ok", "database": "reachable" }`;
- no unauthorized or database errors.

- [ ] **Step 2: Run daily authenticated manual probe**

```powershell
$env:VERCEL_PRODUCTION_URL = Read-Host 'Ingresa la URL Vercel Production'
$secure = Read-Host 'Ingresa CRON_SECRET Production' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $cronSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  Invoke-RestMethod `
    -Method Get `
    -Uri "$env:VERCEL_PRODUCTION_URL/api/health/database" `
    -Headers @{ Authorization = "Bearer $cronSecret" }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  Remove-Variable cronSecret -ErrorAction SilentlyContinue
}
```

Expected:

```json
{"status":"ok","database":"reachable"}
```

- [ ] **Step 3: Review each platform daily**

Vercel:

- 5xx, timeouts and function duration;
- failed cron invocations;
- Auth.js host/session errors;
- no secrets in logs.

Supabase:

- project status;
- connection count and pool saturation;
- Realtime errors;
- storage growth;
- pause warnings.

Render:

- browser redirects;
- mutation attempts remain `503`;
- no successful writes reach Neon.

- [ ] **Step 4: Exercise features across the week**

- Day 1: Admin and Auth.js login.
- Day 2: Coach and Player.
- Day 3: Referee and live invalidation.
- Day 4: photos and crests.
- Day 5: Realtime disconnect and polling convergence.
- Day 6: Friendly Coach and protected API behavior.
- Day 7: full role smoke and manual backup.

- [ ] **Step 5: Restart the observation clock after instability**

Restart from day zero after:

- unexpected pause;
- unexplained 5xx;
- failed login;
- lost/divergent write;
- fallback to Render;
- Realtime failure without polling recovery;
- pool exhaustion;
- failed backup or restore validation.

---

### Task 13: Establish weekly and pre-release backup operations

**Files:** none; commands live in the runbook.

- [ ] **Step 1: Create the first Production weekly backup**

Load Production Session Pooler into `SUPABASE_SESSION_URL`, then run:

```powershell
$backupRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\production'
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "production-weekly-$stamp.dump"
$envFile = Join-Path $env:TEMP "torneos-kelme-weekly-$stamp.env"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "SUPABASE_SESSION_URL=$env:SUPABASE_SESSION_URL`nBACKUP_FILE=$fileName`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    sh -lc 'pg_dump "$SUPABASE_SESSION_URL" --format=custom --schema=public --no-owner --no-privileges --file="/backup/$BACKUP_FILE"'
  if ($LASTEXITCODE -ne 0) { throw 'Falló backup semanal' }

  $dumpPath = Join-Path $backupRoot $fileName
  Get-FileHash -Algorithm SHA256 $dumpPath |
    Format-List |
    Out-File "$dumpPath.sha256.txt"

  docker run --rm `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    pg_restore --list "/backup/$fileName" |
    Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Backup semanal ilegible' }

  Get-ChildItem -LiteralPath $backupRoot -Filter 'production-weekly-*.dump' |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -Skip 4 |
    ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Force
      Remove-Item -LiteralPath "$($_.FullName).sha256.txt" -Force -ErrorAction SilentlyContinue
    }
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\SUPABASE_SESSION_URL -ErrorAction SilentlyContinue
}
```

Expected:

- `production-weekly-*.dump`;
- matching `.sha256.txt`;
- successful `pg_restore --list`;
- files outside the repository;
- OneDrive folder not shared.

- [ ] **Step 2: Schedule the operator reminder**

Create a recurring calendar reminder every Sunday:

```text
Torneos Kelme — backup lógico semanal Supabase Production
```

Expected: named owner and weekly recurrence.

- [ ] **Step 3: Verify four-backup retention**

After four weekly runs:

```powershell
$backupRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\production'
$weeklyCount = @(
  Get-ChildItem -LiteralPath $backupRoot -Filter 'production-weekly-*.dump'
).Count
if ($weeklyCount -lt 4) {
  throw "Solo existen $weeklyCount backups semanales"
}
```

Expected: count is at least `4`.

- [ ] **Step 4: Require pre-release backup**

Before every qualifying Production release, load Production Session Pooler into `SUPABASE_SESSION_URL`, then run:

```powershell
$backupRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\production'
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "production-pre-release-$stamp.dump"
$envFile = Join-Path $env:TEMP "torneos-kelme-pre-release-$stamp.env"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "SUPABASE_SESSION_URL=$env:SUPABASE_SESSION_URL`nBACKUP_FILE=$fileName`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    sh -lc 'pg_dump "$SUPABASE_SESSION_URL" --format=custom --schema=public --no-owner --no-privileges --file="/backup/$BACKUP_FILE"'
  if ($LASTEXITCODE -ne 0) { throw 'Falló backup pre-release' }

  $dumpPath = Join-Path $backupRoot $fileName
  Get-FileHash -Algorithm SHA256 $dumpPath |
    Format-List |
    Out-File "$dumpPath.sha256.txt"

  docker run --rm `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    pg_restore --list "/backup/$fileName" |
    Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Backup pre-release ilegible' }
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\SUPABASE_SESSION_URL -ErrorAction SilentlyContinue
}
```

Expected: a `production-pre-release-*.dump` exists for the release and is not removed by weekly rotation.

- [ ] **Step 5: Test restoration monthly**

Load Production and Preview Session Pooler URLs into `SUPABASE_PRODUCTION_SESSION_URL` and `SUPABASE_PREVIEW_SESSION_URL`. Confirm Preview is not under active test, then run:

```powershell
$backupRoot = 'C:\Users\ricar\OneDrive\Documentos\TorneosKelmeBackups\production'
$latest = Get-ChildItem -LiteralPath $backupRoot -Filter 'production-weekly-*.dump' |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1
if (-not $latest) { throw 'No existe backup semanal para restaurar' }

$previewTarget = [Uri]$env:SUPABASE_PREVIEW_SESSION_URL
$productionSource = [Uri]$env:SUPABASE_PRODUCTION_SESSION_URL
$previewUser = $previewTarget.UserInfo.Split(':')[0]
$productionUser = $productionSource.UserInfo.Split(':')[0]
if ($previewUser -eq $productionUser) {
  throw 'Preview y Production usan el mismo usuario de proyecto'
}

$envFile = Join-Path $env:TEMP 'torneos-kelme-restore-drill.env'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $envFile,
  "SUPABASE_PREVIEW_SESSION_URL=$env:SUPABASE_PREVIEW_SESSION_URL`nBACKUP_FILE=$($latest.Name)`n",
  $utf8NoBom
)

try {
  docker run --rm `
    --env-file $envFile `
    -v "${backupRoot}:/backup" `
    postgres:17 `
    sh -lc 'pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname="$SUPABASE_PREVIEW_SESSION_URL" "/backup/$BACKUP_FILE"'
  if ($LASTEXITCODE -ne 0) { throw 'Falló restore drill en Preview' }
}
finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
}

$env:DIRECT_URL = $env:SUPABASE_PREVIEW_SESSION_URL
$env:NEON_DIRECT_URL = $env:SUPABASE_PRODUCTION_SESSION_URL
$env:SUPABASE_SESSION_URL = $env:SUPABASE_PREVIEW_SESSION_URL
npx prisma migrate status
npx tsx scripts/verify-database-migration.ts

Remove-Item Env:\DIRECT_URL -ErrorAction SilentlyContinue
Remove-Item Env:\NEON_DIRECT_URL -ErrorAction SilentlyContinue
Remove-Item Env:\SUPABASE_SESSION_URL -ErrorAction SilentlyContinue
Remove-Item Env:\SUPABASE_PRODUCTION_SESSION_URL -ErrorAction SilentlyContinue
Remove-Item Env:\SUPABASE_PREVIEW_SESSION_URL -ErrorAction SilentlyContinue
```

Expected: restore works, migration history is current and verification passes against the chosen backup source.

---

### Task 14: Retire Render and Neon after stability

**Files:**
- Delete: `render.yaml`
- Modify: `docs/DEPLOY.md`
- Modify: `docs/operations/vercel-supabase-cutover.md`
- Modify locally: `docs/handoff/SESSION-CONTEXT.md`

- [ ] **Step 1: Confirm retirement gates**

Require:

- seven uninterrupted stable days;
- seven successful cron invocations;
- full role smoke passed;
- at least one valid Production weekly backup;
- final Neon dump retained with SHA;
- no pending rollback to Render;
- Supabase is confirmed authoritative.

- [ ] **Step 2: Retire Render**

1. Suspend Render.
2. Verify Vercel remains healthy.
3. Delete the Render service.
4. Remove Render runtime secrets from operational stores after recording service metadata.

Expected: Render no longer serves or writes.

- [ ] **Step 3: Retire Neon from runtime**

1. Remove Neon URLs from all active environments.
2. Revoke application credentials.
3. Rename the Neon project or branch `torneos-kelme-retired-2026-08-10`.
4. Keep it non-authoritative as historical rollback evidence until separate deletion approval.

Expected: no app runtime can connect to Neon.

- [ ] **Step 4: Return Vercel branch tracking to `main`**

Vercel Settings → Environments → Production → Branch Tracking:

```text
main
```

Expected: future pushes to `main` create Production deployments.

- [ ] **Step 5: Remove Render configuration**

```powershell
git switch main
git pull --ff-only origin main
git switch -c chore/retire-render
git rm render.yaml
```

Update deployment docs to mark Render/Neon retired while retaining rollback history.

- [ ] **Step 6: Update local handoff**

Record in `docs/handoff/SESSION-CONTEXT.md`:

- exact free Vercel Production URL;
- deployed SHA and commit message;
- cutover timestamp in `America/Santiago`;
- Supabase Preview/Production project names and refs;
- Node.js 22.x and region `gru1`;
- 20 restored migrations;
- Auth.js retained;
- first-write gate timestamp;
- cron schedule and latest result;
- weekly/pre-release backup location and latest SHA;
- paused-project recovery link;
- Render deletion;
- Neon retirement;
- prohibition on Vercel build migrations.

Do not stage this ignored local file.

- [ ] **Step 7: Commit retirement**

```powershell
git add docs/DEPLOY.md docs/operations/vercel-supabase-cutover.md
git commit -m "chore: retire Render after stable Vercel cutover"
npx vitest run
npx tsc --noEmit
npm run build
git push -u origin chore/retire-render
```

Expected: all verification passes and the retirement PR contains no application behavior changes.

---

## Final Acceptance

- [ ] Two isolated Supabase Free projects exist in São Paulo.
- [ ] Vercel uses Node.js 22.x, `gru1` and its initial free URL.
- [ ] Auth.js Credentials/JWT, users, hashes and roles are preserved.
- [ ] Health route returns `401`, `200` and `503` as specified.
- [ ] Health route is exempted only from proxy session authentication.
- [ ] Production cron runs daily at `12:00 UTC` with `CRON_SECRET`.
- [ ] Preview and Production secrets differ.
- [ ] Vercel builds generate Prisma Client but never run migrations.
- [ ] Phase 2 verifier passes for the final restore.
- [ ] All 20 Prisma migrations remain recorded.
- [ ] Admin, Coach, Player, Friendly Coach and Referee smoke tests pass.
- [ ] Realtime and polling recovery pass in separate browsers.
- [ ] Images and crests survive migration and controlled upload.
- [ ] The first Supabase write is recorded as the authority boundary.
- [ ] Rollback never creates two writable sources.
- [ ] Seven uninterrupted observation days pass.
- [ ] Weekly backups are off-repo, hashed and readable.
- [ ] At least four weekly backups are retained after the fourth week.
- [ ] Pre-release backups are retained independently.
- [ ] Paused-project recovery is documented; its non-destructive verification steps pass without intentionally pausing Production.
- [ ] Render is deleted and Neon is removed from runtime.
- [ ] Deployment docs and local handoff reflect the final state.

## Execution Handoff

Plan complete at `docs/superpowers/plans/2026-08-03-vercel-supabase-cutover.md`.

Execution options:

1. **Subagent-Driven (recommended):** use `superpowers:subagent-driven-development`, one task at a time with review between tasks.
2. **Inline Execution:** use `superpowers:executing-plans`, execute in batches with explicit checkpoints before external operations and before the first Production write.
