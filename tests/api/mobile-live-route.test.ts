import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/mobile/v1/leagues/[slug]/matches/[matchId]/live/route'

vi.mock('@/lib/mobile/league-context', () => ({
  resolvePublishedLeagueBySlug: vi.fn(),
}))

vi.mock('@/lib/mobile/live', () => ({
  getMobileLiveSnapshot: vi.fn(),
}))

import { resolvePublishedLeagueBySlug } from '@/lib/mobile/league-context'
import { getMobileLiveSnapshot } from '@/lib/mobile/live'

const league = {
  config: { slug: 'demo' },
  season: { id: 'season-1' },
  seasonTeamByTeamId: new Map(),
}

describe('GET /api/mobile/v1/leagues/[slug]/matches/[matchId]/live', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns live snapshot only for scoped league matches', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    vi.mocked(getMobileLiveSnapshot).mockResolvedValue({ id: 'match-1', status: 'LIVE' } as never)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'demo', matchId: 'match-1' }),
    })

    expect(response.status).toBe(200)
    expect(getMobileLiveSnapshot).toHaveBeenCalledWith(league, 'match-1')
  })

  it('returns 404 when snapshot is unavailable', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    vi.mocked(getMobileLiveSnapshot).mockResolvedValue(null)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'demo', matchId: 'missing' }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Partido no encontrado' })
  })
})
