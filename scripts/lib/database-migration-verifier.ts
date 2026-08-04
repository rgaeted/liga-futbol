import { createHash } from 'node:crypto'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  Pool,
  PoolClient,
  QueryResultRow,
} from 'pg'

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

    const sql = await readFile(sqlPath, 'utf8')
    const normalized = sql.replace(/\r\n/g, '\n')
    migrations.push({
      name,
      checksum: createHash('sha256').update(normalized).digest('hex'),
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
  childColumns: string[] | string
  parentColumns: string[] | string
}

function parsePostgresTextArray(value: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value
  }

  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1)
    return inner === '' ? [] : inner.split(',')
  }

  return [value]
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

  return result.rows.map((row) => ({
    ...row,
    childColumns: parsePostgresTextArray(row.childColumns),
    parentColumns: parsePostgresTextArray(row.parentColumns),
  }))
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
