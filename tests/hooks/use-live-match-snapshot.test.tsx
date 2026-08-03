// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMatchRealtime } from '@/hooks/useMatchRealtime'
import { useLiveMatchSnapshot } from '@/hooks/useLiveMatchSnapshot'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'

vi.mock('@/hooks/useMatchRealtime', () => ({ useMatchRealtime: vi.fn() }))

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const initial = {
  id: 'match-1',
  status: 'LIVE',
  homeScore: 0,
  awayScore: 0,
} as LiveMatchSnapshot

type SnapshotHookResult = ReturnType<typeof useLiveMatchSnapshot>

function Probe({
  initialSnapshot = initial,
  onResult,
  onSnapshot,
}: {
  initialSnapshot?: LiveMatchSnapshot
  onResult?: (value: SnapshotHookResult) => void
  onSnapshot: (value: LiveMatchSnapshot) => void
  revision?: number
}) {
  const result = useLiveMatchSnapshot({ initialSnapshot })
  const { snapshot } = result
  useEffect(() => {
    onResult?.(result)
  }, [onResult, result])
  useEffect(() => {
    onSnapshot(snapshot)
  }, [onSnapshot, snapshot])
  return null
}

describe('useLiveMatchSnapshot', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('debounces invalidations and preserves the last valid snapshot', async () => {
    vi.useFakeTimers()
    let invalidate: (() => void) | undefined
    vi.mocked(useMatchRealtime).mockImplementation((options) => {
      invalidate = options.onInvalidate
      return 'connected'
    })
    const fresh = { ...initial, homeScore: 1 }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fresh), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const values: LiveMatchSnapshot[] = []
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onSnapshot={(value) => values.push(value)} />)
      await Promise.resolve()
    })
    expect(values.at(-1)?.homeScore).toBe(1)

    await act(async () => {
      invalidate?.()
      invalidate?.()
      invalidate?.()
      vi.advanceTimersByTime(250)
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(values.at(-1)?.homeScore).toBe(1)
    await act(async () => root.unmount())
  })

  it('resyncs once whenever realtime reconnects without changing the invalidation callback', async () => {
    let status: ReturnType<typeof useMatchRealtime> = 'degraded'
    const invalidations: Array<() => void> = []
    vi.mocked(useMatchRealtime).mockImplementation((options) => {
      invalidations.push(options.onInvalidate)
      return status
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(initial), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const onSnapshot = vi.fn()
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe revision={0} onSnapshot={onSnapshot} />)
    })
    expect(fetchMock).not.toHaveBeenCalled()

    status = 'connected'
    await act(async () => {
      root.render(<Probe revision={1} onSnapshot={onSnapshot} />)
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      root.render(<Probe revision={2} onSnapshot={onSnapshot} />)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    status = 'degraded'
    await act(async () => {
      root.render(<Probe revision={3} onSnapshot={onSnapshot} />)
    })
    status = 'connected'
    await act(async () => {
      root.render(<Probe revision={4} onSnapshot={onSnapshot} />)
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(new Set(invalidations).size).toBe(1)
    await act(async () => root.unmount())
  })

  it('adopts a later canonical initial snapshot for the same match', async () => {
    const invalidations: Array<() => void> = []
    vi.mocked(useMatchRealtime).mockImplementation((options) => {
      invalidations.push(options.onInvalidate)
      return 'degraded'
    })
    const values: LiveMatchSnapshot[] = []
    const onSnapshot = (value: LiveMatchSnapshot) => {
      values.push(value)
    }
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe initialSnapshot={initial} onSnapshot={onSnapshot} />)
    })
    const finished = { ...initial, status: 'FINISHED', homeScore: 3 }
    await act(async () => {
      root.render(<Probe initialSnapshot={finished} onSnapshot={onSnapshot} />)
    })

    const latestSnapshot = values.at(-1)
    const invalidationCallbackCount = new Set(invalidations).size
    await act(async () => root.unmount())
    expect(latestSnapshot).toBe(finished)
    expect(invalidationCallbackCount).toBe(1)
  })

  it('discards pending work when switching to a different match', async () => {
    vi.useFakeTimers()
    let invalidate: (() => void) | undefined
    vi.mocked(useMatchRealtime).mockImplementation((options) => {
      invalidate = options.onInvalidate
      return 'degraded'
    })
    let resolveOldRequest: ((response: Response) => void) | undefined
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveOldRequest = resolve
          })
      )
      .mockResolvedValue(
        new Response(JSON.stringify({ ...initial, homeScore: 9 }), { status: 200 })
      )
    vi.stubGlobal('fetch', fetchMock)
    const values: LiveMatchSnapshot[] = []
    let result: SnapshotHookResult | undefined
    const onResult = (value: SnapshotHookResult) => {
      result = value
    }
    const onSnapshot = (value: LiveMatchSnapshot) => {
      values.push(value)
    }
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(
        <Probe
          initialSnapshot={initial}
          onResult={onResult}
          onSnapshot={onSnapshot}
        />
      )
    })
    let oldRequest: Promise<void> | undefined
    await act(async () => {
      oldRequest = result?.resync()
      invalidate?.()
    })
    const oldSignal = fetchMock.mock.calls[0]?.[1].signal
    const nextMatch = {
      ...initial,
      id: 'match-2',
      status: 'FINISHED',
      homeScore: 4,
    }

    await act(async () => {
      root.render(
        <Probe
          initialSnapshot={nextMatch}
          onResult={onResult}
          onSnapshot={onSnapshot}
        />
      )
    })
    const snapshotAfterSwitch = values.at(-1)
    const oldRequestWasAborted = oldSignal?.aborted

    await act(async () => {
      vi.advanceTimersByTime(250)
      await Promise.resolve()
    })
    const fetchCountAfterDebounce = fetchMock.mock.calls.length

    await act(async () => {
      resolveOldRequest?.(
        new Response(JSON.stringify({ ...initial, homeScore: 7 }), { status: 200 })
      )
      await oldRequest
    })
    const finalSnapshot = values.at(-1)
    await act(async () => root.unmount())
    expect(snapshotAfterSwitch).toBe(nextMatch)
    expect(oldRequestWasAborted).toBe(true)
    expect(fetchCountAfterDebounce).toBe(1)
    expect(finalSnapshot).toBe(nextMatch)
  })

  it.each([
    [
      'invalid JSON',
      () => Promise.resolve(new Response('{', { status: 200 })),
    ],
    [
      'a mismatched match id',
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ ...initial, id: 'match-2', homeScore: 9 }), {
            status: 200,
          })
        ),
    ],
    ['a network failure', () => Promise.reject(new TypeError('network failure'))],
  ])('preserves the last valid snapshot after %s', async (_label, failedFetch) => {
    vi.useFakeTimers()
    let invalidate: (() => void) | undefined
    vi.mocked(useMatchRealtime).mockImplementation((options) => {
      invalidate = options.onInvalidate
      return 'connected'
    })
    const fresh = { ...initial, homeScore: 2 }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fresh), { status: 200 }))
      .mockImplementationOnce(failedFetch)
    vi.stubGlobal('fetch', fetchMock)
    const values: LiveMatchSnapshot[] = []
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(
        <Probe
          onSnapshot={(value) => {
            values.push(value)
          }}
        />
      )
      await Promise.resolve()
    })
    await act(async () => {
      invalidate?.()
      vi.advanceTimersByTime(250)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(values.at(-1)?.homeScore).toBe(2)
    await act(async () => root.unmount())
  })

  it('prevents an older request from replacing a newer snapshot', async () => {
    vi.mocked(useMatchRealtime).mockReturnValue('degraded')
    let resolveOlder: ((response: Response) => void) | undefined
    let resolveNewer: ((response: Response) => void) | undefined
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveOlder = resolve
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveNewer = resolve
          })
      )
    vi.stubGlobal('fetch', fetchMock)
    const values: LiveMatchSnapshot[] = []
    let result: SnapshotHookResult | undefined
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(
        <Probe
          onResult={(value) => {
            result = value
          }}
          onSnapshot={(value) => {
            values.push(value)
          }}
        />
      )
    })
    let olderRequest: Promise<void> | undefined
    let newerRequest: Promise<void> | undefined
    await act(async () => {
      olderRequest = result?.resync()
      newerRequest = result?.resync()
    })
    await act(async () => {
      resolveNewer?.(
        new Response(JSON.stringify({ ...initial, homeScore: 2 }), { status: 200 })
      )
      await newerRequest
    })
    await act(async () => {
      resolveOlder?.(
        new Response(JSON.stringify({ ...initial, homeScore: 1 }), { status: 200 })
      )
      await olderRequest
    })

    expect(values.at(-1)?.homeScore).toBe(2)
    await act(async () => root.unmount())
  })

  it('polls live matches every 15 seconds only while visible and resyncs on visibility recovery', async () => {
    vi.useFakeTimers()
    let visibility: DocumentVisibilityState = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
    vi.mocked(useMatchRealtime).mockReturnValue('degraded')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(initial), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onSnapshot={vi.fn()} />)
    })
    await act(async () => {
      vi.advanceTimersByTime(14_999)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    visibility = 'hidden'
    await act(async () => {
      vi.advanceTimersByTime(15_000)
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    visibility = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await act(async () => root.unmount())
  })

  it('polls at halftime but not after the match is finished', async () => {
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    vi.mocked(useMatchRealtime).mockReturnValue('degraded')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(initial), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const onSnapshot = vi.fn()
    const finishedRoot = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      finishedRoot.render(
        <Probe
          initialSnapshot={{ ...initial, status: 'FINISHED' }}
          onSnapshot={onSnapshot}
        />
      )
    })
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => finishedRoot.unmount())

    const halftimeRoot = createRoot(document.body.appendChild(document.createElement('div')))
    await act(async () => {
      halftimeRoot.render(
        <Probe
          initialSnapshot={{ ...initial, status: 'HALFTIME' }}
          onSnapshot={onSnapshot}
        />
      )
    })
    await act(async () => {
      vi.advanceTimersByTime(15_000)
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    await act(async () => halftimeRoot.unmount())
  })

  it('clears pending work and aborts the active request on unmount', async () => {
    vi.useFakeTimers()
    let invalidate: (() => void) | undefined
    vi.mocked(useMatchRealtime).mockImplementation((options) => {
      invalidate = options.onInvalidate
      return 'connected'
    })
    const fetchMock = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => {
      root.render(<Probe onSnapshot={vi.fn()} />)
    })
    const signal = fetchMock.mock.calls[0]?.[1].signal
    await act(async () => {
      invalidate?.()
      root.unmount()
      await Promise.resolve()
    })

    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => {
      vi.advanceTimersByTime(15_000)
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
