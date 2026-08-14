import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { getLiveMatchSnapshot } from '@/lib/live-match-snapshot'
import { GET } from '@/app/api/matches/[id]/live/route'

vi.mock('@/lib/db', () => ({
  db: { match: { findUnique: vi.fn() } },
}))

vi.mock('@/lib/live-match-snapshot', () => ({
  getLiveMatchSnapshot: vi.fn(),
}))

describe('GET /api/matches/[id]/live', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with the snapshot', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue({
      organization: { status: 'ACTIVE' },
    } as never)
    vi.mocked(getLiveMatchSnapshot).mockResolvedValue({
      id: 'match-1',
      status: 'LIVE',
    } as never)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'match-1' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: 'match-1', status: 'LIVE' })
  })

  it('returns 404 for a missing match', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue(null)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Partido no encontrado' })
  })

  it('returns a generic 500 response without logging error details', async () => {
    const secret = 'postgresql://db-user:secret-password@db.internal/app'
    vi.mocked(db.match.findUnique).mockResolvedValue({
      organization: { status: 'ACTIVE' },
    } as never)
    vi.mocked(getLiveMatchSnapshot).mockRejectedValue(new Error(secret))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'match-1' }),
    })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'No se pudo cargar el partido en vivo',
    })
    expect(errorSpy).toHaveBeenCalledWith('live_match_snapshot_failed', {
      matchId: 'match-1',
      reason: 'Error',
    })
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(secret)
  })
})
