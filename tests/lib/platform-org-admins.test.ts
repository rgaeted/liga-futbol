import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed') },
}))

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    organizationMembership: { findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import {
  PlatformOrgAdminError,
  grantOrgAdminAccess,
  listOrgAdmins,
  revokeOrgAdminMembership,
  searchPlatformUsers,
} from '@/lib/platform-org-admins'

const kelme = {
  id: 'org-kelme',
  slug: 'kelme',
  name: 'Torneos Kelme',
  status: 'ACTIVE' as const,
}

const demo = {
  id: 'org-demo',
  slug: 'liga-demo',
  name: 'Liga Demo',
  status: 'ACTIVE' as const,
}

function adminUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'ana@liga.com',
    name: 'Ana Pérez',
    memberships: [{ organization: kelme }],
    ...overrides,
  }
}

describe('grantOrgAdminAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a user and N ORG_ADMIN memberships', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme, demo] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        adminUserRow({
          memberships: [{ organization: kelme }, { organization: demo }],
        }) as never,
      )

    const membershipCreate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: {
          create: vi.fn().mockResolvedValue({ id: 'user-1' }),
        },
        organizationMembership: { create: membershipCreate, findUnique: vi.fn(), update: vi.fn() },
      } as never),
    )

    const result = await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme', 'org-demo'],
    })

    expect(result.created).toBe(true)
    expect(result.user.email).toBe('ana@liga.com')
    expect(result.user.organizations.map((o) => o.slug)).toEqual(['kelme', 'liga-demo'])
    expect(membershipCreate).toHaveBeenCalledTimes(2)
    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-kelme',
        userId: 'user-1',
        roles: [MembershipRole.ORG_ADMIN],
      },
    })
  })

  it('reuses an existing email without changing name or password', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([demo] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1', email: 'ana@liga.com', name: 'Ana Pérez' } as never)
      .mockResolvedValueOnce(
        adminUserRow({
          memberships: [{ organization: kelme }, { organization: demo }],
        }) as never,
      )

    const userCreate = vi.fn()
    const userUpdate = vi.fn()
    const membershipCreate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: { create: userCreate, update: userUpdate },
        organizationMembership: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: membershipCreate,
          update: vi.fn(),
        },
      } as never),
    )

    const result = await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Otro Nombre',
      password: 'nuevaclave',
      organizationIds: ['org-demo'],
    })

    expect(result.created).toBe(false)
    expect(userCreate).not.toHaveBeenCalled()
    expect(userUpdate).not.toHaveBeenCalled()
    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-demo',
        userId: 'user-1',
        roles: [MembershipRole.ORG_ADMIN],
      },
    })
  })

  it('promotes PLAYER to ORG_ADMIN in that org', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1', email: 'ana@liga.com', name: 'Ana Pérez' } as never)
      .mockResolvedValueOnce(adminUserRow() as never)

    const membershipUpdate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: { create: vi.fn(), update: vi.fn() },
        organizationMembership: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mem-1',
            roles: [MembershipRole.PLAYER],
          }),
          create: vi.fn(),
          update: membershipUpdate,
        },
      } as never),
    )

    await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      organizationIds: ['org-kelme'],
    })

    expect(membershipUpdate).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
      data: { roles: [MembershipRole.PLAYER, MembershipRole.ORG_ADMIN] },
    })
  })

  it('is a no-op when already ORG_ADMIN', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme] as never)
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1', email: 'ana@liga.com', name: 'Ana Pérez' } as never)
      .mockResolvedValueOnce(adminUserRow() as never)

    const membershipCreate = vi.fn()
    const membershipUpdate = vi.fn()
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        user: { create: vi.fn(), update: vi.fn() },
        organizationMembership: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mem-1',
            roles: [MembershipRole.ORG_ADMIN],
          }),
          create: membershipCreate,
          update: membershipUpdate,
        },
      } as never),
    )

    const result = await grantOrgAdminAccess({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      organizationIds: ['org-kelme'],
    })

    expect(result.created).toBe(false)
    expect(membershipCreate).not.toHaveBeenCalled()
    expect(membershipUpdate).not.toHaveBeenCalled()
  })

  it('rejects paused or unknown orgs without starting a transaction', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([
      { ...kelme, status: 'PAUSED' },
    ] as never)

    await expect(
      grantOrgAdminAccess({
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        password: 'secret1',
        organizationIds: ['org-kelme'],
      }),
    ).rejects.toMatchObject({ code: 'invalid_orgs' })

    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('requires password when creating a new user', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([kelme] as never)
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    await expect(
      grantOrgAdminAccess({
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        organizationIds: ['org-kelme'],
      }),
    ).rejects.toBeInstanceOf(PlatformOrgAdminError)

    await expect(
      grantOrgAdminAccess({
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        organizationIds: ['org-kelme'],
      }),
    ).rejects.toMatchObject({ code: 'password_required' })

    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe('listOrgAdmins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only users with at least one ORG_ADMIN membership', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      adminUserRow({
        memberships: [{ organization: kelme }, { organization: demo }],
      }),
    ] as never)

    const users = await listOrgAdmins()
    expect(users).toHaveLength(1)
    expect(users[0].organizations).toHaveLength(2)
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberships: { some: { roles: { has: MembershipRole.ORG_ADMIN } } } },
        orderBy: { name: 'asc' },
      }),
    )
  })
})

describe('revokeOrgAdminMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes an ORG_ADMIN membership', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.ORG_ADMIN],
    } as never)
    vi.mocked(db.organizationMembership.delete).mockResolvedValue({} as never)

    await revokeOrgAdminMembership('user-1', 'org-kelme')

    expect(db.organizationMembership.delete).toHaveBeenCalledWith({
      where: { id: 'mem-1' },
    })
  })

  it('returns not_found when membership is missing', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue(null)

    await expect(revokeOrgAdminMembership('user-1', 'org-kelme')).rejects.toMatchObject({
      code: 'not_found',
    })
    expect(db.organizationMembership.delete).not.toHaveBeenCalled()
  })

  it('returns not_org_admin when the role is not ORG_ADMIN', async () => {
    vi.mocked(db.organizationMembership.findUnique).mockResolvedValue({
      id: 'mem-1',
      roles: [MembershipRole.PLAYER],
    } as never)

    await expect(revokeOrgAdminMembership('user-1', 'org-kelme')).rejects.toMatchObject({
      code: 'not_org_admin',
    })
    expect(db.organizationMembership.delete).not.toHaveBeenCalled()
  })
})

describe('searchPlatformUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty for short queries', async () => {
    expect(await searchPlatformUsers('a')).toEqual([])
    expect(db.user.findMany).not.toHaveBeenCalled()
  })

  it('searches by name or email', async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'user-1',
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        memberships: [
          {
            roles: [MembershipRole.PLAYER],
            organization: { id: 'org-kelme', slug: 'kelme', name: 'Torneos Kelme' },
          },
        ],
      },
    ] as never)

    const results = await searchPlatformUsers('ana')

    expect(results).toHaveLength(1)
    expect(results[0].email).toBe('ana@liga.com')
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'ana', mode: 'insensitive' } },
            { email: { contains: 'ana', mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),
    )
  })
})
