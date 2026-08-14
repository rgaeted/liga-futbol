import { EditorialStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { applyPublishTransition } from '@/lib/editorial/publication'
import type { CreateGalleryInput, UpdateGalleryInput } from '@/lib/validations/editorial'

export async function listAdminGalleries(seasonId: string) {
  return db.gallery.findMany({
    where: { seasonId },
    include: { _count: { select: { photos: true } } },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  })
}

export async function createGallery(seasonId: string, input: CreateGalleryInput) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    select: { organizationId: true },
  })
  if (!season) throw new Error('NotFound')

  const now = new Date()
  const status = input.status ?? EditorialStatus.DRAFT
  return db.gallery.create({
    data: {
      seasonId,
      organizationId: season.organizationId,
      title: input.title,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      status,
      publishedAt: applyPublishTransition(status, null, now),
    },
  })
}

export async function updateGallery(
  seasonId: string,
  galleryId: string,
  input: UpdateGalleryInput,
) {
  const existing = await db.gallery.findFirst({
    where: { id: galleryId, seasonId },
  })
  if (!existing) return null

  const now = new Date()
  const status = input.status ?? existing.status
  return db.gallery.update({
    where: { id: galleryId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      status,
      publishedAt: applyPublishTransition(status, existing.publishedAt, now),
    },
  })
}

export async function deleteGallery(seasonId: string, galleryId: string) {
  const existing = await db.gallery.findFirst({
    where: { id: galleryId, seasonId },
    include: { photos: true },
  })
  if (!existing) return null

  await db.gallery.delete({ where: { id: galleryId } })
  const storagePaths = [
    existing.coverStoragePath,
    ...existing.photos.map((photo) => photo.storagePath),
  ].filter((path): path is string => Boolean(path))

  return { storagePaths }
}

export function galleryCoverStoragePath(seasonId: string, galleryId: string, ext: string) {
  return `seasons/${seasonId}/galleries/${galleryId}/cover.${ext}`
}
