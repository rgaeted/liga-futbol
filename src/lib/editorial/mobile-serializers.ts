import type {
  MobileArticleDetail,
  MobileArticleSummary,
  MobileGalleryDetail,
  MobileGalleryPhoto,
  MobileGallerySummary,
  MobileSponsor,
} from '@liga/mobile-contracts'
import type { Article, Gallery, GalleryPhoto, Sponsor } from '@prisma/client'
import { editorialPublicUrl } from '@/lib/editorial/urls'

type ArticleRow = Pick<
  Article,
  'id' | 'title' | 'summary' | 'body' | 'coverStoragePath' | 'publishedAt'
>

type GalleryRow = Pick<
  Gallery,
  'id' | 'title' | 'description' | 'coverStoragePath' | 'publishedAt'
>

type GalleryPhotoRow = Pick<GalleryPhoto, 'id' | 'storagePath' | 'altText' | 'caption'>

type SponsorRow = Pick<
  Sponsor,
  | 'id'
  | 'name'
  | 'logoStoragePath'
  | 'bannerStoragePath'
  | 'websiteUrl'
  | 'placement'
>

export function serializeMobileArticleSummary(article: ArticleRow): MobileArticleSummary {
  if (!article.publishedAt) {
    throw new Error('Artículo sin fecha de publicación')
  }
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    coverUrl: editorialPublicUrl(article.coverStoragePath),
    publishedAt: article.publishedAt.toISOString(),
  }
}

export function serializeMobileArticleDetail(article: ArticleRow): MobileArticleDetail {
  return {
    ...serializeMobileArticleSummary(article),
    body: article.body,
  }
}

export function serializeMobileGallerySummary(
  gallery: GalleryRow,
  photoCount: number,
): MobileGallerySummary {
  if (!gallery.publishedAt) {
    throw new Error('Galería sin fecha de publicación')
  }
  return {
    id: gallery.id,
    title: gallery.title,
    coverUrl: editorialPublicUrl(gallery.coverStoragePath),
    photoCount,
    publishedAt: gallery.publishedAt.toISOString(),
  }
}

export function serializeMobileGalleryPhoto(photo: GalleryPhotoRow): MobileGalleryPhoto {
  const url = editorialPublicUrl(photo.storagePath)
  if (!url) {
    throw new Error('Foto sin URL pública')
  }
  return {
    id: photo.id,
    url,
    altText: photo.altText,
    caption: photo.caption,
  }
}

export function serializeMobileGalleryDetail(
  gallery: GalleryRow,
  photos: GalleryPhotoRow[],
): MobileGalleryDetail {
  return {
    ...serializeMobileGallerySummary(gallery, photos.length),
    description: gallery.description,
    photos: photos.map(serializeMobileGalleryPhoto),
  }
}

export function serializeMobileSponsor(sponsor: SponsorRow): MobileSponsor {
  return {
    id: sponsor.id,
    name: sponsor.name,
    logoUrl: editorialPublicUrl(sponsor.logoStoragePath),
    bannerUrl: editorialPublicUrl(sponsor.bannerStoragePath),
    websiteUrl: sponsor.websiteUrl,
    placement: sponsor.placement,
  }
}

export function serializeMobileLeagueLogoUrl(logoStoragePath: string | null | undefined) {
  return editorialPublicUrl(logoStoragePath)
}
