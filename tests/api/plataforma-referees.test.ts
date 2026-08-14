import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/plataforma/referees/route'
import { POST as grantPost } from '@/app/api/plataforma/referees/[userId]/access/route'
import { MembershipRole } from '@/lib/membership-role'

vi.mock('@/lib/auth', () => ({
  requirePlatformAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    organizationMembership: { findUnique: vi.fn(), create: vi.fn() },
    refereeProfile: { upsert: vi.fn() },
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
      data: { organizationId: 'org-1', userId: 'ref-1', role: MembershipRole.REFEREE },
    })
  })

  it('returns 409 when user has COACH role in org', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      role: MembershipRole.COACH,
    } as never)

    const response = await grantPost(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: 'org-1' }),
      }),
      { params: Promise.resolve({ userId: 'ref-1' }) },
    )

    expect(response.status).toBe(409)
  })
})
