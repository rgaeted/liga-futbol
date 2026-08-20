import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/players/claim/route'

const personFindUniqueOrThrow = vi.fn()
const personUpdate = vi.fn()
const userCreate = vi.fn()
const membershipCreate = vi.fn()

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

vi.mock('@/lib/db', () => ({
  db: {
    player: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'

describe('POST /api/players/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.player.findUnique).mockResolvedValue({
      id: 'p-1',
      organizationId: 'org-1',
      personId: 'person-1',
      person: { id: 'person-1', userId: null, firstName: 'Juan', lastName: 'Pérez' },
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    personFindUniqueOrThrow.mockResolvedValue({ id: 'person-1', userId: null })
    userCreate.mockResolvedValue({ id: 'user-1' })
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        person: {
          findUniqueOrThrow: personFindUniqueOrThrow,
          update: personUpdate,
        },
        user: { create: userCreate },
        organizationMembership: { create: membershipCreate },
      } as never),
    )
  })

  it('links person to new user', async () => {
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'juan@liga.com',
          password: 'password123',
          playerId: 'p-1',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(personUpdate).toHaveBeenCalledWith({
      where: { id: 'person-1' },
      data: { userId: 'user-1' },
    })
  })
})
