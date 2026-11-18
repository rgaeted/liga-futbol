import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/matches/[id]/jerseys/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  db: {
    player: { findUnique: vi.fn() },
    friendlyMatchPlayer: { findUnique: vi.fn() },
    matchPlayerJersey: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({ requireMatchOrgRole: vi.fn() }))

import { db } from '@/lib/db'
import { requireMatchOrgRole } from '@/lib/auth'

const leagueMatch = {
  id: 'm1',
  matchType: 'LEAGUE',
  status: 'SCHEDULED',
  refereeId: 'ref-1',
  homeTeamId: 'home',
  awayTeamId: 'away',
}

function asReferee(match: Record<string, unknown> = leagueMatch, userId = 'ref-1') {
  vi.mocked(requireMatchOrgRole).mockResolvedValue({
    role: 'REFEREE',
    session: { user: { id: userId } },
    match,
  } as never)
}

function call(body: unknown) {
  return PUT(
    new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'm1' }) },
  )
}

describe('PUT /api/matches/[id]/jerseys', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(db.player.findUnique).mockResolvedValue({ id: 'p1', teamId: 'home' } as never)
    vi.mocked(db.matchPlayerJersey.findFirst).mockResolvedValue(null)
  })

  it('asigna el dorsal usando el equipo como teamKey', async () => {
    asReferee()
    const res = await call({ playerId: 'p1', number: 7 })
    expect(res.status).toBe(200)
    expect(db.matchPlayerJersey.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId_playerId: { matchId: 'm1', playerId: 'p1' } },
        create: expect.objectContaining({ teamKey: 'home', number: 7 }),
      }),
    )
  })

  it('number null borra el dorsal', async () => {
    asReferee()
    const res = await call({ playerId: 'p1', number: null })
    expect(res.status).toBe(200)
    expect(db.matchPlayerJersey.deleteMany).toHaveBeenCalledWith({
      where: { matchId: 'm1', playerId: 'p1' },
    })
  })

  it('rechaza con 400 si el partido ya inició', async () => {
    asReferee({ ...leagueMatch, status: 'LIVE' })
    const res = await call({ playerId: 'p1', number: 7 })
    expect(res.status).toBe(400)
    expect(db.matchPlayerJersey.upsert).not.toHaveBeenCalled()
  })

  it('rechaza con 400 si el jugador no es de ningún equipo del partido', async () => {
    asReferee()
    vi.mocked(db.player.findUnique).mockResolvedValue({ id: 'p1', teamId: 'otro' } as never)
    const res = await call({ playerId: 'p1', number: 7 })
    expect(res.status).toBe(400)
  })

  it('rechaza con 403 si no es el árbitro asignado', async () => {
    asReferee(leagueMatch, 'otro-arbitro')
    const res = await call({ playerId: 'p1', number: 7 })
    expect(res.status).toBe(403)
  })

  it('rechaza con 409 si el número ya lo usa otro jugador del equipo', async () => {
    asReferee()
    vi.mocked(db.matchPlayerJersey.findFirst).mockResolvedValue({ id: 'x' } as never)
    const res = await call({ playerId: 'p1', number: 7 })
    expect(res.status).toBe(409)
    expect(db.matchPlayerJersey.upsert).not.toHaveBeenCalled()
  })

  it('rechaza con 400 un número fuera de rango', async () => {
    asReferee()
    const res = await call({ playerId: 'p1', number: 100 })
    expect(res.status).toBe(400)
  })

  it('en amistoso toma teamKey del lado del jugador', async () => {
    asReferee({ ...leagueMatch, matchType: 'FRIENDLY', homeTeamId: null, awayTeamId: null })
    vi.mocked(db.friendlyMatchPlayer.findUnique).mockResolvedValue({ side: 'B' } as never)
    const res = await call({ playerId: 'p1', number: 3 })
    expect(res.status).toBe(200)
    expect(db.matchPlayerJersey.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ teamKey: 'B', number: 3 }) }),
    )
  })
})
