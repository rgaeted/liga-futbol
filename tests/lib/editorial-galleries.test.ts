import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteGallery } from '@/lib/editorial/galleries'

vi.mock('@/lib/db', () => ({
  db: {
    gallery: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

describe('editorial galleries domain', () => {
  beforeEach(() => vi.clearAllMocks())

  it('collects cover and photo paths on delete', async () => {
    vi.mocked(db.gallery.findFirst).mockResolvedValue({
      id: 'gallery-1',
      coverStoragePath: 'seasons/s1/galleries/g1/cover.jpg',
      photos: [{ storagePath: 'seasons/s1/galleries/g1/photos/p1.jpg' }],
    } as never)

    const result = await deleteGallery('season-1', 'gallery-1')
    expect(result?.storagePaths).toEqual([
      'seasons/s1/galleries/g1/cover.jpg',
      'seasons/s1/galleries/g1/photos/p1.jpg',
    ])
  })
})
