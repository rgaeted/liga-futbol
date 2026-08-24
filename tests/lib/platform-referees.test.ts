import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'
import { revokeRefereeMembership } from '@/lib/platform-referees'

vi.mock('@/lib/db', () => ({
  db: {
    organizationMembership: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
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

  it('deletes referee membership when no active assignments and only REFEREE role', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.REFEREE],
    } as never)
    vi.mocked(db.match.findFirst).mockResolvedValue(null)

    await revokeRefereeMembership('user-1', 'org-1')

    expect(db.organizationMembership.delete).toHaveBeenCalledWith({ where: { id: 'mem-1' } })
  })

  it('removes REFEREE role when membership has other roles', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.COACH, MembershipRole.REFEREE],
    } as never)
    vi.mocked(db.match.findFirst).mockResolvedValue(null)

    await revokeRefereeMembership('user-1', 'org-1')

    expect(db.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
      data: { roles: [MembershipRole.COACH] },
    })
    expect(db.organizationMembership.delete).not.toHaveBeenCalled()
  })

  it('blocks revoke when referee has upcoming matches', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.REFEREE],
    } as never)
    vi.mocked(db.match.findFirst).mockResolvedValue({ id: 'match-1' } as never)

    await expect(revokeRefereeMembership('user-1', 'org-1')).rejects.toMatchObject({
      code: 'has_assigned_matches',
    })
  })
})
