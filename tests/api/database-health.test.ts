import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: mocks.queryRaw,
  },
}))

import {
  hasValidCronAuthorization,
  isDatabaseHealthRequest,
} from '@/lib/database-health'
import { GET } from '@/app/api/health/database/route'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  mocks.queryRaw.mockReset()
})

describe('database health request', () => {
  it('recognizes only the exact GET health path', () => {
    expect(isDatabaseHealthRequest('GET', '/api/health/database')).toBe(true)
    expect(isDatabaseHealthRequest('POST', '/api/health/database')).toBe(false)
    expect(isDatabaseHealthRequest('GET', '/api/health/database/extra')).toBe(
      false,
    )
  })

  it('accepts only the exact bearer secret', () => {
    expect(
      hasValidCronAuthorization('Bearer daily-secret', 'daily-secret'),
    ).toBe(true)
    expect(
      hasValidCronAuthorization('Bearer wrong-secret', 'daily-secret'),
    ).toBe(false)
    expect(hasValidCronAuthorization(null, 'daily-secret')).toBe(false)
    expect(hasValidCronAuthorization('Bearer daily-secret', undefined)).toBe(
      false,
    )
  })
})

describe('GET /api/health/database', () => {
  it('returns 401 without querying for an invalid secret', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')

    const response = await GET(
      new Request('https://torneos-kelme.vercel.app/api/health/database'),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'No autorizado',
    })
    expect(mocks.queryRaw).not.toHaveBeenCalled()
  })

  it('returns 200 after the database responds', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')
    mocks.queryRaw.mockResolvedValue([{ ok: 1 }])

    const response = await GET(
      new Request('https://torneos-kelme.vercel.app/api/health/database', {
        headers: {
          authorization: 'Bearer daily-secret',
        },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      database: 'reachable',
    })
    expect(mocks.queryRaw).toHaveBeenCalledOnce()
  })

  it('returns a generic 503 when PostgreSQL is unavailable', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')
    mocks.queryRaw.mockRejectedValue(
      new Error('postgresql://secret-host/internal'),
    )
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(
      new Request('https://torneos-kelme.vercel.app/api/health/database', {
        headers: {
          authorization: 'Bearer daily-secret',
        },
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      status: 'error',
      database: 'unreachable',
    })
  })
})
