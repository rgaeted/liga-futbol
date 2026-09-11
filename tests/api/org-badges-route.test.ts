import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ organizationId: 'org1' }),
  assertSameOrganization: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {
    orgBadge: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      findUniqueOrThrow: vi.fn(),
    },
  },
}))
vi.mock('@/lib/badges/persist', () => ({
  setOrgBadgesEnabled: vi.fn(),
}))

import { GET, POST } from '@/app/api/org-badges/route'
import { PATCH as PATCH_BADGE, DELETE } from '@/app/api/org-badges/[id]/route'
import { PATCH as PATCH_SETTINGS } from '@/app/api/org-badges/settings/route'
import { setOrgBadgesEnabled } from '@/lib/badges/persist'
import { db } from '@/lib/db'

describe('GET /api/org-badges', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns badges with evaluable from registry', async () => {
    vi.mocked(db.orgBadge.findMany).mockResolvedValue([
      {
        id: 'b1',
        organizationId: 'org1',
        predicateId: 'hat_trick',
        name: 'Hat-trick',
        description: 'Tres goles',
        family: 'goleador',
        rarity: 'epico',
        iconKey: 'hat_trick',
        thresholds: { goles: 3 },
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { playerBadges: 2 },
      },
    ] as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].evaluable).toBe(true)
    expect(data[0]._count.playerBadges).toBe(2)
  })
})

describe('POST /api/org-badges', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for unknown predicateId', async () => {
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predicateId: 'no_existe' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('creates a badge from registry defaults', async () => {
    vi.mocked(db.orgBadge.create).mockResolvedValue({
      id: 'b1',
      organizationId: 'org1',
      predicateId: 'hat_trick',
      name: 'Hat-trick',
      description: 'Tres goles en un partido.',
      family: 'goleador',
      rarity: 'epico',
      iconKey: 'hat_trick',
      thresholds: { goles: 3 },
      isActive: true,
      sortOrder: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { playerBadges: 0 },
    } as never)

    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predicateId: 'hat_trick' }),
      }),
    )
    expect(res.status).toBe(201)
    expect(db.orgBadge.create).toHaveBeenCalled()
    const data = await res.json()
    expect(data.predicateId).toBe('hat_trick')
    expect(data.evaluable).toBe(true)
  })
})

describe('PATCH /api/org-badges/settings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls setOrgBadgesEnabled when enabling', async () => {
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({
      badgesEnabled: true,
    } as never)

    const res = await PATCH_SETTINGS(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgesEnabled: true }),
      }),
    )

    expect(res.status).toBe(200)
    expect(setOrgBadgesEnabled).toHaveBeenCalledWith('org1', true)
    await expect(res.json()).resolves.toEqual({ badgesEnabled: true })
  })
})

describe('PATCH /api/org-badges/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates badge fields', async () => {
    vi.mocked(db.orgBadge.findUnique).mockResolvedValue({
      id: 'b1',
      organizationId: 'org1',
      predicateId: 'hat_trick',
    } as never)
    vi.mocked(db.orgBadge.update).mockResolvedValue({
      id: 'b1',
      organizationId: 'org1',
      predicateId: 'hat_trick',
      name: 'Hat-trick editado',
      description: 'Tres goles',
      family: 'goleador',
      rarity: 'epico',
      iconKey: 'hat_trick',
      thresholds: { goles: 3 },
      isActive: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { playerBadges: 0 },
    } as never)

    const res = await PATCH_BADGE(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      }),
      { params: Promise.resolve({ id: 'b1' }) },
    )

    expect(res.status).toBe(200)
    expect(db.orgBadge.update).toHaveBeenCalled()
  })
})

describe('DELETE /api/org-badges/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 409 when badge has grants', async () => {
    vi.mocked(db.orgBadge.findUnique).mockResolvedValue({
      id: 'b1',
      organizationId: 'org1',
      _count: { playerBadges: 3 },
    } as never)

    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'b1' }),
    })

    expect(res.status).toBe(409)
    expect(db.orgBadge.delete).not.toHaveBeenCalled()
  })

  it('deletes badge without grants', async () => {
    vi.mocked(db.orgBadge.findUnique).mockResolvedValue({
      id: 'b1',
      organizationId: 'org1',
      _count: { playerBadges: 0 },
    } as never)

    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'b1' }),
    })

    expect(res.status).toBe(200)
    expect(db.orgBadge.delete).toHaveBeenCalledWith({ where: { id: 'b1' } })
  })
})
