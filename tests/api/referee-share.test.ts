import { RefereeShareInviteStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as sharePost } from '@/app/api/admin/referees/[userId]/share/route'
import { POST as acceptPost } from '@/app/api/admin/referee-invites/[id]/accept/route'
import { POST as declinePost } from '@/app/api/admin/referee-invites/[id]/decline/route'
import { MembershipRole } from '@/lib/membership-role'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findUnique: vi.fn() },
    organizationMembership: { findUnique: vi.fn(), create: vi.fn() },
    refereeShareInvite: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    refereeProfile: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'

const fromOrgId = 'org-kelme'
const toOrgId = 'org-guest'
const refereeUserId = 'ref-1'
const inviteId = 'invite-1'

describe('POST /api/admin/referees/[userId]/share', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: fromOrgId,
      role: MembershipRole.ORG_ADMIN,
      session: { user: { id: 'admin-1' } } as never,
    })
  })

  it('returns 400 when destination org is paused', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: toOrgId,
      status: 'PAUSED',
    } as never)

    const response = await sharePost(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toOrganizationSlug: 'guest' }),
      }),
      { params: Promise.resolve({ userId: refereeUserId }) },
    )

    expect(response.status).toBe(400)
  })

  it('creates a pending invite for active destination org', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: toOrgId,
      status: 'ACTIVE',
    } as never)
    vi.mocked(db.organizationMembership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.REFEREE } as never)
      .mockResolvedValueOnce(null)
    vi.mocked(db.refereeShareInvite.create).mockResolvedValue({ id: inviteId } as never)

    const response = await sharePost(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toOrganizationSlug: 'guest' }),
      }),
      { params: Promise.resolve({ userId: refereeUserId }) },
    )

    expect(response.status).toBe(201)
    expect(db.refereeShareInvite.create).toHaveBeenCalled()
  })
})

describe('POST /api/admin/referee-invites/[id]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: toOrgId,
      role: MembershipRole.ORG_ADMIN,
      session: {} as never,
    })
  })

  it('creates REFEREE membership on accept', async () => {
    const membershipCreate = vi.fn()
    vi.mocked(db.refereeShareInvite.findUnique).mockResolvedValue({
      id: inviteId,
      refereeUserId,
      toOrganizationId: toOrgId,
      status: RefereeShareInviteStatus.PENDING,
      refereeUser: { memberships: [] },
    } as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        organizationMembership: { create: membershipCreate },
        refereeShareInvite: { update: vi.fn() },
        refereeProfile: { upsert: vi.fn() },
      } as never),
    )

    const response = await acceptPost(
      new Request('http://localhost', { method: 'POST' }),
      { params: Promise.resolve({ id: inviteId }) },
    )

    expect(response.status).toBe(200)
    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: toOrgId,
        userId: refereeUserId,
        role: MembershipRole.REFEREE,
      },
    })
  })
})

describe('POST /api/admin/referee-invites/[id]/decline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: toOrgId,
      role: MembershipRole.ORG_ADMIN,
      session: {} as never,
    })
  })

  it('does not create membership on decline', async () => {
    vi.mocked(db.refereeShareInvite.findUnique).mockResolvedValue({
      id: inviteId,
      toOrganizationId: toOrgId,
      status: RefereeShareInviteStatus.PENDING,
    } as never)
    vi.mocked(db.refereeShareInvite.update).mockResolvedValue({} as never)

    const response = await declinePost(
      new Request('http://localhost', { method: 'POST' }),
      { params: Promise.resolve({ id: inviteId }) },
    )

    expect(response.status).toBe(200)
    expect(db.organizationMembership.create).not.toHaveBeenCalled()
  })
})
