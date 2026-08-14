import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/friendly-players/claim/route'

const personFindUniqueOrThrow = vi.fn()
const personUpdate = vi.fn()
const userCreate = vi.fn()
const membershipCreate = vi.fn()
const playerFindMany = vi.fn()
const friendlyPlayerFindMany = vi.fn()
const playerCreate = vi.fn()

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

vi.mock('@/lib/db', () => ({
  db: {
    friendlyPlayer: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'

describe('POST /api/friendly-players/claim (person model)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.friendlyPlayer.findUnique).mockResolvedValue({
      id: 'fp-1',
      organizationId: 'org-1',
      personId: 'person-1',
      firstName: 'Juan',
      lastName: 'Pérez',
      person: { id: 'person-1', userId: null },
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    personFindUniqueOrThrow.mockResolvedValue({ id: 'person-1', userId: null })
    userCreate.mockResolvedValue({ id: 'user-1' })
    playerFindMany.mockResolvedValue([{ organizationId: 'org-1' }])
    friendlyPlayerFindMany.mockResolvedValue([{ organizationId: 'org-1' }])
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        person: {
          findUniqueOrThrow: personFindUniqueOrThrow,
          update: personUpdate,
        },
        user: { create: userCreate },
        organizationMembership: { create: membershipCreate },
        player: {
          findMany: playerFindMany,
          create: playerCreate,
        },
        friendlyPlayer: { findMany: friendlyPlayerFindMany },
      } as never),
    )
  })

  it('links person to new user and skips duplicate league player', async () => {
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'juan@liga.com',
          password: 'password123',
          friendlyPlayerId: 'fp-1',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(personUpdate).toHaveBeenCalledWith({
      where: { id: 'person-1' },
      data: { userId: 'user-1' },
    })
    expect(playerCreate).not.toHaveBeenCalled()
  })

  it('creates league player when person has no ficha in org', async () => {
    friendlyPlayerFindMany.mockResolvedValue([])
    playerFindMany.mockResolvedValue([])

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'juan@liga.com',
          password: 'password123',
          friendlyPlayerId: 'fp-1',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(playerCreate).toHaveBeenCalledWith({
      data: {
        personId: 'person-1',
        organizationId: 'org-1',
      },
    })
  })
})
