import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/players/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ organizationId: 'org-1' }),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

const personCreate = vi.fn()
const playerCreate = vi.fn()
const userCreate = vi.fn()
const membershipCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    team: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'

describe('POST /api/players (person model)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.team.findUnique).mockResolvedValue(null)
    userCreate.mockResolvedValue({ id: 'user-1' })
    personCreate.mockResolvedValue({ id: 'person-1' })
    playerCreate.mockResolvedValue({
      id: 'player-1',
      person: { user: { name: 'Juan Pérez', email: 'juan@liga.com' } },
    })
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: { create: userCreate },
        organizationMembership: { create: membershipCreate },
        person: { create: personCreate },
        player: { create: playerCreate },
      } as never),
    )
  })

  it('creates person then player with personId and organizationId', async () => {
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'juan@liga.com',
          name: 'Juan Pérez',
          password: 'password123',
          jerseyNumber: 10,
          position: 'Delantero',
        }),
      }),
    )

    expect(response.status).toBe(201)
    expect(requireOrgRole).toHaveBeenCalled()
    expect(personCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        firstName: 'Juan',
        lastName: 'Pérez',
      },
    })
    expect(playerCreate).toHaveBeenCalledWith({
      data: {
        personId: 'person-1',
        organizationId: 'org-1',
        teamId: undefined,
        jerseyNumber: 10,
        position: 'Delantero',
      },
      include: expect.any(Object),
    })
  })
})
