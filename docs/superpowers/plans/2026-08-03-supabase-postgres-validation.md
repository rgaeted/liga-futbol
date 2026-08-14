# Supabase Postgres Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar y ensayar en un proyecto Supabase Preview aislado una migración verificable de PostgreSQL desde Neon, preservando las 20 migraciones actuales, todas las tablas y las cinco columnas `BYTEA`, sin tocar Supabase Production.

**Architecture:** Un módulo puro centraliza el contrato de `DATABASE_URL` y `DIRECT_URL`; el runtime usa Supavisor Transaction Mode con un pool de una conexión, mientras Prisma CLI y los scripts mutables usan Session Mode o una conexión directa. Un verificador toma snapshots consistentes de Neon y Supabase Preview, deriva el inventario de migraciones desde el repositorio, compara el inventario completo de tablas y guarda un reporte sin URLs fuera del repositorio. El dump de ensayo también vive fuera del repositorio y Supabase Production no se crea hasta el corte final.

**Tech Stack:** Node.js 22.x, Next.js 16, TypeScript, Prisma 7, `@prisma/adapter-pg`, `pg`, Vitest, PostgreSQL CLI (`pg_dump`, `psql`) y Supabase Supavisor.

---

## Global Constraints

- Este plan cubre solamente la fase 2: conexión Supabase Postgres, Prisma serverless, ensayo de dump/restore, verificación automática y documentación de datos.
- No implementar Realtime, Vercel Preview/Production, `proxy.ts`, modo mantenimiento, corte final, redirección, rollback de tráfico ni retiro de Render/Neon.
- Usar Node.js 22.x en desarrollo, CI y documentación operacional.
- No agregar, quitar ni actualizar dependencias. Usar únicamente las dependencias y versiones resueltas actualmente por el repositorio.
- No modificar `prisma/schema.prisma` ni crear migraciones en esta fase.
- El inventario aprobado al iniciar esta fase es exactamente de 20 directorios bajo `prisma/migrations/`.
- El verificador debe derivar nombres y checksums desde esos directorios y fallar explícitamente si el repositorio contiene una cantidad distinta de 20. Una migración futura requiere revisar este plan y actualizar conscientemente el contrato, no puede pasar inadvertida.
- El verificador debe comparar el inventario completo de tablas base del schema `public`, incluyendo nombres y conteos de filas en Neon y Supabase Preview. No usar una lista parcial de modelos.
- El ensayo usa una rama Neon aislada e inmutable como origen y el proyecto Supabase Preview aislado como destino.
- Supabase Production no se crea durante esta fase; queda reservado para el dump final del corte.
- No ejecutar nuevamente las migraciones históricas sobre un dump restaurado.
- No almacenar URLs reales, dumps SQL ni reportes con datos en el repositorio, aunque estén ignorados por Git.
- `DUMP_PATH` y `MIGRATION_REPORT_PATH` deben resolver fuera de la raíz del repositorio.
- No imprimir connection strings ni contraseñas. Los comandos reciben secretos únicamente mediante variables de entorno del proceso.
- `DATABASE_URL` en Vercel debe usar Supavisor Transaction Mode, puerto `6543`, `pgbouncer=true` y `connection_limit=1`.
- `DIRECT_URL` debe usar Supavisor Session Mode, puerto `5432`, o una conexión PostgreSQL directa. Nunca debe usar Transaction Mode.
- `prisma migrate`, `prisma db push`, `prisma db execute`, seed y scripts demo mutables deben exigir `DIRECT_URL`.
- Mantener compatibilidad temporal con Render + Neon hasta la fase 3.
- Todos los comandos operacionales de este plan usan sintaxis PowerShell.
- Aplicar TDD red-green para cada unidad de lógica nueva.
- Crear commits pequeños después de cada unidad verde. No incluir `.env`, `.next`, dumps, reportes operacionales ni credenciales.

## File Map

### Create

- `src/lib/database-env.ts` — valida URLs runtime, CLI y scripts; expone opciones puras del pool serverless.
- `tests/lib/database-env.test.ts` — cubre Transaction Mode, Session Mode, conexión directa, selección CLI y pool.
- `scripts/lib/database-migration-verifier.ts` — deriva el inventario del repositorio, toma snapshots y compara datos.
- `scripts/verify-database-migration.ts` — CLI que conecta origen/destino y escribe el reporte fuera del repositorio.
- `tests/scripts/database-migration-verifier.test.ts` — cubre el contrato de 20 migraciones, checksums, tablas y diferencias.
- `docs/operations/supabase-preview-database-rehearsal.md` — runbook PowerShell del ensayo Neon → Supabase Preview.

### Modify

- `package.json` — fija Node.js 22.x y agrega `db:verify:migration`; no cambia dependencias.
- `src/lib/db.ts` — aplica el pool serverless de máximo una conexión.
- `prisma.config.ts` — elimina la derivación específica de hostname Neon y selecciona la URL según el comando.
- `prisma/seed.ts` — usa obligatoriamente `DIRECT_URL`.
- `prisma/lib/db-client.ts` — hace que seed demo y clear demo usen `DIRECT_URL`.
- `.env.example` — documenta el contrato sin valores reales.
- `README.md` — documenta Node.js 22.x y el comando de verificación.
- `docs/DEPLOY.md` — enlaza el ensayo Preview y deja Production reservado para el corte.

### Explicitly Unchanged

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `package-lock.json`
- `render.yaml`
- `server.ts`
- `src/server/socket.ts`
- `src/lib/socket-client.ts`
- Todo archivo de Realtime, proxy, mantenimiento o corte final.

## Interfaces

### Database connection contract

```typescript
export type DatabaseEnvironment = Readonly<Record<string, string | undefined>>

export interface ServerlessPoolOptions {
  max: 1
  idleTimeoutMillis: 10_000
  connectionTimeoutMillis: 10_000
  allowExitOnIdle: true
}

export interface RuntimeDatabaseConfig {
  connectionString: string
  pool: ServerlessPoolOptions
}

export function getRuntimeDatabaseUrl(
  env?: DatabaseEnvironment,
): string

export function getRuntimeDatabaseConfig(
  env?: DatabaseEnvironment,
): RuntimeDatabaseConfig

export function requireDirectDatabaseUrl(
  env?: DatabaseEnvironment,
): string

export function prismaCommandRequiresDirectUrl(
  argv: readonly string[],
): boolean

export function getPrismaCliDatabaseUrl(
  env?: DatabaseEnvironment,
  argv?: readonly string[],
): string
```

### Repository migration inventory

```typescript
export interface RepositoryMigration {
  name: string
  checksum: string
}

export async function readRepositoryMigrations(
  repositoryRoot?: string,
): Promise<RepositoryMigration[]>
```

### Database migration verifier

```typescript
export interface TableInventoryEntry {
  schema: 'public'
  table: string
  rowCount: number
}

export interface DatabaseSnapshot {
  tables: TableInventoryEntry[]
  migrations: DatabaseMigration[]
  users: UserIdentity[]
  matchesByStatusAndType: GroupedCount[]
  eventsByType: GroupedCount[]
  foreignKeyOrphans: ForeignKeyOrphan[]
  byteaColumns: ByteaColumnSummary[]
}

export interface VerificationResult {
  ok: boolean
  differences: string[]
}

export function compareDatabaseSnapshots(
  repositoryMigrations: readonly RepositoryMigration[],
  source: DatabaseSnapshot,
  target: DatabaseSnapshot,
): VerificationResult

export async function collectDatabaseSnapshot(
  pool: import('pg').Pool,
): Promise<DatabaseSnapshot>
```

### CLI environment and report

```typescript
export interface VerificationEnvironment {
  neonUrl: string
  supabasePreviewUrl: string
  reportPath: string
}

export function validateVerificationEnvironment(
  env?: Readonly<Record<string, string | undefined>>,
  repositoryRoot?: string,
): VerificationEnvironment
```

## Task 1: Lock Node.js 22.x and validate connection URLs

**Files:**
- Create: `src/lib/database-env.ts`
- Create: `tests/lib/database-env.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Confirm the execution environment before editing**

Run:

```powershell
node --version
npm --version
```

Expected:

```text
v22.
```

The Node output must begin with `v22.`. npm must exit `0`; no specific npm version is required.

- [ ] **Step 2: Write the failing URL-validation tests**

Create `tests/lib/database-env.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  getRuntimeDatabaseUrl,
  requireDirectDatabaseUrl,
} from '@/lib/database-env'

const transactionUrl =
  'postgresql://postgres.previewref:not-a-secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'

const sessionUrl =
  'postgresql://postgres.previewref:not-a-secret@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'

