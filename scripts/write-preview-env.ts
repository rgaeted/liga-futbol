#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

const PREVIEW_REF = 'qfqbwzwcezdbwdrolnjl'
const PASSWORD_FILE = path.join(
  process.env.TEMP ?? '/tmp',
  'liga-futbol-supabase-preview',
  'preview-db-password.txt',
)

interface ApiKeyRow {
  api_key: string
  type: string
  name: string
}

function parseSupabaseKeys(stdout: string): ApiKeyRow[] {
  const start = stdout.indexOf('[')
  const end = stdout.lastIndexOf(']')
  if (start === -1 || end === -1) {
    throw new Error('Could not parse Supabase API keys output')
  }
  return JSON.parse(stdout.slice(start, end + 1)) as ApiKeyRow[]
}

async function main() {
  const dbPassword = (await readFile(PASSWORD_FILE, 'utf8')).trim()
  const encoded = encodeURIComponent(dbPassword)

  const keysStdout = execSync(
    `supabase projects api-keys --project-ref ${PREVIEW_REF} -o json`,
    { encoding: 'utf8' },
  )
  const keys = parseSupabaseKeys(keysStdout)

  const publishable =
    keys.find((key) => key.type === 'publishable')?.api_key ??
    keys.find((key) => key.name === 'anon')?.api_key
  const secret =
    keys.find((key) => key.type === 'secret' && !key.api_key.includes('·'))?.api_key ??
    keys.find((key) => key.name === 'service_role')?.api_key

  if (!publishable || !secret) {
    throw new Error('Missing Supabase publishable or secret API key')
  }

  const authSecret = randomBytes(32).toString('hex')
  const envPath = path.join(process.cwd(), '.env.local')

  const lines = [
    '# Supabase Preview — ensayo local (no commitear)',
    `DATABASE_URL="postgresql://postgres.${PREVIEW_REF}:${encoded}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"`,
    `DIRECT_URL="postgresql://postgres.${PREVIEW_REF}:${encoded}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"`,
    `AUTH_SECRET="${authSecret}"`,
    'NEXTAUTH_URL="http://localhost:3000"',
    '',
    '# Supabase Realtime (Preview)',
    `NEXT_PUBLIC_SUPABASE_URL="https://${PREVIEW_REF}.supabase.co"`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${publishable}"`,
    `SUPABASE_SECRET_KEY="${secret}"`,
    '',
    'MIGRATION_MAINTENANCE_MODE="false"',
    '',
  ]

  await writeFile(envPath, `${lines.join('\n')}\n`, 'utf8')
  console.log(`[preview-env] Wrote ${envPath}`)
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[preview-env] ERROR: ${message}`)
  process.exitCode = 1
})
