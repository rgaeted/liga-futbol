import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'

export const MAX_ORG_HERO_IMAGES = 12

export async function listOrgHeroImages(organizationId: string) {
  return db.organizationHeroImage.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function addOrgHeroImage(
  organizationId: string,
  storagePath: string,
  mimeType: string,
) {
  const count = await db.organizationHeroImage.count({ where: { organizationId } })
  if (count >= MAX_ORG_HERO_IMAGES) {
    return { ok: false as const, reason: 'limit' as const }
  }

  const maxSort = await db.organizationHeroImage.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  })

  const image = await db.organizationHeroImage.create({
    data: {
      organizationId,
      storagePath,
      mimeType,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  })

  return { ok: true as const, image }
}

export async function deleteOrgHeroImage(organizationId: string, imageId: string) {
  const existing = await db.organizationHeroImage.findFirst({
    where: { id: imageId, organizationId },
  })
  if (!existing) return null

  await db.organizationHeroImage.delete({ where: { id: imageId } })
  return { storagePath: existing.storagePath }
}

export async function reorderOrgHeroImages(organizationId: string, imageIds: string[]) {
  const images = await db.organizationHeroImage.findMany({
    where: { organizationId },
    select: { id: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  if (images.length !== imageIds.length) {
    return { ok: false as const, reason: 'invalid_set' as const }
  }

  const currentIds = new Set(images.map((image) => image.id))
  if (imageIds.some((id) => !currentIds.has(id))) {
    return { ok: false as const, reason: 'invalid_set' as const }
  }

  if (new Set(imageIds).size !== imageIds.length) {
    return { ok: false as const, reason: 'duplicate' as const }
  }

  await db.$transaction(
    imageIds.map((imageId, index) =>
      db.organizationHeroImage.update({
        where: { id: imageId },
        data: { sortOrder: index },
      }),
    ),
  )

  return { ok: true as const }
}

export function orgHeroImageStoragePath(organizationId: string, imageId: string, ext: string) {
  return `orgs/${organizationId}/hero/${imageId}.${ext}`
}

export function newOrgHeroImageId() {
  return randomUUID()
}