describe('database environment contract', () => {
  it('accepts Supavisor Transaction Mode at runtime', () => {
    expect(
      getRuntimeDatabaseUrl({
        VERCEL: '1',
        DATABASE_URL: transactionUrl,
      }),
    ).toBe(transactionUrl)
  })

  it('accepts local PostgreSQL outside Vercel', () => {
    const localUrl =
      'postgresql://postgres:postgres@localhost:5433/liga_futbol'

    expect(getRuntimeDatabaseUrl({ DATABASE_URL: localUrl })).toBe(localUrl)
  })

  it('rejects a non-Supabase runtime URL in Vercel', () => {
    expect(() =>
      getRuntimeDatabaseUrl({
        VERCEL: '1',
        DATABASE_URL:
          'postgresql://user:not-a-secret@database.example.test:5432/app',
      }),
    ).toThrow('DATABASE_URL must use Supavisor Transaction Mode in Vercel')
  })

  it('rejects Supavisor runtime URLs without transaction parameters', () => {
    expect(() =>
      getRuntimeDatabaseUrl({
        DATABASE_URL:
          'postgresql://postgres.previewref:not-a-secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
      }),
    ).toThrow('DATABASE_URL must include pgbouncer=true')
  })

  it('accepts Supavisor Session Mode as DIRECT_URL', () => {
    expect(requireDirectDatabaseUrl({ DIRECT_URL: sessionUrl })).toBe(
      sessionUrl,
    )
  })

  it('accepts a PostgreSQL direct endpoint as DIRECT_URL', () => {
    const directUrl =
      'postgresql://postgres:not-a-secret@db.previewref.supabase.co:5432/postgres'

    expect(requireDirectDatabaseUrl({ DIRECT_URL: directUrl })).toBe(
      directUrl,
    )
  })

  it('rejects Transaction Mode as DIRECT_URL', () => {
    expect(() =>
      requireDirectDatabaseUrl({ DIRECT_URL: transactionUrl }),
    ).toThrow('DIRECT_URL must not use Supavisor Transaction Mode')
  })

  it('does not fall back from DIRECT_URL to DATABASE_URL', () => {
    expect(() =>
      requireDirectDatabaseUrl({ DATABASE_URL: transactionUrl }),
    ).toThrow('DIRECT_URL is required')
  })
})
```

- [ ] **Step 3: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/lib/database-env.test.ts
```

Expected: exit code `1` with module resolution failing for `@/lib/database-env`.

- [ ] **Step 4: Implement the connection validators**

Create `src/lib/database-env.ts`:

```typescript
export type DatabaseEnvironment = Readonly<
  Record<string, string | undefined>
>

const SUPABASE_POOLER_SUFFIX = '.pooler.supabase.com'
const SUPABASE_DIRECT_PREFIX = 'db.'
const SUPABASE_DIRECT_SUFFIX = '.supabase.co'

function requirePostgresUrl(name: string, value: string | undefined): URL {
  if (!value?.trim()) {
    throw new Error(`${name} is required`)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL`)
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`${name} must use the postgresql protocol`)
  }

  if (!parsed.hostname) {
    throw new Error(`${name} must include a hostname`)
  }

  return parsed
}

function isSupabasePooler(url: URL): boolean {
  return url.hostname.endsWith(SUPABASE_POOLER_SUFFIX)
}

function isSupabaseDirect(url: URL): boolean {
  return (
    url.hostname.startsWith(SUPABASE_DIRECT_PREFIX) &&
    url.hostname.endsWith(SUPABASE_DIRECT_SUFFIX)
  )
}

function assertSupabaseCredentials(name: string, url: URL): void {
  if (!url.username.startsWith('postgres')) {
    throw new Error(`${name} must use a Supabase postgres username`)
  }

  if (!url.password) {
    throw new Error(`${name} must include the database password`)
  }

  if (url.pathname !== '/postgres') {
    throw new Error(`${name} must connect to the postgres database`)
  }
}

function assertSupabaseTransactionUrl(name: string, url: URL): void {
  if (!isSupabasePooler(url) || url.port !== '6543') {
    throw new Error(
      `${name} must use Supavisor Transaction Mode on port 6543`,
    )
  }

  assertSupabaseCredentials(name, url)

  if (url.searchParams.get('pgbouncer') !== 'true') {
    throw new Error(`${name} must include pgbouncer=true`)
  }

  if (url.searchParams.get('connection_limit') !== '1') {
    throw new Error(`${name} must include connection_limit=1`)
  }
}

function assertSessionOrDirectUrl(name: string, url: URL): void {
  if (isSupabasePooler(url)) {
    assertSupabaseCredentials(name, url)

    if (url.port !== '5432') {
      throw new Error(`${name} must use Supavisor Session Mode on port 5432`)
    }

    if (url.searchParams.get('pgbouncer') === 'true') {
      throw new Error(`${name} must not use Supavisor Transaction Mode`)
    }

    return
  }

  if (isSupabaseDirect(url)) {
    assertSupabaseCredentials(name, url)

    if (url.port && url.port !== '5432') {
      throw new Error(`${name} direct connections must use port 5432`)
    }
  }
}

export function getRuntimeDatabaseUrl(
  env: DatabaseEnvironment = process.env,
): string {
  const value = env.DATABASE_URL
  const url = requirePostgresUrl('DATABASE_URL', value)

  if (env.VERCEL === '1' && !isSupabasePooler(url)) {
    throw new Error(
      'DATABASE_URL must use Supavisor Transaction Mode in Vercel',
    )
  }

  if (isSupabasePooler(url)) {
    assertSupabaseTransactionUrl('DATABASE_URL', url)
  }

  return value as string
}

export function requireDirectDatabaseUrl(
  env: DatabaseEnvironment = process.env,
): string {
  const value = env.DIRECT_URL
  const url = requirePostgresUrl('DIRECT_URL', value)

  assertSessionOrDirectUrl('DIRECT_URL', url)

  return value as string
}
```

- [ ] **Step 5: Set the Node.js engine without changing dependencies**

In `package.json`, replace:

```json
"engines": {
  "node": ">=20 <23"
},
```

with:

```json
"engines": {
  "node": "22.x"
},
```

Do not run a dependency update command and do not edit dependency ranges.

- [ ] **Step 6: Run tests and verify green**

Run:

```powershell
npx vitest run tests/lib/database-env.test.ts
npx tsc --noEmit
```

Expected:

- Vitest exits `0` with `8 tests passed`.
- TypeScript exits `0` without diagnostics.

- [ ] **Step 7: Commit**

```powershell
git add package.json src/lib/database-env.ts tests/lib/database-env.test.ts
git commit -m "feat: validate Supabase database connections"
```

## Task 2: Enforce DIRECT_URL for Prisma CLI and scripts

**Files:**
- Modify: `tests/lib/database-env.test.ts`
- Modify: `src/lib/database-env.ts`
- Modify: `prisma.config.ts`
- Modify: `prisma/seed.ts`
- Modify: `prisma/lib/db-client.ts`

- [ ] **Step 1: Add failing CLI-selection tests**

Update the import in `tests/lib/database-env.test.ts`:

```typescript
import {
  getPrismaCliDatabaseUrl,
  getRuntimeDatabaseUrl,
  prismaCommandRequiresDirectUrl,
  requireDirectDatabaseUrl,
} from '@/lib/database-env'
```

Append:

```typescript
describe('Prisma CLI database selection', () => {
  it('requires DIRECT_URL for every migrate command', () => {
    expect(prismaCommandRequiresDirectUrl(['migrate', 'status'])).toBe(true)
    expect(prismaCommandRequiresDirectUrl(['migrate', 'deploy'])).toBe(true)
    expect(prismaCommandRequiresDirectUrl(['migrate', 'dev'])).toBe(true)
  })

  it('requires DIRECT_URL for mutable db commands', () => {
    expect(prismaCommandRequiresDirectUrl(['db', 'push'])).toBe(true)
    expect(prismaCommandRequiresDirectUrl(['db', 'execute'])).toBe(true)
    expect(prismaCommandRequiresDirectUrl(['db', 'seed'])).toBe(true)
  })

  it('allows generate to use DATABASE_URL when DIRECT_URL is absent', () => {
    expect(
      getPrismaCliDatabaseUrl(
        { DATABASE_URL: transactionUrl },
        ['generate'],
      ),
    ).toBe(transactionUrl)
  })

  it('rejects migrate status when DIRECT_URL is absent', () => {
    expect(() =>
      getPrismaCliDatabaseUrl(
        { DATABASE_URL: transactionUrl },
        ['migrate', 'status'],
      ),
    ).toThrow(
      'DIRECT_URL is required for Prisma migrate and mutable db commands',
    )
  })

  it('uses DIRECT_URL whenever it is available', () => {
    expect(
      getPrismaCliDatabaseUrl(
        {
          DATABASE_URL: transactionUrl,
          DIRECT_URL: sessionUrl,
        },
        ['generate'],
      ),
    ).toBe(sessionUrl)
  })
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/lib/database-env.test.ts
```

Expected: exit code `1`, reporting missing exports for `getPrismaCliDatabaseUrl` and `prismaCommandRequiresDirectUrl`.

- [ ] **Step 3: Implement command selection**

Append to `src/lib/database-env.ts`:

```typescript
const MUTABLE_DB_COMMANDS = new Set(['push', 'execute', 'seed'])

export function prismaCommandRequiresDirectUrl(
  argv: readonly string[],
): boolean {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (token === 'migrate') {
      return true
    }

    if (token === 'db' && MUTABLE_DB_COMMANDS.has(argv[index + 1] ?? '')) {
      return true
    }
  }

  return false
}

export function getPrismaCliDatabaseUrl(
  env: DatabaseEnvironment = process.env,
  argv: readonly string[] = process.argv.slice(2),
): string {
  if (env.DIRECT_URL?.trim()) {
    return requireDirectDatabaseUrl(env)
  }

  if (prismaCommandRequiresDirectUrl(argv)) {
    throw new Error(
      'DIRECT_URL is required for Prisma migrate and mutable db commands',
    )
  }

  return getRuntimeDatabaseUrl(env)
}
```

- [ ] **Step 4: Replace Prisma config**

Replace `prisma.config.ts`:

```typescript
import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { getPrismaCliDatabaseUrl } from './src/lib/database-env'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: getPrismaCliDatabaseUrl(process.env, process.argv.slice(2)),
  },
})
```

- [ ] **Step 5: Make the base seed use DIRECT_URL**

In `prisma/seed.ts`, add:

```typescript
import { requireDirectDatabaseUrl } from '../src/lib/database-env'
```

Replace its pool declaration:

```typescript
const pool = new Pool({
  connectionString: requireDirectDatabaseUrl(),
  max: 1,
})
```

- [ ] **Step 6: Make demo scripts use DIRECT_URL**

Replace `prisma/lib/db-client.ts`:

```typescript
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { requireDirectDatabaseUrl } from '../../src/lib/database-env'

