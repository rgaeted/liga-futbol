import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requirePlatformAdmin: vi.fn(),
}))

vi.mock('@/lib/platform-org-admins', () => ({
  searchPlatformUsers: vi.fn(),
}))

import { requirePlatformAdmin } from '@/lib/auth'
import { searchPlatformUsers } from '@/lib/platform-org-admins'
import { GET } from '@/app/api/plataforma/users/search/route'

describe('GET /api/plataforma/users/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: 'admin' } } as never)
  })

  it('returns search results for platform admin', async () => {
    vi.mocked(searchPlatformUsers).mockResolvedValue([
      {
        id: 'user-1',
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        memberships: [],
      },
    ])

    const response = await GET(new Request('http://localhost/api/plataforma/users/search?q=ana'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        id: 'user-1',
        email: 'ana@liga.com',
        name: 'Ana Pérez',
        memberships: [],
      },
    ])
    expect(searchPlatformUsers).toHaveBeenCalledWith('ana')
  })

  it('returns 401 without platform admin', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('Unauthorized'))

    const response = await GET(new Request('http://localhost/api/plataforma/users/search?q=ana'))
    expect(response.status).toBe(401)
  })
})
