import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlatformOrgAdminError } from '@/lib/platform-org-admins'

vi.mock('@/lib/auth', () => ({
  requirePlatformAdmin: vi.fn(),
}))

vi.mock('@/lib/platform-org-admins', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/platform-org-admins')>()
  return {
    ...actual,
    grantOrgAdminAccess: vi.fn(),
    listOrgAdmins: vi.fn(),
    revokeOrgAdminMembership: vi.fn(),
  }
})

import { requirePlatformAdmin } from '@/lib/auth'
import {
  grantOrgAdminAccess,
  listOrgAdmins,
  revokeOrgAdminMembership,
} from '@/lib/platform-org-admins'
import { GET, POST } from '@/app/api/plataforma/users/route'
import { DELETE } from '@/app/api/plataforma/users/[userId]/memberships/[organizationId]/route'

const ana = {
  id: 'user-1',
  email: 'ana@liga.com',
  name: 'Ana Pérez',
  organizations: [
    { id: 'org-kelme', slug: 'kelme', name: 'Torneos Kelme', status: 'ACTIVE' },
  ],
}

describe('GET /api/plataforma/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  it('lists org admins', async () => {
    vi.mocked(listOrgAdmins).mockResolvedValue([ana])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([ana])
  })

  it('returns 401 without platform admin', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('Unauthorized'))
    const response = await GET()
    expect(response.status).toBe(401)
  })
})

describe('POST /api/plataforma/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  function post(body: unknown) {
    return POST(
      new Request('http://localhost/api/plataforma/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }

  it('returns 201 when a user is created', async () => {
    vi.mocked(grantOrgAdminAccess).mockResolvedValue({ created: true, user: ana })
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(ana)
  })

  it('returns 200 when an existing user is granted access', async () => {
    vi.mocked(grantOrgAdminAccess).mockResolvedValue({ created: false, user: ana })
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(200)
  })

  it('returns 400 for invalid body', async () => {
    const response = await post({ email: 'nope', name: 'A', organizationIds: [] })
    expect(response.status).toBe(400)
    expect(grantOrgAdminAccess).not.toHaveBeenCalled()
  })

  it('returns 400 when orgs are paused', async () => {
    vi.mocked(grantOrgAdminAccess).mockRejectedValue(new PlatformOrgAdminError('invalid_orgs'))
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(400)
  })

  it('returns 401 without platform admin', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('Unauthorized'))
    const response = await post({
      email: 'ana@liga.com',
      name: 'Ana Pérez',
      password: 'secret1',
      organizationIds: ['org-kelme'],
    })
    expect(response.status).toBe(401)
  })
})

describe('DELETE /api/plataforma/users/:userId/memberships/:organizationId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  function del() {
    return DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ userId: 'user-1', organizationId: 'org-kelme' }),
    })
  }

  it('returns 204 when an ORG_ADMIN membership is removed', async () => {
    vi.mocked(revokeOrgAdminMembership).mockResolvedValue(undefined)
    const response = await del()
    expect(response.status).toBe(204)
    expect(revokeOrgAdminMembership).toHaveBeenCalledWith('user-1', 'org-kelme')
  })

  it('returns 409 when the role is not ORG_ADMIN', async () => {
    vi.mocked(revokeOrgAdminMembership).mockRejectedValue(
      new PlatformOrgAdminError('not_org_admin'),
    )
    const response = await del()
    expect(response.status).toBe(409)
  })

  it('returns 404 when membership is missing', async () => {
    vi.mocked(revokeOrgAdminMembership).mockRejectedValue(new PlatformOrgAdminError('not_found'))
    const response = await del()
    expect(response.status).toBe(404)
  })

  it('returns 401 without platform admin', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('Unauthorized'))
    const response = await del()
    expect(response.status).toBe(401)
  })
})
