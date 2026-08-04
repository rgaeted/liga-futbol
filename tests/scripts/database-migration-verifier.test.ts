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
