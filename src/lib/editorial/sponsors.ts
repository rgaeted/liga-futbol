import { SponsorPlacement, SponsorTier } from '@prisma/client'
import { db } from '@/lib/db'
import { statMonth } from '@/lib/sponsors/stats'
import type {
  CreateSponsorInput,
  SponsorAssignmentInput,
  UpdateSponsorInput,
} from '@/lib/validations/editorial'

export { isSponsorPubliclyVisible } from '@/lib/sponsors/visibility'

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
      tier: input.tier ?? SponsorTier.OFFICIAL,
      tagline: input.tagline ?? null,
      ctaLabel: input.ctaLabel ?? null,
      ctaUrl: input.ctaUrl ?? null,
      showOnLanding: input.showOnLanding ?? false,
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
      ...(input.tier !== undefined ? { tier: input.tier } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline ?? null } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel ?? null } : {}),
      ...(input.ctaUrl !== undefined ? { ctaUrl: input.ctaUrl ?? null } : {}),
      ...(input.showOnLanding !== undefined ? { showOnLanding: input.showOnLanding } : {}),
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

const DEFINITION_LABELS = {
  FINAL: 'Final',
  THIRD_PLACE: '3.er puesto',
  FIFTH_PLACE: '5.º puesto',
} as const
const DEFINITION_ORDER = ['FINAL', 'THIRD_PLACE', 'FIFTH_PLACE'] as const

export type SponsorAssignmentSlot = { target: string; label: string; sponsorId: string | null }

/** Canchas usadas y fases de definición existentes en la temporada, con su auspiciador actual. */
export async function listSponsorAssignmentSlots(
  seasonId: string,
): Promise<SponsorAssignmentSlot[]> {
  const [matches, assignments] = await Promise.all([
    db.match.findMany({ where: { seasonId }, select: { court: true, phase: true } }),
    db.sponsorAssignment.findMany({
      where: { seasonId },
      select: { target: true, sponsorId: true },
    }),
  ])
  const current = new Map(assignments.map((assignment) => [assignment.target, assignment.sponsorId]))

  const courts = [
    ...new Set(matches.map((m) => m.court).filter((court): court is number => court != null)),
  ].sort((a, b) => a - b)
  const phases = new Set(matches.map((m) => m.phase))

  return [
    ...courts.map((court) => ({
      target: `court:${court}`,
      label: `Cancha ${court}`,
      sponsorId: current.get(`court:${court}`) ?? null,
    })),
    ...DEFINITION_ORDER.filter((phase) => phases.has(phase)).map((phase) => ({
      target: `phase:${phase}`,
      label: DEFINITION_LABELS[phase],
      sponsorId: current.get(`phase:${phase}`) ?? null,
    })),
  ]
}

export async function setSponsorAssignment(
  seasonId: string,
  input: SponsorAssignmentInput,
): Promise<'ok' | 'not_found'> {
  if (input.sponsorId === null) {
    await db.sponsorAssignment.deleteMany({ where: { seasonId, target: input.target } })
    return 'ok'
  }
  const sponsor = await db.sponsor.findFirst({ where: { id: input.sponsorId, seasonId } })
  if (!sponsor) return 'not_found'
  await db.sponsorAssignment.upsert({
    where: { seasonId_target: { seasonId, target: input.target } },
    create: { seasonId, target: input.target, sponsorId: input.sponsorId },
    update: { sponsorId: input.sponsorId },
  })
  return 'ok'
}

type StatPair = { views: number; clicks: number }

/** Vistas y clics del mes actual y del anterior por auspiciador de la temporada. */
export async function listSponsorStats(
  seasonId: string,
  now: Date,
): Promise<Record<string, { current: StatPair; previous: StatPair }>> {
  const currentMonth = statMonth(now)
  const previousMonth = statMonth(new Date(currentMonth.getTime() - 24 * 60 * 60 * 1000))
  const rows = await db.sponsorMonthlyStat.findMany({
    where: { sponsor: { seasonId }, month: { in: [currentMonth, previousMonth] } },
  })
  const result: Record<string, { current: StatPair; previous: StatPair }> = {}
  for (const row of rows) {
    const entry = (result[row.sponsorId] ??= {
      current: { views: 0, clicks: 0 },
      previous: { views: 0, clicks: 0 },
    })
    const bucket = row.month.getTime() === currentMonth.getTime() ? entry.current : entry.previous
    bucket.views = row.views
    bucket.clicks = row.clicks
  }
  return result
}
