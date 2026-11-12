import { editorialPublicUrl } from '@/lib/editorial/urls'
import { isSponsorPubliclyVisible } from '@/lib/sponsors/visibility'

export type LandingSponsor = {
  id: string
  name: string
  tier: 'MAIN' | 'OFFICIAL'
  logoUrl: string | null
  tagline: string | null
  ctaLabel: string | null
  hasCta: boolean
  hasWebsite: boolean
}

export type LandingSponsors = {
  seasonId: string
  main: LandingSponsor[]
  official: LandingSponsor[]
  /** temporada → target ("court:1", "phase:FINAL") → auspiciador que lo presenta. */
  byTargetBySeason: Record<string, Record<string, LandingSponsor>>
}

export type SponsorRowForLanding = {
  id: string
  name: string
  tier: 'MAIN' | 'OFFICIAL'
  logoStoragePath: string | null
  tagline: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  websiteUrl: string | null
  isActive: boolean
  startsAt: Date | null
  endsAt: Date | null
  showOnLanding: boolean
  sortOrder: number
  seasonId: string
  /** Versiona la URL del logo: al reemplazarlo se ve el nuevo y no la copia en caché. */
  updatedAt?: Date | null
}

export type DefinitionPhase = 'FINAL' | 'THIRD_PLACE' | 'FIFTH_PLACE'

export const courtTarget = (court: number) => `court:${court}`
export const phaseTarget = (phase: DefinitionPhase) => `phase:${phase}`

export const sponsorClickHref = (sponsorId: string, to: 'cta' | 'web') =>
  `/api/public/sponsors/${sponsorId}/click?to=${to}`

const isHttpUrl = (url: string | null): boolean => url != null && /^https?:\/\//i.test(url)

const inStrip = (row: SponsorRowForLanding, now: Date) =>
  row.showOnLanding && isSponsorPubliclyVisible(row, now)

/** Temporada más reciente que tenga al menos un auspiciador visible en el landing. */
export function pickLandingSeasonId(
  rows: SponsorRowForLanding[],
  seasonsByRecency: string[],
  now: Date,
): string | null {
  for (const seasonId of seasonsByRecency) {
    if (rows.some((row) => row.seasonId === seasonId && inStrip(row, now))) return seasonId
  }
  return null
}

function versionedLogoUrl(row: SponsorRowForLanding): string | null {
  const url = editorialPublicUrl(row.logoStoragePath)
  return url && row.updatedAt ? `${url}?v=${row.updatedAt.getTime()}` : url
}

function toLanding(row: SponsorRowForLanding): LandingSponsor {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    logoUrl: versionedLogoUrl(row),
    tagline: row.tagline,
    ctaLabel: row.ctaLabel,
    hasCta: isHttpUrl(row.ctaUrl),
    hasWebsite: isHttpUrl(row.websiteUrl),
  }
}

const byOrder = (a: SponsorRowForLanding, b: SponsorRowForLanding) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es-CL')

export function buildLandingSponsors(input: {
  seasonId: string
  sponsors: SponsorRowForLanding[]
  assignments: Array<{ seasonId: string; target: string; sponsorId: string }>
  now: Date
}): LandingSponsors | null {
  const visibleInStrip = input.sponsors
    .filter((row) => row.seasonId === input.seasonId && inStrip(row, input.now))
    .sort(byOrder)
  const visibleById = new Map(
    input.sponsors.filter((row) => isSponsorPubliclyVisible(row, input.now)).map((row) => [row.id, row]),
  )

  const byTargetBySeason: Record<string, Record<string, LandingSponsor>> = {}
  for (const assignment of input.assignments) {
    const row = visibleById.get(assignment.sponsorId)
    if (!row || row.seasonId !== assignment.seasonId) continue
    ;(byTargetBySeason[assignment.seasonId] ??= {})[assignment.target] = toLanding(row)
  }

  const main = visibleInStrip.filter((row) => row.tier === 'MAIN').map(toLanding)
  const official = visibleInStrip.filter((row) => row.tier !== 'MAIN').map(toLanding)
  if (main.length === 0 && official.length === 0 && Object.keys(byTargetBySeason).length === 0) return null
  return { seasonId: input.seasonId, main, official, byTargetBySeason }
}
