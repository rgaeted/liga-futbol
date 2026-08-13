import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import type {
  CreateGalleryPhotoInput,
  UpdateGalleryPhotoInput,
} from '@/lib/validations/editorial'

async function getGalleryInSeason(galleryId: string, seasonId: string) {
  return db.gallery.findFirst({
    where: { id: galleryId, seasonId },
    select: { id: true },
  })
}

export async function listGalleryPhotos(galleryId: string, seasonId: string) {
  const gallery = await getGalleryInSeason(galleryId, seasonId)
  if (!gallery) return null

  return db.galleryPhoto.findMany({
    where: { galleryId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function addGalleryPhoto(
  galleryId: string,
  seasonId: string,
  input: CreateGalleryPhotoInput,
  storagePath: string,
  mimeType: string,
) {
  const gallery = await getGalleryInSeason(galleryId, seasonId)
  if (!gallery) return null

  const maxSort = await db.galleryPhoto.aggregate({
    where: { galleryId },
    _max: { sortOrder: true },
  })

  return db.galleryPhoto.create({
    data: {
      galleryId,
      storagePath,
      mimeType,
      altText: input.altText ?? null,
      caption: input.caption ?? null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  })
}

export async function updateGalleryPhoto(
  galleryId: string,
  seasonId: string,
  photoId: string,
  input: UpdateGalleryPhotoInput,
) {
  const gallery = await getGalleryInSeason(galleryId, seasonId)
  if (!gallery) return null

  const existing = await db.galleryPhoto.findFirst({
    where: { id: photoId, galleryId },
  })
  if (!existing) return null

  return db.galleryPhoto.update({
    where: { id: photoId },
    data: {
      ...(input.altText !== undefined ? { altText: input.altText ?? null } : {}),
      ...(input.caption !== undefined ? { caption: input.caption ?? null } : {}),
    },
  })
}

export async function deleteGalleryPhoto(galleryId: string, seasonId: string, photoId: string) {
  const gallery = await getGalleryInSeason(galleryId, seasonId)
  if (!gallery) return null

  const existing = await db.galleryPhoto.findFirst({
    where: { id: photoId, galleryId },
  })
  if (!existing) return null

  await db.galleryPhoto.delete({ where: { id: photoId } })
  return { storagePath: existing.storagePath }
}

export async function reorderGalleryPhotos(
  galleryId: string,
  seasonId: string,
  photoIds: string[],
) {
  const gallery = await getGalleryInSeason(galleryId, seasonId)
  if (!gallery) return { ok: false as const, reason: 'not_found' as const }

  const photos = await db.galleryPhoto.findMany({
    where: { galleryId },
    select: { id: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  if (photos.length !== photoIds.length) {
    return { ok: false as const, reason: 'invalid_set' as const }
  }

  const currentIds = new Set(photos.map((photo) => photo.id))
  if (photoIds.some((id) => !currentIds.has(id))) {
    return { ok: false as const, reason: 'invalid_set' as const }
  }

  if (new Set(photoIds).size !== photoIds.length) {
    return { ok: false as const, reason: 'duplicate' as const }
  }

  await db.$transaction(
    photoIds.map((photoId, index) =>
      db.galleryPhoto.update({
        where: { id: photoId },
        data: { sortOrder: index },
      }),
    ),
  )

  return { ok: true as const }
}

export function galleryPhotoStoragePath(
  seasonId: string,
  galleryId: string,
  photoId: string,
  ext: string,
) {
  return `seasons/${seasonId}/galleries/${galleryId}/photos/${photoId}.${ext}`
}

export function newGalleryPhotoId() {
  return randomUUID()
}
