import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'

const { mergeMembershipRole } = vi.hoisted(() => ({
  mergeMembershipRole: vi.fn(),
}))

vi.mock('@/lib/membership-roles', () => ({
  mergeMembershipRole,
}))

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findMany: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { syncPlayerDerivedMemberships } from '@/lib/player-memberships'

describe('syncPlayerDerivedMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates PLAYER and FRIENDLY_COACH memberships for each derived org', async () => {
    vi.mocked(db.player.findMany)
      .mockResolvedValueOnce([
        { organizationId: 'org-loslunes' },
        { organizationId: 'org-kelme' },
      ] as never)
      .mockResolvedValueOnce([{ organizationId: 'org-loslunes' }] as never)

    await syncPlayerDerivedMemberships('user-1')

    expect(mergeMembershipRole).toHaveBeenCalledWith(
      'user-1',
      'org-loslunes',
      MembershipRole.PLAYER,
    )
    expect(mergeMembershipRole).toHaveBeenCalledWith('user-1', 'org-kelme', MembershipRole.PLAYER)
    expect(mergeMembershipRole).toHaveBeenCalledWith(
      'user-1',
      'org-loslunes',
      MembershipRole.FRIENDLY_COACH,
    )
    expect(mergeMembershipRole).not.toHaveBeenCalledWith(
      'user-1',
      'org-kelme',
      MembershipRole.FRIENDLY_COACH,
    )
  })
})
