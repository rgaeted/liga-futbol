import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    player: { findUnique: vi.fn() },
    organizationMembership: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requirePlayerPhotoMutation } from '@/lib/player-photo-access'

const playerRow = {
  id: 'player-1',
  organizationId: 'org-1',
  personId: 'person-1',
  person: { userId: 'user-owner' },
}

describe('requirePlayerPhotoMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without session', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const result = await requirePlayerPhotoMutation('player-1')
    expect(result.error?.status).toBe(401)
  })

  it('allows the linked player user', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-owner' } } as never)
    vi.mocked(db.player.findUnique).mockResolvedValue(playerRow as never)

    const result = await requirePlayerPhotoMutation('player-1')
    expect(result).toEqual({ player: playerRow })
  })

  it('allows org admin of the player organization', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-user' } } as never)
    vi.mocked(db.player.findUnique).mockResolvedValue({
      ...playerRow,
      person: { userId: 'other-user' },
    } as never)
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      roles: ['ORG_ADMIN'],
    } as never)

    const result = await requirePlayerPhotoMutation('player-1')
    expect(result).toEqual({
      player: {
        ...playerRow,
        person: { userId: 'other-user' },
      },
    })
  })

  it('returns 403 for unrelated users', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'stranger' } } as never)
    vi.mocked(db.player.findUnique).mockResolvedValue({
      ...playerRow,
      person: { userId: 'other-user' },
    } as never)
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue(null)

    const result = await requirePlayerPhotoMutation('player-1')
    expect(result.error?.status).toBe(403)
  })
})
