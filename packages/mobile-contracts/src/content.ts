export type MobileArticleSummary = {
  id: string
  title: string
  summary: string | null
  coverUrl: string | null
  publishedAt: string
}

export type MobileArticleDetail = MobileArticleSummary & {
  body: string
}

export type MobileGallerySummary = {
  id: string
  title: string
  coverUrl: string | null
  photoCount: number
  publishedAt: string
}

export type MobileGalleryPhoto = {
  id: string
  url: string
  altText: string | null
  caption: string | null
}

export type MobileGalleryDetail = MobileGallerySummary & {
  description: string | null
  photos: MobileGalleryPhoto[]
}

export type MobileSponsor = {
  id: string
  name: string
  logoUrl: string | null
  bannerUrl: string | null
  websiteUrl: string | null
  placement: string
}
