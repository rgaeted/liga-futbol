import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as getLeague } from '@/app/api/mobile/v1/leagues/[slug]/route'
import { GET as getMatches } from '@/app/api/mobile/v1/leagues/[slug]/matches/route'

vi.mock('@/lib/mobile/league-context', () => ({
  resolvePublishedLeagueBySlug: vi.fn(),
}))

vi.mock('@/lib/mobile/serializers', () => ({
  serializeMobileLeagueConfig: vi.fn().mockReturnValue({ slug: 'demo', displayName: 'Demo' }),
}))

vi.mock('@/lib/mobile/matches', () => ({
  listMobileMatches: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
}))

import { resolvePublishedLeagueBySlug } from '@/lib/mobile/league-context'

const league = {
  config: { slug: 'demo' },
  season: { id: 'season-1', footballFormat: 'FUTBOL_11', startDate: new Date(), endDate: new Date() },
  seasonTeamByTeamId: new Map(),
}

describe('mobile sports routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for unpublished slugs', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(null)
    const response = await getLeague(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'borrador' }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Edición no encontrada' })
  })

  it('returns 200 for a published league config', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    const response = await getLeague(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'demo' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ slug: 'demo' })
  })

  it('returns 400 for malformed match query params', async () => {
    vi.mocked(resolvePublishedLeagueBySlug).mockResolvedValue(league as never)
    const response = await getMatches(
      new Request('http://localhost/api/mobile/v1/leagues/demo/matches?limit=abc'),
      { params: Promise.resolve({ slug: 'demo' }) },
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Parámetros de consulta inválidos' })
  })

  it('returns a generic 500 without leaking secrets', async () => {
    const secret = 'postgresql://db-user:secret-password@db.internal/app'
    vi.mocked(resolvePublishedLeagueBySlug).mockRejectedValue(new Error(secret))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await getLeague(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'demo' }),
    })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'No se pudo completar la solicitud' })
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(secret)
  })
})
