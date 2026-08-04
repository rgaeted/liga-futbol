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
