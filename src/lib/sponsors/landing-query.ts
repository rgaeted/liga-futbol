import { db } from '@/lib/db'
import {
  buildLandingSponsors,
  courtTarget,
  pickLandingSeasonId,
  type LandingSponsor,
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
  updatedAt: true,
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
    assignments,
    now,
  })
}

/** Igual que `getLandingSponsors`, partiendo del slug de la organización. */
export async function getLandingSponsorsBySlug(slug: string): Promise<LandingSponsors | null> {
  const organization = await db.organization.findUnique({ where: { slug }, select: { id: true } })
  return organization ? getLandingSponsors(organization.id) : null
}

/** Auspiciador que da nombre a una cancha de la temporada (p. ej. en la página en vivo), si lo hay y está vigente. */
export async function getCourtSponsor(
  seasonId: string,
  court: number,
  now: Date = new Date(),
): Promise<LandingSponsor | null> {
  const target = courtTarget(court)
  const assignment = await db.sponsorAssignment.findFirst({
    where: { seasonId, target },
    select: { seasonId: true, target: true, sponsorId: true },
  })
  if (!assignment) return null
  const sponsor: SponsorRowForLanding | null = await db.sponsor.findFirst({
    where: { id: assignment.sponsorId, seasonId },
    select: SPONSOR_SELECT,
  })
  if (!sponsor) return null
  const result = buildLandingSponsors({ seasonId, sponsors: [sponsor], assignments: [assignment], now })
  return result?.byTargetBySeason[seasonId]?.[target] ?? null
}
