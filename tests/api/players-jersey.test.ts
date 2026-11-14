import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/players/[id]/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ organizationId: 'org-1' }),
  assertSameOrganization: vi.fn(),
}))
vi.mock('@/lib/revalidate-org-admin-pages', () => ({ revalidateOrgAdminRosterPages: vi.fn() }))
vi.mock('@/lib/player-categories', () => ({ setPlayerCategories: vi.fn() }))

const playerFindFirst = vi.fn()
const playerUpdate = vi.fn()
const rosterUpdateMany = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    player: { findUnique: vi.fn(), findFirst: (...args: unknown[]) => playerFindFirst(...args) },
    team: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'

function request(body: unknown) {
  return new Request('http://test/api/players/p1', { method: 'PUT', body: JSON.stringify(body) })
}
const params = { params: Promise.resolve({ id: 'p1' }) }

describe('PUT /api/players/[id] (dorsal)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.player.findUnique).mockResolvedValue({
      id: 'p1',
      organizationId: 'org-1',
      personId: 'pe1',
      teamId: 't1',
      team: { organizationId: 'org-1' },
      person: {},
    } as never)
    playerUpdate.mockResolvedValue({ id: 'p1', jerseyNumber: 7, person: { user: null } })
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => unknown)({
        person: { update: vi.fn() },
        player: { update: playerUpdate },
        seasonRosterEntry: { updateMany: rosterUpdateMany },
      }),
    )
  })

  it('rechaza un dorsal que ya usa otro jugador del mismo equipo', async () => {
    playerFindFirst.mockResolvedValue({ id: 'p2' })
    const res = await PUT(request({ jerseyNumber: 7 }), params)
    expect(res.status).toBe(409)
    expect(playerUpdate).not.toHaveBeenCalled()
  })

  it('guarda el dorsal y lo copia a la plantilla activa', async () => {
    playerFindFirst.mockResolvedValue(null)
    const res = await PUT(request({ jerseyNumber: 7 }), params)
    expect(res.status).toBe(200)
    expect(playerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: 't1', jerseyNumber: 7, id: { not: 'p1' } }),
      }),
    )
    expect(rosterUpdateMany).toHaveBeenCalledWith({
      where: { playerId: 'p1', status: 'ACTIVE' },
      data: { jerseyNumber: 7 },
    })
  })

  it('quitar el dorsal (null) no consulta duplicados y limpia la plantilla', async () => {
    const res = await PUT(request({ jerseyNumber: null }), params)
    expect(res.status).toBe(200)
    expect(playerFindFirst).not.toHaveBeenCalled()
    expect(rosterUpdateMany).toHaveBeenCalledWith({
      where: { playerId: 'p1', status: 'ACTIVE' },
      data: { jerseyNumber: null },
    })
  })
})
