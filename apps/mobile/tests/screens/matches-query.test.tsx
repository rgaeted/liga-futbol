import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMatchesQuery } from '../../src/api/queries'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('matches list response', () => {
  it('accepts match summaries without detail-only weather and format fields', async () => {
    const team = {
      seasonTeamId: 'st-1', teamId: 't-1', name: 'Colo Colo',
      color: '#FFFFFF', crestUrl: null, initials: 'CC',
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      items: [{
        id: 'match-1', scheduledAt: '2026-09-05T14:00:00.000Z',
        status: 'SCHEDULED', statusLabel: 'Programado', home: team, away: team,
        homeScore: 0, awayScore: 0, venue: null, locationLabel: null,
      }], nextCursor: null,
    }), { status: 200 })))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useMatchesQuery('upcoming'), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items[0]?.id).toBe('match-1')
    client.clear()
  })
})
