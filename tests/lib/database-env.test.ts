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
