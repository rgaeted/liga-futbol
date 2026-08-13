import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMatchRealtime } from '../../src/hooks/useMatchRealtime'
import { useMobileLiveSnapshot } from '../../src/hooks/useMobileLiveSnapshot'
import type { MobileLiveSnapshot } from '@liga/mobile-contracts'

vi.mock('../../src/hooks/useMatchRealtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useMatchRealtime')>()
  return { ...actual, useMatchRealtime: vi.fn() }
})

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const initial = {
  id: 'match-1',
  status: 'LIVE',
  home: {
    seasonTeamId: 'st-1',
    teamId: 't-1',
    name: 'Rojo',
    color: '#CD212A',
    crestUrl: null,
    initials: 'RO',
  },
  away: {
    seasonTeamId: 'st-2',
    teamId: 't-2',
    name: 'Negro',
    color: '#111111',
    crestUrl: null,
    initials: 'NE',
  },
  homeScore: 0,
  awayScore: 0,
  clock: {
    status: 'LIVE',
    clockStartedAt: '2026-08-20T23:00:00.000Z',
    secondHalfStartedAt: null,
    halftimeAt: null,
  },
  events: [],
  venue: null,
  locationLabel: null,
  weather: null,
} satisfies MobileLiveSnapshot

function Probe({
  initialSnapshot = initial,
  onSnapshot,
}: {
  initialSnapshot?: MobileLiveSnapshot
  onSnapshot: (value: MobileLiveSnapshot) => void
}) {
  const { snapshot } = useMobileLiveSnapshot({ initialSnapshot })
  useEffect(() => {
    onSnapshot(snapshot)
  }, [onSnapshot, snapshot])
  return null
}

describe('useMobileLiveSnapshot', () => {
  afterEach(() => {
    vi.useRealTimers()
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

    const values: MobileLiveSnapshot[] = []
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
})
