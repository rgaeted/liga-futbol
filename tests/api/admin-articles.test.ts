import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/seasons/[id]/articles/route'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
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

import { requireRole } from '@/lib/auth'
import { createArticle } from '@/lib/editorial/articles'

describe('admin articles routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without admin role', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fecha 1', body: 'Texto' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(401)
  })

  it('returns 400 for invalid JSON body', async () => {
    vi.mocked(requireRole).mockResolvedValue({ user: { id: 'admin-1' } } as never)
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fecha 1', body: '' }),
      }),
      { params: Promise.resolve({ id: 'season-1' }) },
    )
    expect(response.status).toBe(400)
  })

  it('creates an article for the season', async () => {
    vi.mocked(requireRole).mockResolvedValue({ user: { id: 'admin-1' } } as never)
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
