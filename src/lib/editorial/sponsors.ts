import { SponsorPlacement } from '@prisma/client'
import { db } from '@/lib/db'
import type { CreateSponsorInput, UpdateSponsorInput } from '@/lib/validations/editorial'

type SponsorVisibility = {
  isActive: boolean
  startsAt: Date | null
  endsAt: Date | null
}

export function isSponsorPubliclyVisible(sponsor: SponsorVisibility, now: Date): boolean {
  if (!sponsor.isActive) return false
  if (sponsor.startsAt && now < sponsor.startsAt) return false
  if (sponsor.endsAt && now > sponsor.endsAt) return false
  return true
}

export async function listAdminSponsors(seasonId: string) {
  return db.sponsor.findMany({
    where: { seasonId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function createSponsor(seasonId: string, input: CreateSponsorInput) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    select: { organizationId: true },
  })
  if (!season) throw new Error('NotFound')

  return db.sponsor.create({
    data: {
      seasonId,
      organizationId: season.organizationId,
      name: input.name,
      websiteUrl: input.websiteUrl ?? null,
      placement: input.placement ?? SponsorPlacement.SPONSORS_PAGE,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  })
}

export async function updateSponsor(
  seasonId: string,
  sponsorId: string,
  input: UpdateSponsorInput,
) {
  const existing = await db.sponsor.findFirst({
    where: { id: sponsorId, seasonId },
  })
  if (!existing) return null

  return db.sponsor.update({
    where: { id: sponsorId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl ?? null } : {}),
      ...(input.placement !== undefined ? { placement: input.placement } : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
        : {}),
      ...(input.endsAt !== undefined
        ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  })
}

export async function deleteSponsor(seasonId: string, sponsorId: string) {
  const existing = await db.sponsor.findFirst({
    where: { id: sponsorId, seasonId },
  })
  if (!existing) return null

  await db.sponsor.delete({ where: { id: sponsorId } })
  return {
    logoStoragePath: existing.logoStoragePath,
    bannerStoragePath: existing.bannerStoragePath,
  }
}

export function sponsorLogoStoragePath(seasonId: string, sponsorId: string, ext: string) {
  return `seasons/${seasonId}/sponsors/${sponsorId}/logo.${ext}`
}

export function sponsorBannerStoragePath(seasonId: string, sponsorId: string, ext: string) {
  return `seasons/${seasonId}/sponsors/${sponsorId}/banner.${ext}`
}

export function seasonMobileLogoStoragePath(seasonId: string, ext: string) {
  return `seasons/${seasonId}/mobile/logo.${ext}`
}