export function createPrismaClient() {
  const pool = new Pool({
    connectionString: requireDirectDatabaseUrl(),
    max: 1,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  return { prisma, pool }
}

/** Prefijo de IDs y dominio de emails para datos de prueba eliminables */
export const DEMO_ID_PREFIX = 'demo-'
export const DEMO_EMAIL_DOMAIN = '@demo.torneoskelme.cl'
export const DEMO_PASSWORD = 'password123'
```

- [ ] **Step 7: Verify tests and types**

Run:

```powershell
npx vitest run tests/lib/database-env.test.ts
npx tsc --noEmit
```

Expected:

- Vitest exits `0` with `13 tests passed`.
- TypeScript exits `0` without diagnostics.

- [ ] **Step 8: Commit**

```powershell
git add prisma.config.ts prisma/seed.ts prisma/lib/db-client.ts src/lib/database-env.ts tests/lib/database-env.test.ts
git commit -m "fix: require direct Prisma connections"
```

## Task 3: Apply the serverless pool limit

**Files:**
- Modify: `tests/lib/database-env.test.ts`
- Modify: `src/lib/database-env.ts`
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Add the failing pool test**

Add `getRuntimeDatabaseConfig` to the import in `tests/lib/database-env.test.ts` and append:

```typescript
describe('serverless pool configuration', () => {
  it('limits each runtime instance to one PostgreSQL connection', () => {
    expect(
      getRuntimeDatabaseConfig({
        VERCEL: '1',
        DATABASE_URL: transactionUrl,
      }),
    ).toEqual({
      connectionString: transactionUrl,
      pool: {
        max: 1,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
        allowExitOnIdle: true,
      },
    })
  })
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/lib/database-env.test.ts
```

Expected: exit code `1`, reporting that `getRuntimeDatabaseConfig` is missing.

- [ ] **Step 3: Implement the pure pool config**

Append to `src/lib/database-env.ts`:

```typescript
export interface ServerlessPoolOptions {
  max: 1
  idleTimeoutMillis: 10_000
  connectionTimeoutMillis: 10_000
  allowExitOnIdle: true
}

export interface RuntimeDatabaseConfig {
  connectionString: string
  pool: ServerlessPoolOptions
}

export function getRuntimeDatabaseConfig(
  env: DatabaseEnvironment = process.env,
): RuntimeDatabaseConfig {
  return {
    connectionString: getRuntimeDatabaseUrl(env),
    pool: {
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    },
  }
}
```

- [ ] **Step 4: Replace the runtime Prisma client**

Replace `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { getRuntimeDatabaseConfig } from '@/lib/database-env'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  pool?: Pool
}

function createPrismaClient() {
  const runtime = getRuntimeDatabaseConfig()
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString: runtime.connectionString,
      ...runtime.pool,
    })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool
  }

  return new PrismaClient({
    adapter: new PrismaPg(pool),
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

- [ ] **Step 5: Verify green**

Run:

```powershell
npx vitest run tests/lib/database-env.test.ts
npx tsc --noEmit
```

Expected:

- Vitest exits `0` with `14 tests passed`.
- TypeScript exits `0` without diagnostics.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/db.ts src/lib/database-env.ts tests/lib/database-env.test.ts
git commit -m "feat: limit Prisma serverless connections"
```

## Task 4: Derive and lock the repository migration inventory

**Files:**
- Create: `scripts/lib/database-migration-verifier.ts`
- Create: `tests/scripts/database-migration-verifier.test.ts`

- [ ] **Step 1: Write failing repository-inventory tests**

Create `tests/scripts/database-migration-verifier.test.ts`:

```typescript
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  readRepositoryMigrations,
} from '../../scripts/lib/database-migration-verifier'

const temporaryRoots: string[] = []

async function createRepositoryWithMigrations(count: number): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'liga-migrations-'))
  temporaryRoots.push(root)

  const migrationsRoot = path.join(root, 'prisma', 'migrations')
  await mkdir(migrationsRoot, { recursive: true })

  for (let index = 1; index <= count; index += 1) {
    const name = `202600000000${String(index).padStart(2, '0')}_migration_${index}`
    const directory = path.join(migrationsRoot, name)
    await mkdir(directory)
    await writeFile(
      path.join(directory, 'migration.sql'),
      `CREATE TABLE "Migration${index}" ("id" TEXT PRIMARY KEY);\n`,
      'utf8',
    )
  }

  return root
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  )
})

describe('readRepositoryMigrations', () => {
  it('derives names and SHA-256 checksums for exactly 20 directories', async () => {
    const root = await createRepositoryWithMigrations(20)

    const migrations = await readRepositoryMigrations(root)

    expect(migrations).toHaveLength(20)
    expect(migrations[0]).toEqual({
      name: '20260000000001_migration_1',
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })

  it('fails explicitly when a future migration changes the approved count', async () => {
    const root = await createRepositoryWithMigrations(21)

    await expect(readRepositoryMigrations(root)).rejects.toThrow(
      'Repository migration inventory changed: expected 20 directories, found 21',
    )
  })

  it('fails when a migration directory lacks migration.sql', async () => {
    const root = await createRepositoryWithMigrations(20)
    await rm(
      path.join(
        root,
        'prisma',
        'migrations',
        '20260000000020_migration_20',
        'migration.sql',
      ),
    )

    await expect(readRepositoryMigrations(root)).rejects.toThrow(
      'Migration directory 20260000000020_migration_20 has no migration.sql',
    )
  })
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/scripts/database-migration-verifier.test.ts
```

Expected: exit code `1`, because `scripts/lib/database-migration-verifier.ts` does not exist.

- [ ] **Step 3: Implement repository inventory derivation**

Create the initial `scripts/lib/database-migration-verifier.ts`:

```typescript
import { createHash } from 'node:crypto'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export const APPROVED_MIGRATION_COUNT = 20

export interface RepositoryMigration {
  name: string
  checksum: string
}

export async function readRepositoryMigrations(
  repositoryRoot: string = process.cwd(),
): Promise<RepositoryMigration[]> {
  const migrationsRoot = path.join(
    repositoryRoot,
    'prisma',
    'migrations',
  )
  const entries = await readdir(migrationsRoot, { withFileTypes: true })
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  if (directories.length !== APPROVED_MIGRATION_COUNT) {
    throw new Error(
      `Repository migration inventory changed: expected ${APPROVED_MIGRATION_COUNT} directories, found ${directories.length}`,
    )
  }

  const migrations: RepositoryMigration[] = []

  for (const name of directories) {
    const sqlPath = path.join(migrationsRoot, name, 'migration.sql')

    try {
      await access(sqlPath)
    } catch {
      throw new Error(`Migration directory ${name} has no migration.sql`)
    }

    const sql = await readFile(sqlPath)
    migrations.push({
      name,
      checksum: createHash('sha256').update(sql).digest('hex'),
    })
  }

  return migrations
}
```

- [ ] **Step 4: Run the inventory tests and verify green**

Run:

```powershell
npx vitest run tests/scripts/database-migration-verifier.test.ts
```

Expected: exit code `0` with `3 tests passed`.

- [ ] **Step 5: Confirm the real repository inventory**

Run:

```powershell
npx tsx -e 'import { readRepositoryMigrations } from "./scripts/lib/database-migration-verifier"; void readRepositoryMigrations().then((items) => console.log(items.length))'
```

Expected:

```text
20
```

- [ ] **Step 6: Commit**

```powershell
git add scripts/lib/database-migration-verifier.ts tests/scripts/database-migration-verifier.test.ts
git commit -m "test: lock approved Prisma migration inventory"
```

## Task 5: Compare complete database snapshots

**Files:**
- Modify: `scripts/lib/database-migration-verifier.ts`
- Modify: `tests/scripts/database-migration-verifier.test.ts`

- [ ] **Step 1: Add failing comparison tests**

Replace `tests/scripts/database-migration-verifier.test.ts` with:

```typescript
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  compareDatabaseSnapshots,
  readRepositoryMigrations,
  type DatabaseSnapshot,
  type RepositoryMigration,
} from '../../scripts/lib/database-migration-verifier'

const temporaryRoots: string[] = []

async function createRepositoryWithMigrations(count: number): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'liga-migrations-'))
  temporaryRoots.push(root)

  const migrationsRoot = path.join(root, 'prisma', 'migrations')
  await mkdir(migrationsRoot, { recursive: true })

  for (let index = 1; index <= count; index += 1) {
    const name = `202600000000${String(index).padStart(2, '0')}_migration_${index}`
    const directory = path.join(migrationsRoot, name)
    await mkdir(directory)
    await writeFile(
      path.join(directory, 'migration.sql'),
      `CREATE TABLE "Migration${index}" ("id" TEXT PRIMARY KEY);\n`,
      'utf8',
    )
  }

  return root
}

