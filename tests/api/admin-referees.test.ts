import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '@/app/api/admin/referees/route'
import { MembershipRole } from '@/lib/membership-role'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

vi.mock('@/lib/db', () => ({
  db: {
    organizationMembership: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    refereeProfile: { upsert: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'

const orgId = 'org-kelme'

describe('GET /api/admin/referees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: orgId,
      role: MembershipRole.ORG_ADMIN,
      session: {} as never,
    })
  })

  it('does not return a referee whose membership is in another org', async () => {
    vi.mocked(db.organizationMembership.findMany).mockResolvedValue([
      {
        user: {
          id: 'ref-1',
          name: 'Juan Árbitro',
          email: 'juan@liga.com',
          refereeProfile: { phone: '56912345678', whatsapp: null, notes: null, photoStoragePath: null },
          refereeMatches: [],
        },
      },
    ] as never)

    const response = await GET()
    expect(response.status).toBe(200)
    expect(db.organizationMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: orgId, roles: { has: MembershipRole.REFEREE } },
      }),
    )
    const body = await response.json()
    expect(body).toHaveLength(1)
    expect(body[0].userId).toBe('ref-1')
  })
})

describe('POST /api/admin/referees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: orgId,
      role: MembershipRole.ORG_ADMIN,
      session: {} as never,
    })
  })

  it('adds REFEREE to existing COACH membership', async () => {
    const membershipUpdate = vi.fn()
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      memberships: [{ id: 'mem-1', roles: [MembershipRole.COACH] }],
    } as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        organizationMembership: { create: vi.fn(), update: membershipUpdate },
        refereeProfile: { upsert: vi.fn() },
      } as never),
    )

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Juan',
          email: 'juan@liga.com',
          phone: '+56 9 1234 5678',
        }),
      }),
    )

    expect(response.status).toBe(201)
    expect(membershipUpdate).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
      data: { roles: [MembershipRole.COACH, MembershipRole.REFEREE] },
    })
  })

  it('creates membership and profile for existing user without membership', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      memberships: [],
    } as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        organizationMembership: { create: vi.fn() },
        refereeProfile: { upsert: vi.fn() },
      } as never),
    )

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Juan',
          email: 'juan@liga.com',
          phone: '+56 9 1234 5678',
        }),
      }),
    )

    expect(response.status).toBe(201)
  })
})
