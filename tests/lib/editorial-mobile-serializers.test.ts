import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  serializeMobileArticleDetail,
  serializeMobileGalleryDetail,
  serializeMobileLeagueLogoUrl,
  serializeMobileSponsor,
} from '@/lib/editorial/mobile-serializers'

describe('editorial mobile serializers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('omits internal fields from article DTOs', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    const dto = serializeMobileArticleDetail({
      id: 'article-1',
      title: 'Fecha 1',
      summary: 'Resumen',
      body: 'Cuerpo',
      coverStoragePath: 'seasons/s1/articles/a1/cover.jpg',
      publishedAt: new Date('2026-08-12T12:00:00.000Z'),
    })
    expect(dto).toEqual({
      id: 'article-1',
      title: 'Fecha 1',
      summary: 'Resumen',
      body: 'Cuerpo',
      coverUrl:
        'https://project.supabase.co/storage/v1/object/public/editorial/seasons/s1/articles/a1/cover.jpg',
      publishedAt: '2026-08-12T12:00:00.000Z',
    })
    expect(dto).not.toHaveProperty('authorId')
    expect(dto).not.toHaveProperty('status')
    expect(dto).not.toHaveProperty('storagePath')
    expect(dto).not.toHaveProperty('coverMimeType')
  })

  it('resolves league logo storage paths to absolute URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    expect(serializeMobileLeagueLogoUrl('seasons/s1/mobile/logo.webp')).toBe(
      'https://project.supabase.co/storage/v1/object/public/editorial/seasons/s1/mobile/logo.webp',
    )
  })

  it('serializes gallery photos with public URLs only', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    const dto = serializeMobileGalleryDetail(
      {
        id: 'gallery-1',
        title: 'Final',
        description: 'Desc',
        coverStoragePath: null,
        publishedAt: new Date('2026-08-12T12:00:00.000Z'),
      },
      [
        {
          id: 'photo-1',
          storagePath: 'seasons/s1/galleries/g1/photos/p1.jpg',
          altText: 'Gol',
          caption: null,
        },
      ],
    )
    expect(dto.photos[0]).toEqual({
      id: 'photo-1',
      url: 'https://project.supabase.co/storage/v1/object/public/editorial/seasons/s1/galleries/g1/photos/p1.jpg',
      altText: 'Gol',
      caption: null,
    })
    expect(dto.photos[0]).not.toHaveProperty('storagePath')
    expect(dto.photos[0]).not.toHaveProperty('mimeType')
  })

  it('serializes sponsor assets without internal paths', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    const dto = serializeMobileSponsor({
      id: 'sponsor-1',
      name: 'Kelme',
      logoStoragePath: 'seasons/s1/sponsors/sp1/logo.png',
      bannerStoragePath: null,
      websiteUrl: 'https://kelme.cl',
      placement: 'HOME',
    })
    expect(dto.logoUrl).toContain('/storage/v1/object/public/editorial/')
    expect(dto).not.toHaveProperty('logoStoragePath')
    expect(dto).not.toHaveProperty('isActive')
  })
})
