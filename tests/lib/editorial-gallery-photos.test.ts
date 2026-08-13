import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reorderGalleryPhotos } from '@/lib/editorial/gallery-photos'

vi.mock('@/lib/db', () => ({
  db: {
    gallery: {
      findFirst: vi.fn(),
    },
    galleryPhoto: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'

describe('reorderGalleryPhotos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects duplicate photo ids', async () => {
    vi.mocked(db.gallery.findFirst).mockResolvedValue({ id: 'gallery-1' } as never)
    vi.mocked(db.galleryPhoto.findMany).mockResolvedValue([
      { id: 'p1' },
      { id: 'p2' },
    ] as never)

    const result = await reorderGalleryPhotos('gallery-1', 'season-1', ['p1', 'p1'])
    expect(result).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('rejects foreign photo ids', async () => {
    vi.mocked(db.gallery.findFirst).mockResolvedValue({ id: 'gallery-1' } as never)
    vi.mocked(db.galleryPhoto.findMany).mockResolvedValue([{ id: 'p1' }] as never)

    const result = await reorderGalleryPhotos('gallery-1', 'season-1', ['p1', 'p2'])
    expect(result).toEqual({ ok: false, reason: 'invalid_set' })
  })

  it('updates all sort positions in one transaction', async () => {
    vi.mocked(db.gallery.findFirst).mockResolvedValue({ id: 'gallery-1' } as never)
    vi.mocked(db.galleryPhoto.findMany).mockResolvedValue([
      { id: 'p1' },
      { id: 'p2' },
    ] as never)
    vi.mocked(db.$transaction).mockResolvedValue([])

    const result = await reorderGalleryPhotos('gallery-1', 'season-1', ['p2', 'p1'])
    expect(result).toEqual({ ok: true })
    expect(db.$transaction).toHaveBeenCalled()
  })
})
