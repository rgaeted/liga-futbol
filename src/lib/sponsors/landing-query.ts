import { db } from '@/lib/db'
import {
  buildLandingSponsors,
  pickLandingSeasonId,
  type LandingSponsors,
  type SponsorRowForLanding,
} from '@/lib/sponsors/landing'

const SPONSOR_SELECT = {
  id: true,
  name: true,
  tier: true,
  logoStoragePath: true,
  tagline: true,
  ctaLabel: true,
  ctaUrl: true,
  websiteUrl: true,
  isActive: true,
  startsAt: true,
  endsAt: true,
  showOnLanding: true,
  sortOrder: true,
  seasonId: true,
} as const

/** Auspiciadores que el landing de una organización debe mostrar, o null si no hay ninguno. */
export async function getLandingSponsors(
  organizationId: string,
  now: Date = new Date(),
): Promise<LandingSponsors | null> {
  const seasons = await db.season.findMany({
    where: { organizationId },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  })
  if (seasons.length === 0) return null
  const seasonIds = seasons.map((season) => season.id)

  const sponsors: SponsorRowForLanding[] = await db.sponsor.findMany({
    where: { organizationId, seasonId: { in: seasonIds } },
    select: SPONSOR_SELECT,
  })
  const assignments = await db.sponsorAssignment.findMany({
    where: { seasonId: { in: seasonIds } },
    select: { seasonId: true, target: true, sponsorId: true },
  })

  const seasonId =
    pickLandingSeasonId(sponsors, seasonIds, now) ??
    seasonIds.find((id) => assignments.some((assignment) => assignment.seasonId === id)) ??
    null
  if (!seasonId) return null

  return buildLandingSponsors({
    seasonId,
    sponsors,
    assignments: assignments.filter((assignment) => assignment.seasonId === seasonId),
    now,
  })
}

/** Igual que `getLandingSponsors`, partiendo del slug de la organización. */
export async function getLandingSponsorsBySlug(slug: string): Promise<LandingSponsors | null> {
  const organization = await db.organization.findUnique({ where: { slug }, select: { id: true } })
  return organization ? getLandingSponsors(organization.id) : null
}
