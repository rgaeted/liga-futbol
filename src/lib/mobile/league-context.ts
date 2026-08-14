import { MatchType, OrganizationStatus, type Season, type SeasonMobileConfig } from '@prisma/client'
import { db } from '@/lib/db'
import { MobileApiError } from '@/lib/mobile/errors'
import { pausedOrganizationPayload } from '@/lib/organization-status'

export type ResolvedMobileLeague = {
  config: SeasonMobileConfig
  season: Season & { organization: { status: OrganizationStatus } }
  seasonTeamByTeamId: Map<
    string,
    { id: string; displayName: string; color: string | null; crestMimeType: string | null }
  >
}

type MatchScope = {
  seasonId: string | null
  matchType: MatchType
}

export async function resolvePublishedLeagueBySlug(slug: string): Promise<ResolvedMobileLeague | null> {
  const config = await db.seasonMobileConfig.findFirst({
    where: { slug, isPublished: true },
    include: {
      season: {
        include: {
          organization: { select: { status: true } },
          seasonTeams: {
            where: { status: 'REGISTERED' },
            select: {
              id: true,
              teamId: true,
              displayName: true,
              color: true,
              crestMimeType: true,
            },
          },
        },
      },
    },
  })

  if (!config) return null

  if (config.season.organization.status === OrganizationStatus.PAUSED) {
    throw new MobileApiError(503, pausedOrganizationPayload().error)
  }

  const seasonTeamByTeamId = new Map(
    config.season.seasonTeams.map((st) => [st.teamId, st]),
  )

  return {
    config,
    season: config.season,
    seasonTeamByTeamId,
  }
}

export function assertLeagueMatch(match: MatchScope, league: ResolvedMobileLeague): void {
  if (match.matchType !== MatchType.LEAGUE || match.seasonId !== league.season.id) {
    throw new MobileApiError(404, 'Partido no encontrado')
  }
}