function repositoryMigrations(): RepositoryMigration[] {
  return Array.from({ length: 20 }, (_, index) => ({
    name: `migration-${String(index + 1).padStart(2, '0')}`,
    checksum: `checksum-${index + 1}`,
  }))
}

function databaseSnapshot(): DatabaseSnapshot {
  return {
    tables: [
      { schema: 'public', table: 'User', rowCount: 2 },
      { schema: 'public', table: '_prisma_migrations', rowCount: 20 },
    ],
    migrations: repositoryMigrations().map((migration) => ({
      name: migration.name,
      checksum: migration.checksum,
      finished: true,
      rolledBack: false,
    })),
    users: [
      { id: 'user-1', email: 'admin@liga.com' },
      { id: 'user-2', email: 'jugador@liga.com' },
    ],
    matchesByStatusAndType: [
      { key: 'FINISHED|LEAGUE', count: 1 },
    ],
    eventsByType: [{ key: 'GOAL', count: 2 }],
    foreignKeyOrphans: [
      {
        key: 'public.Player.Player_userId_fkey',
        count: 0,
      },
    ],
    byteaColumns: [
      {
        key: 'public.FriendlyPlayer.photoData',
        nonNullRows: 2,
        totalBytes: 200,
      },
      {
        key: 'public.Match.sideACrestData',
        nonNullRows: 1,
        totalBytes: 80,
      },
      {
        key: 'public.Match.sideBCrestData',
        nonNullRows: 1,
        totalBytes: 90,
      },
      {
        key: 'public.MatchTeamMvp.photoData',
        nonNullRows: 1,
        totalBytes: 110,
      },
      {
        key: 'public.Team.crestData',
        nonNullRows: 1,
        totalBytes: 120,
      },
    ],
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  )
})

