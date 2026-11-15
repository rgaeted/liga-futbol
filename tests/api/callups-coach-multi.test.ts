import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/callups/route'
import { coachTeamIdsInMatch } from '@/lib/coach-teams'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({
    organizationId: 'org-1',
    role: 'COACH',
    session: { user: { id: 'coach-1' } },
  }),
  assertSameOrganization: vi.fn(),
}))

const callUpCreate = vi.fn()
const callUpDeleteMany = vi.fn()
const playerFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    match: { findUnique: vi.fn() },
    team: { findMany: vi.fn() },
    player: { findMany: (...a: unknown[]) => playerFindMany(...a) },
    callUp: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'

const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
const post = () =>
  POST(
    new Request('http://test/api/callups', {
      method: 'POST',
      body: JSON.stringify({ matchId: 'm1', playerIds, starters: [] }),
    }),
  )

describe('coachTeamIdsInMatch', () => {
  it('devuelve solo los equipos del DT que juegan el partido', () => {
    expect(coachTeamIdsInMatch(['a', 'b', 'c'], { homeTeamId: 'x', awayTeamId: 'b' })).toEqual(['b'])
    expect(coachTeamIdsInMatch(['a'], { homeTeamId: 'x', awayTeamId: null })).toEqual([])
  })
})

describe('POST /api/callups con un DT de varios equipos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: 'm1',
      organizationId: 'org-1',
      footballFormat: 'FUTBOL_7',
      homeTeamId: 'other',
      awayTeamId: 'team-2',
    } as never)
    vi.mocked(db.team.findMany).mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }] as never)
    playerFindMany.mockResolvedValue(playerIds.map((id) => ({ id })))
    vi.mocked(db.$transaction).mockImplementation(async (cb) =>
      (cb as (tx: unknown) => unknown)({
        callUp: { deleteMany: callUpDeleteMany, create: callUpCreate },
      }),
    )
  })

  it('deja citar jugadores del segundo equipo del DT si ese equipo juega el partido', async () => {
    const res = await post()
    expect(res.status).toBe(201)
    expect(playerFindMany).toHaveBeenCalledWith({
      where: { teamId: { in: ['team-2'] }, id: { in: playerIds } },
    })
    expect(callUpCreate).toHaveBeenCalledTimes(7)
  })

  it('rechaza si ninguno de los equipos del DT juega el partido', async () => {
    vi.mocked(db.match.findUnique).mockResolvedValue({
      id: 'm1',
      organizationId: 'org-1',
      footballFormat: 'FUTBOL_7',
      homeTeamId: 'x',
      awayTeamId: 'y',
    } as never)
    const res = await post()
    expect(res.status).toBe(403)
    expect(callUpCreate).not.toHaveBeenCalled()
  })

  it('rechaza si el DT no tiene ningún equipo', async () => {
    vi.mocked(db.team.findMany).mockResolvedValue([])
    const res = await post()
    expect(res.status).toBe(403)
  })
})
