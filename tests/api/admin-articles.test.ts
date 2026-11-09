import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/seasons/[id]/articles/route'

vi.mock('@/lib/auth', () => ({
  requireOrgRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    season: { findUnique: vi.fn().mockResolvedValue({ organizationId: 'org-1' }) },
    organization: { findUniqueOrThrow: vi.fn().mockResolvedValue({ plan: 'LEAGUE' }) },
    article: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/editorial/articles', () => ({
  listAdminArticles: vi.fn(),
  createArticle: vi.fn(),
}))

import { requireOrgRole } from '@/lib/auth'
import { createArticle } from '@/lib/editorial/articles'
import { db } from '@/lib/db'

describe('admin articles routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without admin role', async () => {
    vi.mocked(requireOrgRole).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fecha 1', body: 'Texto' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(401)
    expect(createArticle).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid JSON body', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fecha 1', body: '' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(400)
    expect(createArticle).not.toHaveBeenCalled()
  })

  it.each([
    { name: 'another organization', season: { organizationId: 'org-2' }, status: 403 },
    { name: 'a missing season', season: null, status: 404 },
  ])('rejects an article for $name', async ({ season, status }) => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    vi.mocked(db.season.findUnique).mockResolvedValueOnce(season as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fecha 1', body: 'Texto completo' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(status)
    expect(createArticle).not.toHaveBeenCalled()
  })

  it('rejects publishing content when the plan does not include it', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValueOnce({ plan: 'CLUB' } as never)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fecha 1', body: 'Texto completo' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )

    expect(response.status).toBe(403)
    expect(createArticle).not.toHaveBeenCalled()
  })

  it('creates an article for the season', async () => {
    vi.mocked(requireOrgRole).mockResolvedValue({
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      session: { user: { id: 'admin-1' } },
    } as never)
    vi.mocked(createArticle).mockResolvedValue({ id: 'article-1' } as never)
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fecha 1', body: 'Texto completo' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(201)
    expect(createArticle).toHaveBeenCalledWith('season-1', 'admin-1', expect.any(Object))
  })
})
