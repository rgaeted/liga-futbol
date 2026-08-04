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
import { validateVerificationEnvironment } from '../../scripts/verify-database-migration'

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
