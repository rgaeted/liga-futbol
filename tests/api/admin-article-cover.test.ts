import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/admin/seasons/[id]/articles/[articleId]/cover/route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    article: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/editorial/storage', () => ({
  uploadEditorialObject: vi.fn(),
  bestEffortDeleteEditorialObjects: vi.fn(),
  editorialStoragePath: (segments: string[]) => segments.join('/'),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { uploadEditorialObject } from '@/lib/editorial/storage'

function imageRequest() {
  const file = new File([new Uint8Array([1, 2, 3])], 'cover.webp', { type: 'image/webp' })
  const form = new FormData()
  form.set('cover', file)
  return new Request('http://localhost', { method: 'POST', body: form })
}

describe('admin article cover route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without admin role', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(imageRequest(), {
      params: Promise.resolve({ id: 'season-1', articleId: 'article-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 400 for invalid mime type', async () => {
    vi.mocked(requireRole).mockResolvedValue({ user: { id: 'admin-1' } } as never)
    vi.mocked(db.article.findFirst).mockResolvedValue({ id: 'article-1', coverStoragePath: null } as never)
    const file = new File([new Uint8Array([1])], 'cover.gif', { type: 'image/gif' })
    const form = new FormData()
    form.set('cover', file)
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: form }),
      { params: Promise.resolve({ id: 'season-1', articleId: 'article-1' }) },
    )
    expect(response.status).toBe(400)
  })

  it('uploads a valid cover image', async () => {
    vi.mocked(requireRole).mockResolvedValue({ user: { id: 'admin-1' } } as never)
    vi.mocked(db.article.findFirst).mockResolvedValue({ id: 'article-1', coverStoragePath: null } as never)
    vi.mocked(uploadEditorialObject).mockResolvedValue(undefined)
    const response = await POST(imageRequest(), {
      params: Promise.resolve({ id: 'season-1', articleId: 'article-1' }),
    })
    expect(response.status).toBe(200)
    expect(uploadEditorialObject).toHaveBeenCalled()
  })
})
