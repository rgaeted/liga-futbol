import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/seasons/[id]/galleries/route'

vi.mock('@/lib/db', () => ({
  db: {
    season: { findUnique: vi.fn().mockResolvedValue({ organizationId: 'org-1' }) },
    organization: { findUniqueOrThrow: vi.fn().mockResolvedValue({ plan: 'LEAGUE' }) },
  },
}))

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/editorial/galleries', () => ({
  listAdminGalleries: vi.fn(),
  createGallery: vi.fn(),
}))

import { requireOrgRole } from '@/lib/auth'
import { createGallery } from '@/lib/editorial/galleries'

describe('admin galleries routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without admin role', async () => {
    vi.mocked(requireOrgRole).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Final' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(401)
  })

  it('creates a gallery', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    vi.mocked(createGallery).mockResolvedValue({ id: 'gallery-1' } as never)
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Final' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(201)
  })
})
