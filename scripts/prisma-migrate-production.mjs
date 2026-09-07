#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const PROJECT_REF = 'tiedlbfnjiudxmktmvti'
const POOLER_HOST = 'aws-0-sa-east-1.pooler.supabase.com'
const PASSWORD_FILE = path.join(
  process.env.TEMP ?? '/tmp',
  'liga-futbol-supabase-production',
  'production-db-password.txt',
)

const password = readFileSync(PASSWORD_FILE, 'utf8').trim()
const encoded = encodeURIComponent(password)
const DIRECT_URL = `postgresql://postgres.${PROJECT_REF}:${encoded}@${POOLER_HOST}:5432/postgres`
const DATABASE_URL = `postgresql://postgres.${PROJECT_REF}:${encoded}@${POOLER_HOST}:6543/postgres?pgbouncer=true&connection_limit=1`

const env = { ...process.env, DIRECT_URL, DATABASE_URL }
const cmd = process.argv[2] ?? 'status'

execSync(`npx prisma migrate ${cmd}`, { stdio: 'inherit', env })
