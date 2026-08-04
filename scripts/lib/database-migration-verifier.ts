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
