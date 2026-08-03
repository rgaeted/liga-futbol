// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseRealtimeClient } from '@/lib/supabase-realtime-client'
import { useMatchRealtime, type MatchRealtimeStatus } from '@/hooks/useMatchRealtime'

vi.mock('@/lib/supabase-realtime-client', () => ({
  getSupabaseRealtimeClient: vi.fn(),
}))

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function Probe({
  onInvalidate,
  onStatus,
}: {
  onInvalidate: () => void
  onStatus: (status: MatchRealtimeStatus) => void
}) {
  const status = useMatchRealtime({
    matchId: 'match-1',
    enabled: true,
    onInvalidate,
  })
  useEffect(() => onStatus(status), [onStatus, status])
  return null
}

describe('useMatchRealtime', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('subscribes, invalidates, and removes its channel', async () => {
    let broadcast: ((message: { payload: { matchId: string } }) => void) | undefined
    let subscribe: ((status: string) => void) | undefined
    const channel = {
      on: vi.fn((_type, _filter, callback) => {
        broadcast = callback
        return channel
      }),
      subscribe: vi.fn((callback) => {
        subscribe = callback
        return channel
      }),
    }
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    }
    vi.mocked(getSupabaseRealtimeClient).mockReturnValue(client as never)
    const onInvalidate = vi.fn()
    const onStatus = vi.fn()
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onInvalidate={onInvalidate} onStatus={onStatus} />)
    })
    await act(async () => subscribe?.('SUBSCRIBED'))
    await act(async () => broadcast?.({ payload: { matchId: 'match-2' } }))
    expect(onInvalidate).not.toHaveBeenCalled()
    await act(async () => broadcast?.({ payload: { matchId: 'match-1' } }))

    expect(client.channel).toHaveBeenCalledWith('match:match-1', {
      config: { broadcast: { self: false } },
    })
    expect(onStatus).toHaveBeenLastCalledWith('connected')
    expect(onInvalidate).toHaveBeenCalledOnce()

    await act(async () => root.unmount())
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
  })

  it('degrades when public Supabase configuration is missing', async () => {
    vi.mocked(getSupabaseRealtimeClient).mockReturnValue(null)
    const onStatus = vi.fn()
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onInvalidate={vi.fn()} onStatus={onStatus} />)
    })

    expect(onStatus).toHaveBeenLastCalledWith('degraded')
    await act(async () => root.unmount())
  })

  it('degrades when the subscription times out', async () => {
    vi.useFakeTimers()
    const channel = {
      on: vi.fn(() => channel),
      subscribe: vi.fn(() => channel),
    }
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    }
    vi.mocked(getSupabaseRealtimeClient).mockReturnValue(client as never)
    const onStatus = vi.fn()
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onInvalidate={vi.fn()} onStatus={onStatus} />)
    })
    expect(onStatus).toHaveBeenLastCalledWith('connecting')

    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })

    expect(onStatus).toHaveBeenLastCalledWith('degraded')
    await act(async () => root.unmount())
  })
})
