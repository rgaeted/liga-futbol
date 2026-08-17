import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'
import { revokeRefereeMembership } from '@/lib/platform-referees'

vi.mock('@/lib/db', () => ({
  db: {
    organizationMembership: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    match: {
      findFirst: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

describe('revokeRefereeMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes referee membership when no active assignments', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      role: MembershipRole.REFEREE,
    } as never)
    vi.mocked(db.match.findFirst).mockResolvedValue(null)

    await revokeRefereeMembership('user-1', 'org-1')

    expect(db.organizationMembership.delete).toHaveBeenCalledWith({ where: { id: 'mem-1' } })
  })

  it('blocks revoke when referee has upcoming matches', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      role: MembershipRole.REFEREE,
    } as never)
    vi.mocked(db.match.findFirst).mockResolvedValue({ id: 'match-1' } as never)

    await expect(revokeRefereeMembership('user-1', 'org-1')).rejects.toMatchObject({
      code: 'has_assigned_matches',
    })
  })
})
