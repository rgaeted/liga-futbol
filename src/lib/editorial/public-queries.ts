import type {
  MobileArticleDetail,
  MobileArticleSummary,
  MobileGalleryDetail,
  MobileGallerySummary,
  MobilePaginated,
  MobileSponsor,
} from '@liga/mobile-contracts'
import { EditorialStatus, SponsorPlacement } from '@prisma/client'
import { db } from '@/lib/db'
import { isSponsorPubliclyVisible } from '@/lib/editorial/sponsors'
import {
  serializeMobileArticleDetail,
  serializeMobileArticleSummary,
  serializeMobileGalleryDetail,
  serializeMobileGallerySummary,
  serializeMobileSponsor,
} from '@/lib/editorial/mobile-serializers'
import type { ResolvedMobileLeague } from '@/lib/mobile/league-context'
import {
  decodeEditorialCursor,
  encodeEditorialCursor,
  type MobileEditorialQuery,
} from '@/lib/validations/editorial-query'

const articleSelect = {
  id: true,
  title: true,
  summary: true,
  body: true,
  coverStoragePath: true,
  publishedAt: true,
} as const

const gallerySelect = {
  id: true,
  title: true,
  description: true,
  coverStoragePath: true,
  publishedAt: true,
} as const

export async function listPublishedArticles(
  league: ResolvedMobileLeague,
  query: MobileEditorialQuery,
): Promise<MobilePaginated<MobileArticleSummary>> {
  const cursor = query.cursor ? decodeEditorialCursor(query.cursor) : null
  const rows = await db.article.findMany({
    where: {
      seasonId: league.season.id,
      status: EditorialStatus.PUBLISHED,
      publishedAt: { not: null },
      ...(cursor
        ? {
            OR: [
              { publishedAt: { lt: cursor.publishedAt } },
              { publishedAt: cursor.publishedAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    select: articleSelect,
  })

  const page = rows.slice(0, query.limit)
  const hasMore = rows.length > query.limit
  const last = page.at(-1)

  return {
    items: page.map(serializeMobileArticleSummary),
    nextCursor:
      hasMore && last?.publishedAt
        ? encodeEditorialCursor(last.publishedAt, last.id)
        : null,
  }
}

export async function getPublishedArticle(
  league: ResolvedMobileLeague,
  articleId: string,
): Promise<MobileArticleDetail | null> {
  const article = await db.article.findFirst({
    where: {
      id: articleId,
      seasonId: league.season.id,
      status: EditorialStatus.PUBLISHED,
      publishedAt: { not: null },
    },
    select: articleSelect,
  })
  if (!article) return null
  return serializeMobileArticleDetail(article)
}

export async function listPublishedGalleries(
  league: ResolvedMobileLeague,
  query: MobileEditorialQuery,
): Promise<MobilePaginated<MobileGallerySummary>> {
  const cursor = query.cursor ? decodeEditorialCursor(query.cursor) : null
  const rows = await db.gallery.findMany({
    where: {
      seasonId: league.season.id,
      status: EditorialStatus.PUBLISHED,
      publishedAt: { not: null },
      ...(cursor
        ? {
            OR: [
              { publishedAt: { lt: cursor.publishedAt } },
              { publishedAt: cursor.publishedAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    select: {
      ...gallerySelect,
      _count: { select: { photos: true } },
    },
  })

  const page = rows.slice(0, query.limit)
  const hasMore = rows.length > query.limit
  const last = page.at(-1)

  return {
    items: page.map((gallery) =>
      serializeMobileGallerySummary(gallery, gallery._count.photos),
    ),
    nextCursor:
      hasMore && last?.publishedAt
        ? encodeEditorialCursor(last.publishedAt, last.id)
        : null,
  }
}

export async function getPublishedGallery(
  league: ResolvedMobileLeague,
  galleryId: string,
): Promise<MobileGalleryDetail | null> {
  const gallery = await db.gallery.findFirst({
    where: {
      id: galleryId,
      seasonId: league.season.id,
      status: EditorialStatus.PUBLISHED,
      publishedAt: { not: null },
    },
    select: gallerySelect,
  })
  if (!gallery) return null

  const photos = await db.galleryPhoto.findMany({
    where: { galleryId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      storagePath: true,
      altText: true,
      caption: true,
    },
  })

  return serializeMobileGalleryDetail(gallery, photos)
}

export async function listPublishedSponsors(
  league: ResolvedMobileLeague,
  placement?: SponsorPlacement,
  now = new Date(),
): Promise<MobileSponsor[]> {
  const sponsors = await db.sponsor.findMany({
    where: {
      seasonId: league.season.id,
      ...(placement ? { placement } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      logoStoragePath: true,
      bannerStoragePath: true,
      websiteUrl: true,
      placement: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
    },
  })

  return sponsors
    .filter((sponsor) => isSponsorPubliclyVisible(sponsor, now))
    .map(serializeMobileSponsor)
}

export async function listRecentPublishedArticles(
  league: ResolvedMobileLeague,
  limit = 3,
): Promise<MobileArticleSummary[]> {
  const rows = await db.article.findMany({
    where: {
      seasonId: league.season.id,
      status: EditorialStatus.PUBLISHED,
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: articleSelect,
  })
  return rows.map(serializeMobileArticleSummary)
}

export async function listHomeSponsors(
  league: ResolvedMobileLeague,
  now = new Date(),
): Promise<MobileSponsor[]> {
  return listPublishedSponsors(league, SponsorPlacement.HOME, now)
}
