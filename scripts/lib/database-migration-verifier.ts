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
