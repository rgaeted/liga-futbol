import { afterEach, describe, expect, it, vi } from 'vitest'
import { publishMatchInvalidation } from '@/lib/supabase-realtime-server'

describe('publishMatchInvalidation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('publishes only the normalized matchId with a five-second timeout', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co/')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    const signal = new AbortController().signal
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(publishMatchInvalidation(' match-1 ')).resolves.toBeUndefined()

    expect(timeout).toHaveBeenCalledWith(5_000)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/realtime/v1/api/broadcast',
      {
        method: 'POST',
        headers: {
          apikey: 'server-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              topic: 'match:match-1',
              event: 'invalidate',
              payload: { matchId: 'match-1' },
            },
          ],
        }),
        signal,
      }
    )
  })

  it('degrades safely without configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(publishMatchInvalidation('match-1')).resolves.toBeUndefined()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('supabase_realtime_publish_failed', {
      matchId: 'match-1',
      reason: 'missing_configuration',
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('server-secret')
  })

  it('degrades safely for an empty match ID', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(publishMatchInvalidation('   ')).resolves.toBeUndefined()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('supabase_realtime_publish_failed', {
      matchId: null,
      reason: 'empty_match_id',
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('server-secret')
  })

  it('does not reject after an HTTP failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(publishMatchInvalidation('match-1')).resolves.toBeUndefined()

    expect(log).toHaveBeenCalledWith('supabase_realtime_publish_failed', {
      matchId: 'match-1',
      reason: 'http_error',
      status: 503,
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('server-secret')
  })

  it('does not reject or expose the secret after a network failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('request failed with server-secret'))
    )
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(publishMatchInvalidation('match-1')).resolves.toBeUndefined()

    expect(log).toHaveBeenCalledWith('supabase_realtime_publish_failed', {
      matchId: 'match-1',
      reason: 'Error',
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('server-secret')
  })

  it('does not reject or expose the secret after a timeout', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'server-secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('server-secret timed out', 'TimeoutError'))
    )
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(publishMatchInvalidation('match-1')).resolves.toBeUndefined()

    expect(log).toHaveBeenCalledWith('supabase_realtime_publish_failed', {
      matchId: 'match-1',
      reason: 'TimeoutError',
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('server-secret')
  })
})
