import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipRole } from '@/lib/membership-role'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed') },
}))

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import {
  PlatformOrgAdminError,
  grantOrgAdminAccess,
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
        role: MembershipRole.ORG_ADMIN,
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
        role: MembershipRole.ORG_ADMIN,
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
            role: MembershipRole.PLAYER,
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
      data: { role: MembershipRole.ORG_ADMIN },
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
            role: MembershipRole.ORG_ADMIN,
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
