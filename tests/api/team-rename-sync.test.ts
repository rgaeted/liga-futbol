import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '@/app/api/teams/[id]/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ organizationId: 'org-1' }),
  assertSameOrganization: vi.fn(),
}))

const teamUpdate = vi.fn()
const seasonTeamUpdateMany = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    team: { findUnique: vi.fn(), update: (...a: unknown[]) => teamUpdate(...a) },
    seasonTeam: { updateMany: (...a: unknown[]) => seasonTeamUpdateMany(...a) },
    friendlyCategory: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'

const params = { params: Promise.resolve({ id: 't1' }) }
const put = (body: unknown) =>
  PUT(new Request('http://test/api/teams/t1', { method: 'PUT', body: JSON.stringify(body) }), params)

describe('PUT /api/teams/[id] (nombre)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.team.findUnique).mockResolvedValue({ organizationId: 'org-1' } as never)
    teamUpdate.mockResolvedValue({ id: 't1', name: 'Amiguitos' })
    vi.mocked(db.$transaction).mockImplementation(async (ops) => Promise.all(ops as Promise<unknown>[]) as never)
  })

  it('al cambiar el nombre, el nombre del equipo en las temporadas queda igual', async () => {
    const res = await put({ name: 'Amiguitos' })
    expect(res.status).toBe(200)
    expect(seasonTeamUpdateMany).toHaveBeenCalledWith({
      where: { teamId: 't1' },
      data: { displayName: 'Amiguitos' },
    })
  })

  it('si no se cambia el nombre, no toca las temporadas', async () => {
    await put({ color: '#112233' })
    expect(seasonTeamUpdateMany).not.toHaveBeenCalled()
  })
})
