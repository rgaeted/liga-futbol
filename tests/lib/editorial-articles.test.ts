import { EditorialStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createArticle,
  deleteArticle,
  updateArticle,
} from '@/lib/editorial/articles'
import { applyPublishTransition } from '@/lib/editorial/publication'

vi.mock('@/lib/db', () => ({
  db: {
    article: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

describe('editorial articles domain', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets publishedAt when publishing on create', async () => {
    const now = new Date('2026-08-12T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.mocked(db.article.create).mockResolvedValue({ id: 'article-1' } as never)

    await createArticle('season-a', 'user-1', {
      title: 'Fecha 1',
      body: 'Resumen',
      status: EditorialStatus.PUBLISHED,
    })

    expect(db.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publishedAt: now,
          status: EditorialStatus.PUBLISHED,
        }),
      }),
    )
    vi.useRealTimers()
  })

  it('returns null when updating an article from another season', async () => {
    vi.mocked(db.article.findFirst).mockResolvedValue(null)
    const result = await updateArticle('season-a', 'article-b', { title: 'Nuevo' })
    expect(result).toBeNull()
  })

  it('returns cover path on delete for cleanup', async () => {
    vi.mocked(db.article.findFirst).mockResolvedValue({
      id: 'article-1',
      coverStoragePath: 'seasons/s1/articles/a1/cover.jpg',
    } as never)

    const result = await deleteArticle('season-a', 'article-1')
    expect(result).toEqual({
      coverStoragePath: 'seasons/s1/articles/a1/cover.jpg',
    })
  })

  it('preserves publishedAt on published updates', async () => {
    const publishedAt = new Date('2026-08-10T12:00:00.000Z')
    vi.mocked(db.article.findFirst).mockResolvedValue({
      id: 'article-1',
      status: EditorialStatus.PUBLISHED,
      publishedAt,
    } as never)
    vi.mocked(db.article.update).mockResolvedValue({ id: 'article-1' } as never)

    await updateArticle('season-a', 'article-1', { title: 'Editado' })
    expect(applyPublishTransition(EditorialStatus.PUBLISHED, publishedAt, new Date())).toEqual(
      publishedAt,
    )
  })
})
