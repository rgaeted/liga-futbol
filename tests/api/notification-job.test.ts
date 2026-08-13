import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runNotificationProcessing: vi.fn(),
}))

vi.mock('@/lib/mobile/notifications/trigger-process', () => ({
  runNotificationProcessing: mocks.runNotificationProcessing,
}))

import { GET } from '@/app/api/jobs/notifications/process/route'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  mocks.runNotificationProcessing.mockReset()
})

describe('GET /api/jobs/notifications/process', () => {
  it('returns 401 without querying when authorization is invalid', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')

    const response = await GET(
      new Request('https://torneos-kelme.vercel.app/api/jobs/notifications/process'),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado' })
    expect(mocks.runNotificationProcessing).not.toHaveBeenCalled()
  })

  it('returns 200 after processing pending notifications', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')
    mocks.runNotificationProcessing.mockResolvedValue({ processed: 2 })

    const response = await GET(
      new Request('https://torneos-kelme.vercel.app/api/jobs/notifications/process', {
        headers: { authorization: 'Bearer daily-secret' },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      processed: 2,
    })
    expect(mocks.runNotificationProcessing).toHaveBeenCalledOnce()
  })

  it('returns a generic 503 when processing fails', async () => {
    vi.stubEnv('CRON_SECRET', 'daily-secret')
    mocks.runNotificationProcessing.mockRejectedValue(new Error('processor failed'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(
      new Request('https://torneos-kelme.vercel.app/api/jobs/notifications/process', {
        headers: { authorization: 'Bearer daily-secret' },
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ status: 'error' })
  })
})