describe('readRepositoryMigrations', () => {
  it('derives names and SHA-256 checksums for exactly 20 directories', async () => {
    const root = await createRepositoryWithMigrations(20)

    const migrations = await readRepositoryMigrations(root)

    expect(migrations).toHaveLength(20)
    expect(migrations[0]).toEqual({
      name: '20260000000001_migration_1',
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })

  it('fails explicitly when a future migration changes the approved count', async () => {
    const root = await createRepositoryWithMigrations(21)

    await expect(readRepositoryMigrations(root)).rejects.toThrow(
      'Repository migration inventory changed: expected 20 directories, found 21',
    )
  })

  it('fails when a migration directory lacks migration.sql', async () => {
    const root = await createRepositoryWithMigrations(20)
    await rm(
      path.join(
        root,
        'prisma',
        'migrations',
        '20260000000020_migration_20',
        'migration.sql',
      ),
    )

    await expect(readRepositoryMigrations(root)).rejects.toThrow(
      'Migration directory 20260000000020_migration_20 has no migration.sql',
    )
  })
})

describe('compareDatabaseSnapshots', () => {
  it('accepts identical complete inventories', () => {
    const source = databaseSnapshot()
    const target = structuredClone(source)

    expect(
      compareDatabaseSnapshots(repositoryMigrations(), source, target),
    ).toEqual({
      ok: true,
      differences: [],
    })
  })

  it('reports missing tables instead of comparing a partial model list', () => {
    const source = databaseSnapshot()
    const target = structuredClone(source)
    target.tables = target.tables.filter((entry) => entry.table !== 'User')

    expect(
      compareDatabaseSnapshots(repositoryMigrations(), source, target)
        .differences,
    ).toContain('tables differs between Neon and Supabase Preview')
  })

  it('reports repository, orphan and BYTEA differences', () => {
    const source = databaseSnapshot()
    const target = structuredClone(source)
    target.migrations.pop()
    target.foreignKeyOrphans[0].count = 1
    target.byteaColumns[4].totalBytes = 119

    const result = compareDatabaseSnapshots(
      repositoryMigrations(),
      source,
      target,
    )

    expect(result.ok).toBe(false)
    expect(result.differences).toEqual(
      expect.arrayContaining([
        'Supabase Preview migrations do not match repository migrations',
        'Supabase Preview contains 1 foreign-key orphan(s) in public.Player.Player_userId_fkey',
        'migrations differs between Neon and Supabase Preview',
        'foreignKeyOrphans differs between Neon and Supabase Preview',
        'byteaColumns differs between Neon and Supabase Preview',
      ]),
    )
  })

  it('requires exactly five BYTEA columns on both databases', () => {
    const source = databaseSnapshot()
    const target = structuredClone(source)
    target.byteaColumns.pop()

    expect(
      compareDatabaseSnapshots(repositoryMigrations(), source, target)
        .differences,
    ).toContain(
      'Supabase Preview must contain exactly 5 BYTEA columns; found 4',
    )
  })
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/scripts/database-migration-verifier.test.ts
```

Expected: exit code `1`, reporting missing snapshot types and `compareDatabaseSnapshots`.

- [ ] **Step 3: Add snapshot types and pure comparison**

Append to `scripts/lib/database-migration-verifier.ts`:

```typescript
export interface TableInventoryEntry {
  schema: 'public'
  table: string
  rowCount: number
}

export interface DatabaseMigration {
  name: string
  checksum: string
  finished: boolean
  rolledBack: boolean
}

export interface UserIdentity {
  id: string
  email: string
}

export interface GroupedCount {
  key: string
  count: number
}

export interface ForeignKeyOrphan {
  key: string
  count: number
}

export interface ByteaColumnSummary {
  key: string
  nonNullRows: number
  totalBytes: number
}

export interface DatabaseSnapshot {
  tables: TableInventoryEntry[]
  migrations: DatabaseMigration[]
  users: UserIdentity[]
  matchesByStatusAndType: GroupedCount[]
  eventsByType: GroupedCount[]
  foreignKeyOrphans: ForeignKeyOrphan[]
  byteaColumns: ByteaColumnSummary[]
}

export interface VerificationResult {
  ok: boolean
  differences: string[]
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function repositoryMatchesDatabase(
  repositoryMigrations: readonly RepositoryMigration[],
  databaseMigrations: readonly DatabaseMigration[],
): boolean {
  return sameValue(
    repositoryMigrations,
    databaseMigrations.map(({ name, checksum }) => ({ name, checksum })),
  )
}

function addDatabaseHealthDifferences(
  label: 'Neon' | 'Supabase Preview',
  repositoryMigrations: readonly RepositoryMigration[],
  snapshot: DatabaseSnapshot,
  differences: string[],
): void {
  if (!repositoryMatchesDatabase(repositoryMigrations, snapshot.migrations)) {
    differences.push(`${label} migrations do not match repository migrations`)
  }

  const unsuccessful = snapshot.migrations.filter(
    (migration) => !migration.finished || migration.rolledBack,
  )

  if (unsuccessful.length > 0) {
    differences.push(
      `${label} contains ${unsuccessful.length} unfinished or rolled-back migration row(s)`,
    )
  }

  for (const orphan of snapshot.foreignKeyOrphans) {
    if (orphan.count > 0) {
      differences.push(
        `${label} contains ${orphan.count} foreign-key orphan(s) in ${orphan.key}`,
      )
    }
  }

  if (snapshot.byteaColumns.length !== 5) {
    differences.push(
      `${label} must contain exactly 5 BYTEA columns; found ${snapshot.byteaColumns.length}`,
    )
  }
}

export function compareDatabaseSnapshots(
  repositoryMigrations: readonly RepositoryMigration[],
  source: DatabaseSnapshot,
  target: DatabaseSnapshot,
): VerificationResult {
  const differences: string[] = []

  addDatabaseHealthDifferences(
    'Neon',
    repositoryMigrations,
    source,
    differences,
  )
  addDatabaseHealthDifferences(
    'Supabase Preview',
    repositoryMigrations,
    target,
    differences,
  )

  const sections: Array<keyof DatabaseSnapshot> = [
    'tables',
    'migrations',
    'users',
    'matchesByStatusAndType',
    'eventsByType',
    'foreignKeyOrphans',
    'byteaColumns',
  ]

  for (const section of sections) {
    if (!sameValue(source[section], target[section])) {
      differences.push(
        `${section} differs between Neon and Supabase Preview`,
      )
    }
  }

  return {
    ok: differences.length === 0,
    differences,
  }
}
```

- [ ] **Step 4: Run comparison tests and verify green**

Run:

```powershell
npx vitest run tests/scripts/database-migration-verifier.test.ts
```

Expected: exit code `0` with `7 tests passed`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/lib/database-migration-verifier.ts tests/scripts/database-migration-verifier.test.ts
git commit -m "feat: compare complete database inventories"
```

## Task 6: Collect PostgreSQL snapshots and write an external report

**Files:**
- Modify: `scripts/lib/database-migration-verifier.ts`
- Create: `scripts/verify-database-migration.ts`
- Modify: `tests/scripts/database-migration-verifier.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add failing report-path tests**

Add this import to `tests/scripts/database-migration-verifier.test.ts`:

```typescript
import {
  validateVerificationEnvironment,
} from '../../scripts/verify-database-migration'
```

Append:

```typescript
describe('validateVerificationEnvironment', () => {
  it('requires Preview-specific URLs and an external report path', () => {
    expect(() => validateVerificationEnvironment({}, process.cwd())).toThrow(
      'NEON_DIRECT_URL is required',
    )
  })

  it('rejects reports stored inside the repository', () => {
    expect(() =>
      validateVerificationEnvironment(
        {
          NEON_DIRECT_URL:
            'postgresql://source:not-a-secret@neon.example.test:5432/app',
          SUPABASE_PREVIEW_SESSION_URL:
            'postgresql://target:not-a-secret@preview.example.test:5432/postgres',
          MIGRATION_REPORT_PATH: path.join(
            process.cwd(),
            'database-report.json',
          ),
        },
        process.cwd(),
      ),
    ).toThrow('MIGRATION_REPORT_PATH must be outside the repository')
  })

  it('accepts distinct databases and a temp report path', () => {
    const reportPath = path.join(
      os.tmpdir(),
      'liga-futbol-database-report.json',
    )

    expect(
      validateVerificationEnvironment(
        {
          NEON_DIRECT_URL:
            'postgresql://source:not-a-secret@neon.example.test:5432/app',
          SUPABASE_PREVIEW_SESSION_URL:
            'postgresql://target:not-a-secret@preview.example.test:5432/postgres',
          MIGRATION_REPORT_PATH: reportPath,
        },
        process.cwd(),
      ),
    ).toEqual({
      neonUrl:
        'postgresql://source:not-a-secret@neon.example.test:5432/app',
      supabasePreviewUrl:
        'postgresql://target:not-a-secret@preview.example.test:5432/postgres',
      reportPath,
    })
  })
})
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```powershell
npx vitest run tests/scripts/database-migration-verifier.test.ts
```

Expected: exit code `1`, because `scripts/verify-database-migration.ts` does not exist.

- [ ] **Step 3: Add PostgreSQL snapshot collection**

At the top of `scripts/lib/database-migration-verifier.ts`, add:

```typescript
import type {
  Pool,
  PoolClient,
  QueryResultRow,
} from 'pg'
```

Append the following complete collector:

```typescript
interface NameRow extends QueryResultRow {
  name: string
}

interface CountRow extends QueryResultRow {
  count: string
}

interface MigrationRow extends QueryResultRow {
  name: string
  checksum: string
  finished: boolean
  rolledBack: boolean
}

interface UserRow extends QueryResultRow {
  id: string
  email: string
}

interface GroupedCountRow extends QueryResultRow {
  key: string
  count: string
}

interface ByteaMetadataRow extends QueryResultRow {
  schema: 'public'
  table: string
  column: string
}

interface ByteaCountRow extends QueryResultRow {
  nonNullRows: string
  totalBytes: string
}

interface ForeignKeyRow extends QueryResultRow {
  constraintName: string
  childSchema: string
  childTable: string
  parentSchema: string
  parentTable: string
  childColumns: string[]
  parentColumns: string[]
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

async function readCompleteTableInventory(
  client: PoolClient,
): Promise<TableInventoryEntry[]> {
  const result = await client.query<NameRow>(`
    SELECT tablename AS name
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)

  const inventory: TableInventoryEntry[] = []

  for (const row of result.rows) {
    const count = await client.query<CountRow>(
      `SELECT COUNT(*)::text AS count FROM public.${quoteIdentifier(row.name)}`,
    )
    inventory.push({
      schema: 'public',
      table: row.name,
      rowCount: Number(count.rows[0].count),
    })
  }

  return inventory
}

async function readDatabaseMigrations(
  client: PoolClient,
): Promise<DatabaseMigration[]> {
  const result = await client.query<MigrationRow>(`
    SELECT
      migration_name AS name,
      checksum,
      finished_at IS NOT NULL AS finished,
      rolled_back_at IS NOT NULL AS "rolledBack"
    FROM public._prisma_migrations
    ORDER BY migration_name
  `)

  return result.rows
}

async function readUsers(client: PoolClient): Promise<UserIdentity[]> {
  const result = await client.query<UserRow>(`
    SELECT id, email
    FROM public."User"
    ORDER BY id, email
  `)

  return result.rows
}

async function readGroupedCounts(
  client: PoolClient,
  sql: string,
): Promise<GroupedCount[]> {
  const result = await client.query<GroupedCountRow>(sql)
  return result.rows.map((row) => ({
    key: row.key,
    count: Number(row.count),
  }))
}

async function readForeignKeys(
  client: PoolClient,
): Promise<ForeignKeyRow[]> {
  const result = await client.query<ForeignKeyRow>(`
    SELECT
      constraint_row.conname AS "constraintName",
      child_namespace.nspname AS "childSchema",
      child_table.relname AS "childTable",
      parent_namespace.nspname AS "parentSchema",
      parent_table.relname AS "parentTable",
      array_agg(
        child_attribute.attname
        ORDER BY child_key.ordinality
      ) AS "childColumns",
      array_agg(
        parent_attribute.attname
        ORDER BY parent_key.ordinality
      ) AS "parentColumns"
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS child_table
      ON child_table.oid = constraint_row.conrelid
    JOIN pg_namespace AS child_namespace
      ON child_namespace.oid = child_table.relnamespace
    JOIN pg_class AS parent_table
      ON parent_table.oid = constraint_row.confrelid
    JOIN pg_namespace AS parent_namespace
      ON parent_namespace.oid = parent_table.relnamespace
    CROSS JOIN LATERAL unnest(constraint_row.conkey)
      WITH ORDINALITY AS child_key(attnum, ordinality)
    JOIN LATERAL unnest(constraint_row.confkey)
      WITH ORDINALITY AS parent_key(attnum, ordinality)
      ON parent_key.ordinality = child_key.ordinality
    JOIN pg_attribute AS child_attribute
      ON child_attribute.attrelid = child_table.oid
      AND child_attribute.attnum = child_key.attnum
    JOIN pg_attribute AS parent_attribute
      ON parent_attribute.attrelid = parent_table.oid
      AND parent_attribute.attnum = parent_key.attnum
    WHERE constraint_row.contype = 'f'
      AND child_namespace.nspname = 'public'
    GROUP BY
      constraint_row.conname,
      child_namespace.nspname,
      child_table.relname,
      parent_namespace.nspname,
      parent_table.relname
    ORDER BY
      child_namespace.nspname,
      child_table.relname,
      constraint_row.conname
  `)

  return result.rows
}

async function readForeignKeyOrphans(
  client: PoolClient,
): Promise<ForeignKeyOrphan[]> {
  const foreignKeys = await readForeignKeys(client)
  const orphans: ForeignKeyOrphan[] = []

  for (const foreignKey of foreignKeys) {
    const childNotNull = foreignKey.childColumns
      .map((column) => `child.${quoteIdentifier(column)} IS NOT NULL`)
      .join(' AND ')
    const joinConditions = foreignKey.childColumns
      .map(
        (column, index) =>
          `child.${quoteIdentifier(column)} = parent.${quoteIdentifier(
            foreignKey.parentColumns[index],
          )}`,
      )
      .join(' AND ')

    const result = await client.query<CountRow>(`
      SELECT COUNT(*)::text AS count
      FROM ${quoteIdentifier(foreignKey.childSchema)}.${quoteIdentifier(
        foreignKey.childTable,
      )} AS child
      LEFT JOIN ${quoteIdentifier(
        foreignKey.parentSchema,
      )}.${quoteIdentifier(foreignKey.parentTable)} AS parent
        ON ${joinConditions}
      WHERE ${childNotNull}
        AND parent.ctid IS NULL
    `)

    orphans.push({
      key: `${foreignKey.childSchema}.${foreignKey.childTable}.${foreignKey.constraintName}`,
      count: Number(result.rows[0].count),
    })
  }

  return orphans
}

async function readByteaColumns(
  client: PoolClient,
): Promise<ByteaColumnSummary[]> {
  const metadata = await client.query<ByteaMetadataRow>(`
    SELECT
      table_schema AS schema,
      table_name AS table,
      column_name AS column
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'bytea'
    ORDER BY table_schema, table_name, column_name
  `)

  const columns: ByteaColumnSummary[] = []

  for (const entry of metadata.rows) {
    const result = await client.query<ByteaCountRow>(`
      SELECT
        COUNT(${quoteIdentifier(entry.column)})::text AS "nonNullRows",
        COALESCE(
          SUM(octet_length(${quoteIdentifier(entry.column)})),
          0
        )::text AS "totalBytes"
      FROM ${quoteIdentifier(entry.schema)}.${quoteIdentifier(entry.table)}
    `)

    columns.push({
      key: `${entry.schema}.${entry.table}.${entry.column}`,
      nonNullRows: Number(result.rows[0].nonNullRows),
      totalBytes: Number(result.rows[0].totalBytes),
    })
  }

  return columns
}

export async function collectDatabaseSnapshot(
  pool: Pool,
): Promise<DatabaseSnapshot> {
  const client = await pool.connect()

  try {
    await client.query(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
    )

    const snapshot: DatabaseSnapshot = {
      tables: await readCompleteTableInventory(client),
      migrations: await readDatabaseMigrations(client),
      users: await readUsers(client),
      matchesByStatusAndType: await readGroupedCounts(
        client,
        `
          SELECT
            status::text || '|' || "matchType"::text AS key,
            COUNT(*)::text AS count
          FROM public."Match"
          GROUP BY status, "matchType"
          ORDER BY status, "matchType"
        `,
      ),
      eventsByType: await readGroupedCounts(
        client,
        `
          SELECT
            type::text AS key,
            COUNT(*)::text AS count
          FROM public."MatchEvent"
          GROUP BY type
          ORDER BY type
        `,
      ),
      foreignKeyOrphans: await readForeignKeyOrphans(client),
      byteaColumns: await readByteaColumns(client),
    }

    await client.query('COMMIT')
    return snapshot
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

- [ ] **Step 4: Implement the CLI and external report**

Create `scripts/verify-database-migration.ts`:

```typescript
#!/usr/bin/env node
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import {
  collectDatabaseSnapshot,
  compareDatabaseSnapshots,
  readRepositoryMigrations,
} from './lib/database-migration-verifier'

export interface VerificationEnvironment {
  neonUrl: string
  supabasePreviewUrl: string
  reportPath: string
}

function requirePostgresUrl(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = env[name]

  if (!value?.trim()) {
    throw new Error(`${name} is required`)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL`)
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`${name} must use the postgresql protocol`)
  }

  return value
}

function isInsideRepository(
  repositoryRoot: string,
  candidatePath: string,
): boolean {
  const relative = path.relative(
    path.resolve(repositoryRoot),
    path.resolve(candidatePath),
  )
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function validateVerificationEnvironment(
  env: Readonly<Record<string, string | undefined>> = process.env,
  repositoryRoot: string = process.cwd(),
): VerificationEnvironment {
  const neonUrl = requirePostgresUrl(env, 'NEON_DIRECT_URL')
  const supabasePreviewUrl = requirePostgresUrl(
    env,
    'SUPABASE_PREVIEW_SESSION_URL',
  )
  const reportValue = env.MIGRATION_REPORT_PATH

  if (!reportValue?.trim()) {
    throw new Error('MIGRATION_REPORT_PATH is required')
  }

  const reportPath = path.resolve(reportValue)

  if (isInsideRepository(repositoryRoot, reportPath)) {
    throw new Error('MIGRATION_REPORT_PATH must be outside the repository')
  }

  if (
    new URL(neonUrl).toString() ===
    new URL(supabasePreviewUrl).toString()
  ) {
    throw new Error(
      'NEON_DIRECT_URL and SUPABASE_PREVIEW_SESSION_URL must reference different databases',
    )
  }

  return {
    neonUrl,
    supabasePreviewUrl,
    reportPath,
  }
}

function redactDatabaseUrls(message: string): string {
  return message.replace(
    /postgres(?:ql)?:\/\/[^\s]+/gi,
    '[REDACTED_DATABASE_URL]',
  )
}

export async function runDatabaseMigrationVerification(
  env: Readonly<Record<string, string | undefined>> = process.env,
  repositoryRoot: string = process.cwd(),
): Promise<number> {
  const { neonUrl, supabasePreviewUrl, reportPath } =
    validateVerificationEnvironment(env, repositoryRoot)
  const repositoryMigrations =
    await readRepositoryMigrations(repositoryRoot)

  const neonPool = new Pool({
    connectionString: neonUrl,
    max: 1,
    application_name: 'liga-futbol-migration-source',
  })
  const previewPool = new Pool({
    connectionString: supabasePreviewUrl,
    max: 1,
    application_name: 'liga-futbol-migration-preview',
  })

  try {
    const source = await collectDatabaseSnapshot(neonPool)
    const target = await collectDatabaseSnapshot(previewPool)
    const result = compareDatabaseSnapshots(
      repositoryMigrations,
      source,
      target,
    )

    const report = {
      generatedAt: new Date().toISOString(),
      approvedMigrationCount: repositoryMigrations.length,
      repositoryMigrations,
      source,
      target,
      result,
    }

    await mkdir(path.dirname(reportPath), { recursive: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    })

    if (!result.ok) {
      console.error('[verify-db] FAILED')
      for (const difference of result.differences) {
        console.error(`[verify-db] ${difference}`)
      }
      console.error(`[verify-db] Report written outside repository.`)
      return 1
    }

    const totalOrphans = target.foreignKeyOrphans.reduce(
      (total, entry) => total + entry.count,
      0,
    )

    console.log('[verify-db] Neon and Supabase Preview snapshots match.')
    console.log(
      `[verify-db] ${repositoryMigrations.length} repository migrations verified.`,
    )
    console.log(
      `[verify-db] ${target.tables.length} public tables inventoried with ${totalOrphans} FK orphans.`,
    )
    console.log(
      `[verify-db] ${target.byteaColumns.length} BYTEA columns verified.`,
    )
    console.log('[verify-db] Report written outside repository.')
    return 0
  } finally {
    await Promise.allSettled([neonPool.end(), previewPool.end()])
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url))
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : ''

if (currentFile === invokedFile) {
  runDatabaseMigrationVerification()
    .then((exitCode) => {
      process.exitCode = exitCode
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unknown verification error'
      console.error(`[verify-db] ERROR: ${redactDatabaseUrls(message)}`)
      process.exitCode = 1
    })
}
```

- [ ] **Step 5: Add the package script without changing dependencies**

In `package.json`, make the adjacent script entries:

```json
"db:seed:demo": "tsx prisma/seed-demo.ts",
"db:clear:demo": "tsx prisma/clear-demo.ts",
"db:verify:migration": "tsx scripts/verify-database-migration.ts",
"icons": "node scripts/generate-icons.mjs"
```

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```powershell
npx vitest run tests/scripts/database-migration-verifier.test.ts
npx tsc --noEmit
```

Expected:

- Vitest exits `0` with `10 tests passed`.
- TypeScript exits `0` without diagnostics.

- [ ] **Step 7: Confirm dependency metadata did not change**

Run:

```powershell
git diff -- package-lock.json
```

Expected: no output.

- [ ] **Step 8: Commit**

```powershell
git add package.json scripts/lib/database-migration-verifier.ts scripts/verify-database-migration.ts tests/scripts/database-migration-verifier.test.ts
git commit -m "feat: verify Neon against Supabase Preview"
```

## Task 7: Document the Preview rehearsal contract

**Files:**
- Create: `docs/operations/supabase-preview-database-rehearsal.md`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/DEPLOY.md`

- [ ] **Step 1: Extend the environment example without removing phase-1 variables**

Keep the Supabase Realtime and cutover controls from phase 1. Replace the database-related portion so the complete file contains:

```dotenv
# Aplicación local
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liga_futbol"
DIRECT_URL="postgresql://postgres:postgres@localhost:5433/liga_futbol"
AUTH_SECRET="genera-un-secreto-largo-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Supabase Realtime
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_SECRET_KEY=""

# Supabase runtime:
# DATABASE_URL usa Transaction Mode, puerto 6543,
# con pgbouncer=true&connection_limit=1.
#
# Prisma CLI:
# DIRECT_URL usa Session Mode, puerto 5432,
# o una conexión PostgreSQL directa.
#
# Las URLs reales se cargan desde el gestor de secretos.

# Ensayo Neon -> Supabase Preview.
# Estas variables se cargan en el proceso y permanecen vacías en archivos.
NEON_DIRECT_URL=""
SUPABASE_PREVIEW_SESSION_URL=""
SUPABASE_PREVIEW_TRANSACTION_URL=""
DUMP_PATH=""
MIGRATION_REPORT_PATH=""

# Controles temporales del corte; mantener desactivados
MIGRATION_MAINTENANCE_MODE="false"
MIGRATION_REDIRECT_URL=""
```

- [ ] **Step 2: Create the complete PowerShell runbook**

Create `docs/operations/supabase-preview-database-rehearsal.md`:

````markdown
# Ensayo Neon → Supabase Preview

Este procedimiento restaura una copia inmóvil de Neon en un proyecto
Supabase Preview aislado. Supabase Production todavía no existe y no se crea
durante esta fase.

## Contrato de proyectos

1. Usar Node.js 22.x.
2. Crear un proyecto Supabase exclusivo para Preview en South America
   (São Paulo), si la región está disponible.
3. Guardar la contraseña del proyecto Preview en el gestor de secretos.
4. Cargar su Session Pooler en `SUPABASE_PREVIEW_SESSION_URL`.
5. Cargar su Transaction Pooler en `SUPABASE_PREVIEW_TRANSACTION_URL`.
6. Crear una rama Neon llamada `supabase-preview-rehearsal`.
7. No conectar aplicaciones ni ejecutar escrituras en esa rama Neon.
8. Cargar su conexión directa en `NEON_DIRECT_URL`.
9. No crear el proyecto Supabase Production durante esta fase.
10. No copiar URLs reales en archivos, comandos, documentación o tickets.

## Rutas operacionales externas

El dump y el reporte deben vivir bajo el directorio temporal del usuario,
fuera del repositorio:

```powershell
$migrationRoot = Join-Path $env:TEMP 'liga-futbol-supabase-preview'
$env:DUMP_PATH = Join-Path $migrationRoot 'neon-preview.sql'
$env:MIGRATION_REPORT_PATH = Join-Path $migrationRoot 'verification.json'

New-Item -ItemType Directory -Force -Path $migrationRoot | Out-Null
```

Resultado esperado: exit code `0`; las dos rutas comienzan con el valor de
`$env:TEMP`, no con la raíz del repositorio.

## 1. Validar entorno

```powershell
$requiredVariables = @(
  'NEON_DIRECT_URL',
  'SUPABASE_PREVIEW_SESSION_URL',
  'SUPABASE_PREVIEW_TRANSACTION_URL',
  'DUMP_PATH',
  'MIGRATION_REPORT_PATH'
)

foreach ($name in $requiredVariables) {
  $value = [Environment]::GetEnvironmentVariable($name, 'Process')
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "$name is required"
  }
}

$repositoryRoot = (Resolve-Path '.').Path

foreach ($candidate in @($env:DUMP_PATH, $env:MIGRATION_REPORT_PATH)) {
  $resolved = [System.IO.Path]::GetFullPath($candidate)
  if ($resolved.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Migration artifacts must be outside the repository"
  }
}
```

Resultado esperado: exit code `0`, sin salida.

## 2. Verificar Node y herramientas PostgreSQL

```powershell
node --version
pg_dump --version
psql --version
```

Resultado esperado:

- Node comienza con `v22.`.
- `pg_dump` y `psql` terminan con exit code `0`.
- La versión principal de `pg_dump` es igual o superior a la versión del
  servidor Neon.

## 3. Confirmar identidades sin imprimir URLs

```powershell
psql --dbname="$env:NEON_DIRECT_URL" `
  --no-align `
  --tuples-only `
  --command="SELECT current_database(), current_user, current_setting('server_version');"

psql --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
  --no-align `
  --tuples-only `
  --command="SELECT current_database(), current_user, current_setting('server_version');"
```

Resultado esperado:

- Ambos comandos terminan con exit code `0`.
- Las identidades de origen y Preview son distintas.
- Ninguna salida contiene contraseña ni connection string.

## 4. Confirmar que Preview está vacío

```powershell
$previewTableCount = psql `
  --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
  --no-align `
  --tuples-only `
  --command="SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"

if ($LASTEXITCODE -ne 0) {
  throw "Preview table inventory query failed"
}

if ([int]$previewTableCount -ne 0) {
  throw "Supabase Preview public schema must be empty"
}
```

Resultado esperado: exit code `0`; `$previewTableCount` vale `0`.

Si no está vacío, crear un proyecto Preview nuevo. No limpiar ni reutilizar
Supabase Production.

## 5. Confirmar las 20 migraciones del repositorio

```powershell
$migrationCount = (
  Get-ChildItem prisma/migrations -Directory
).Count

if ($migrationCount -ne 20) {
  throw "Expected 20 repository migrations; found $migrationCount"
}

npx tsx -e 'import { readRepositoryMigrations } from "./scripts/lib/database-migration-verifier"; void readRepositoryMigrations().then((items) => console.log(items.length))'
```

Resultado esperado:

```text
20
```

Una cantidad distinta detiene el ensayo y exige revisar el contrato antes
de continuar.

## 6. Crear el dump de la rama Neon aislada

```powershell
pg_dump `
  --dbname="$env:NEON_DIRECT_URL" `
  --clean `
  --if-exists `
  --schema=public `
  --quote-all-identifiers `
  --no-owner `
  --no-privileges `
  --file="$env:DUMP_PATH"

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

$dump = Get-Item $env:DUMP_PATH
if ($dump.Length -eq 0) {
  throw "pg_dump created an empty file"
}

Get-FileHash -Algorithm SHA256 $env:DUMP_PATH
```

Resultado esperado:

- `pg_dump` termina con exit code `0`.
- El dump tiene tamaño mayor que cero.
- Se registra su SHA-256 en la evidencia operacional.
- El dump permanece bajo `$env:TEMP` y nunca entra al repositorio.

## 7. Restaurar en Supabase Preview

```powershell
psql `
  --dbname="$env:SUPABASE_PREVIEW_SESSION_URL" `
  --set=ON_ERROR_STOP=1 `
  --file="$env:DUMP_PATH"

if ($LASTEXITCODE -ne 0) {
  throw "Preview restore failed with exit code $LASTEXITCODE"
}
```

Resultado esperado: exit code `0`. Avisos de `DROP ... IF EXISTS` son
aceptables; errores SQL no lo son.

## 8. Comprobar Prisma sin reaplicar migraciones

```powershell
$env:DIRECT_URL = $env:SUPABASE_PREVIEW_SESSION_URL

npx prisma migrate status

if ($LASTEXITCODE -ne 0) {
  throw "prisma migrate status failed with exit code $LASTEXITCODE"
}
```

Resultado esperado:

```text
20 migrations found in prisma/migrations
Database schema is up to date!
```

No ejecutar `prisma migrate deploy`, `prisma migrate dev` ni
`prisma db push`: el dump ya preserva schema y `_prisma_migrations`.

## 9. Comparar Neon y Supabase Preview

```powershell
if (Test-Path $env:MIGRATION_REPORT_PATH) {
  Remove-Item -Force $env:MIGRATION_REPORT_PATH
}

npm run db:verify:migration

if ($LASTEXITCODE -ne 0) {
  throw "Database verification failed with exit code $LASTEXITCODE"
}
```

Resultado esperado:

```text
[verify-db] Neon and Supabase Preview snapshots match.
[verify-db] 20 repository migrations verified.
[verify-db] 15 public tables inventoried with 0 FK orphans.
[verify-db] 5 BYTEA columns verified.
[verify-db] Report written outside repository.
```

El reporte externo preserva ambos inventarios completos de tablas con sus
conteos, migraciones, usuarios, agrupaciones, FKs y columnas `BYTEA`. No
contiene URLs.

## 10. Probar Transaction Pooler de Preview

```powershell
$env:DATABASE_URL = $env:SUPABASE_PREVIEW_TRANSACTION_URL

npx tsx -e 'import { db } from "./src/lib/db"; void (async () => { const count = await db.user.count(); console.log("[preview-transaction] User rows:", count); await db.$disconnect() })()'
```

Resultado esperado: exit code `0` y una línea
`[preview-transaction] User rows:` cuyo número coincide con el inventario
de `public.User` del reporte.

## 11. Confirmar que Production sigue limpio

Esta comprobación se realiza visualmente en el dashboard Supabase:

- el proyecto usado por los comandos está marcado como Preview;
- el proyecto Production no tiene conexiones de esta sesión;
- no se restauró el dump en Production;
- no se configuró una aplicación contra Production.

Si alguna condición no se cumple, el ensayo se rechaza.

## 12. Cerrar el ensayo

Conservar el SHA-256 y mover el reporte JSON al almacenamiento operacional
seguro del equipo. Eliminar dump y reporte del equipo local:

```powershell
Remove-Item -Force $env:DUMP_PATH
Remove-Item -Force $env:MIGRATION_REPORT_PATH

if (Test-Path $env:DUMP_PATH) {
  throw "Dump cleanup failed"
}

if (Test-Path $env:MIGRATION_REPORT_PATH) {
  throw "Report cleanup failed"
}
```

Resultado esperado: exit code `0`; ambos archivos dejan de existir.
````

- [ ] **Step 3: Update README requirements and verification command**

In `README.md`, replace the existing Node.js requirement at line 7 with:

```markdown
- Node.js 22.x
```

Append:

````markdown
## Verificación de migración PostgreSQL

El ensayo de fase 2 compara una rama Neon inmóvil con un proyecto Supabase
Preview aislado. Supabase Production se crea recién en la fase de corte.

```powershell
npm run db:verify:migration
```

El comando requiere `NEON_DIRECT_URL`,
`SUPABASE_PREVIEW_SESSION_URL` y `MIGRATION_REPORT_PATH`. El reporte debe
guardarse fuera del repositorio.

El procedimiento completo está en
[`docs/operations/supabase-preview-database-rehearsal.md`](docs/operations/supabase-preview-database-rehearsal.md).
````

- [ ] **Step 4: Update deployment documentation**

In `docs/DEPLOY.md`, replace the paragraph that makes `DIRECT_URL` optional:

```markdown
5. Copia también la connection string **direct** de Neon como `DIRECT_URL`.
   Es obligatoria para migraciones y scripts mutables; nunca se deriva desde
   `DATABASE_URL`.
```

Append:

```markdown
## Ensayo Supabase Preview

La fase 2 usa exclusivamente un proyecto Supabase Preview aislado. El
proyecto Supabase Production no se crea hasta la fase de corte.

Contrato de conexión:

- runtime: `DATABASE_URL` con Supavisor Transaction Mode, puerto 6543,
  `pgbouncer=true` y `connection_limit=1`;
- Prisma CLI: `DIRECT_URL` con Supavisor Session Mode, puerto 5432, o
  conexión PostgreSQL directa;
- ensayo: `NEON_DIRECT_URL` y `SUPABASE_PREVIEW_SESSION_URL`;
- dump y reporte: siempre fuera del repositorio.

Consulta
[`docs/operations/supabase-preview-database-rehearsal.md`](operations/supabase-preview-database-rehearsal.md).
```

- [ ] **Step 5: Check documentation and staged files for secrets**

Run:

```powershell
$trackedSensitiveFiles = git ls-files |
  Select-String -Pattern '\.sql$|verification\.json$'

if ($trackedSensitiveFiles) {
  throw "A dump or verification report is tracked by Git"
}

rg "postgres(?:ql)?://[^[:space:]]+@" docs README.md .env.example
```

Expected:

- No tracked SQL dump or verification report.
- The URL scan only finds the local non-secret development URL and synthetic test documentation; it finds no real Neon or Supabase URL.

- [ ] **Step 6: Commit**

```powershell
git add .env.example README.md docs/DEPLOY.md docs/operations/supabase-preview-database-rehearsal.md
git commit -m "docs: add Supabase Preview rehearsal"
```

## Task 8: Run final phase-2 acceptance

**Files:**
- Verify only; no source modifications expected.

- [ ] **Step 1: Verify Node.js and repository inventory**

Run:

```powershell
node --version

$migrationCount = (
  Get-ChildItem prisma/migrations -Directory
).Count

if ($migrationCount -ne 20) {
  throw "Expected 20 migration directories; found $migrationCount"
}

npx tsx -e 'import { readRepositoryMigrations } from "./scripts/lib/database-migration-verifier"; void readRepositoryMigrations().then((items) => console.log(items.length))'
```

Expected:

- Node output begins with `v22.`.
- The inventory command prints `20`.

- [ ] **Step 2: Verify the five current BYTEA columns from migrations**

Run:

```powershell
$byteaDefinitions = rg "BYTEA" prisma/migrations
$byteaDefinitions

if (($byteaDefinitions | Measure-Object).Count -ne 5) {
  throw "Expected exactly 5 BYTEA migration definitions"
}
```

Expected: exactly five definitions corresponding to:

```text
Team.crestData
Match.sideACrestData
Match.sideBCrestData
FriendlyPlayer.photoData
MatchTeamMvp.photoData
```

- [ ] **Step 3: Run repository acceptance**

Run:

```powershell
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
```

Expected: every command exits `0`; no failed tests, TypeScript diagnostics, ESLint errors or Next.js build errors.

- [ ] **Step 4: Run Preview database acceptance**

With Preview variables loaded and external paths configured:

```powershell
$env:DIRECT_URL = $env:SUPABASE_PREVIEW_SESSION_URL
$env:DATABASE_URL = $env:SUPABASE_PREVIEW_TRANSACTION_URL

npx prisma migrate status

if (Test-Path $env:MIGRATION_REPORT_PATH) {
  Remove-Item -Force $env:MIGRATION_REPORT_PATH
}

npm run db:verify:migration
```

Expected:

```text
20 migrations found in prisma/migrations
Database schema is up to date!
[verify-db] Neon and Supabase Preview snapshots match.
[verify-db] 20 repository migrations verified.
[verify-db] 15 public tables inventoried with 0 FK orphans.
[verify-db] 5 BYTEA columns verified.
[verify-db] Report written outside repository.
```

- [ ] **Step 5: Confirm Production has not been provisioned or touched**

Record these four facts in the external operational evidence:

```text
Supabase Preview received the rehearsal restore: yes
Supabase Production project exists: no
Supabase Production received the rehearsal restore: no
Supabase Production remains reserved for phase 3: yes
```

Expected: all four statements match exactly. Phase 3 creates Production only after the Preview rehearsal is approved.

- [ ] **Step 6: Verify repository cleanliness**

Run:

```powershell
git status --short
git diff --check
git diff -- package-lock.json
```

Expected:

- No `.env`, SQL dump, JSON report or `.next` artifact is staged.
- `git diff --check` exits `0`.
- `package-lock.json` has no diff.

- [ ] **Step 7: Stop before phase 3**

Do not configure Supabase Production, Vercel Production, maintenance mode or final traffic. Hand off the external Preview report and its dump hash for approval of the later cutover plan.

## Spec Clarifications Applied

1. The execution target is Node.js 22.x; no npm or library version is newly assumed or pinned.
2. Phase 2 restores only into Supabase Preview. Supabase Production is not created until the final cutover phase.
3. The approved migration inventory is exactly 20 directories today. The verifier derives directory names and SHA-256 checksums and fails if a future migration changes that count.
4. Snapshot comparison inventories every base table in `public`; it does not depend on a partial hardcoded model list.
5. The verifier dynamically inventories every `BYTEA` column and additionally enforces the approved current count of five.
6. The source is an isolated, non-writing Neon branch so source and restored target represent the same point in time.
7. Dump and report paths are rejected when they resolve inside the repository.
8. `prisma/seed.ts` and `prisma/lib/db-client.ts` are included because they currently bypass the CLI connection contract and would otherwise use Transaction Mode for writes.
9. `package-lock.json` remains unchanged because this phase adds no dependency and makes no dependency-version assumption.
