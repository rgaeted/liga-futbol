import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHomeQuery } from '../../src/api/queries'
import { mobileApiClient } from '../../src/api/client'
import { mobileQueryKeys } from '../../src/api/query-keys'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('home updates after matches are deleted', () => {
  it('replaces cached matches with the empty server response while home stays open', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const emptyHome = {
      league: {}, featuredLiveMatch: null, upcomingMatches: [], recentResults: [],
      recentArticles: [], sponsors: [],
    }
    const get = vi.spyOn(mobileApiClient, 'get').mockResolvedValue(emptyHome)
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    client.setQueryData(mobileQueryKeys().home, {
      ...emptyHome, upcomingMatches: [{ id: 'deleted-match' }],
    })
    const { result, unmount } = renderHook(() => useHomeQuery(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    expect(result.current.data?.upcomingMatches).toHaveLength(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001) })
    expect(get).toHaveBeenCalledOnce()
    await waitFor(() => expect(result.current.data?.upcomingMatches).toEqual([]))
    unmount()
    client.clear()
  })
})
