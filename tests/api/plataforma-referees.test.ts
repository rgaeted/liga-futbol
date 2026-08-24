import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/plataforma/referees/route'
import { POST as grantPost } from '@/app/api/plataforma/referees/[userId]/access/route'
import { DELETE as revokeDelete } from '@/app/api/plataforma/referees/[userId]/memberships/[organizationId]/route'
import { MembershipRole } from '@/lib/membership-role'

vi.mock('@/lib/auth', () => ({
  requirePlatformAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    organizationMembership: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    refereeProfile: { upsert: vi.fn() },
    match: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { requirePlatformAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

describe('GET /api/plataforma/referees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  it('lists referees with org slugs', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'ref-1',
        name: 'Juan Árbitro',
        email: 'juan@liga.com',
        refereeProfile: { phone: '56912345678', whatsapp: null, photoStoragePath: null },
        memberships: [
          { organization: { id: 'org-1', slug: 'kelme', name: 'Kelme' } },
        ],
      },
    ] as never)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body[0].organizations[0].slug).toBe('kelme')
  })
})

describe('POST /api/plataforma/referees/[userId]/access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
    vi.mocked(db.organization.findUnique).mockResolvedValue({ id: 'org-1' } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'ref-1' } as never)
  })

  it('grants REFEREE membership without invite', async () => {
    const membershipCreate = vi.fn()
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue(null)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        organizationMembership: { create: membershipCreate },
        refereeProfile: { upsert: vi.fn() },
      } as never),
    )

    const response = await grantPost(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: 'org-1' }),
      }),
      { params: Promise.resolve({ userId: 'ref-1' }) },
    )

    expect(response.status).toBe(201)
    expect(membershipCreate).toHaveBeenCalledWith({
      data: { organizationId: 'org-1', userId: 'ref-1', roles: [MembershipRole.REFEREE] },
    })
  })

  it('adds REFEREE to existing COACH membership', async () => {
    const membershipUpdate = vi.fn()
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.COACH],
    } as never)
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        organizationMembership: { create: vi.fn(), update: membershipUpdate },
        refereeProfile: { upsert: vi.fn() },
      } as never),
    )

    const response = await grantPost(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: 'org-1' }),
      }),
      { params: Promise.resolve({ userId: 'ref-1' }) },
    )

    expect(response.status).toBe(201)
    expect(membershipUpdate).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
      data: { roles: [MembershipRole.COACH, MembershipRole.REFEREE] },
    })
  })
})

describe('DELETE /api/plataforma/referees/[userId]/memberships/[organizationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  it('revokes referee membership', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.REFEREE],
    } as never)
    vi.mocked(db.match.findFirst).mockResolvedValue(null)

    const response = await revokeDelete(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'ref-1', organizationId: 'org-1' }),
    })

    expect(response.status).toBe(204)
    expect(db.organizationMembership.delete).toHaveBeenCalledWith({ where: { id: 'mem-1' } })
  })

  it('returns 409 when referee has assigned matches', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.REFEREE],
    } as never)
    vi.mocked(db.match.findFirst).mockResolvedValue({ id: 'match-1' } as never)

    const response = await revokeDelete(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'ref-1', organizationId: 'org-1' }),
    })

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toContain('partidos')
  })
})
