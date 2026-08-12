import type {
  MobileLeagueConfig,
  MobileLiveSnapshot,
  MobileMatchDetail,
  MobileMatchSummary,
  MobileTeamRef,
} from '@liga/mobile-contracts'
import type { SeasonMobileConfig, Season, SeasonTeam } from '@prisma/client'
import { formatChileLocation } from '@/lib/chile-locations'
import { matchStatusLabel } from '@/lib/match-status-ui'
import { teamInitials } from '@/lib/player-name'
import { resolveTeamColor } from '@/lib/team-color'
import { teamHasCrest } from '@/lib/team-crest'

type SeasonTeamSnapshot = Pick<
  SeasonTeam,
  'id' | 'teamId' | 'displayName' | 'color' | 'crestMimeType' | 'crestData'
>

export function mobileSeasonTeamCrestUrl(slug: string, seasonTeamId: string): string | null {
  return `/api/mobile/v1/leagues/${slug}/teams/${seasonTeamId}/crest`
}

export function serializeMobileTeamRef(
  slug: string,
  seasonTeam: SeasonTeamSnapshot,
): MobileTeamRef {
  const hasCrest = teamHasCrest(seasonTeam)
  return {
    seasonTeamId: seasonTeam.id,
    teamId: seasonTeam.teamId,
    name: seasonTeam.displayName,
    color: resolveTeamColor(seasonTeam.color, seasonTeam.displayName),
    crestUrl: hasCrest ? mobileSeasonTeamCrestUrl(slug, seasonTeam.id) : null,
    initials: teamInitials(seasonTeam.displayName),
  }
}

export function serializeMobileLeagueConfig(
  config: SeasonMobileConfig,
  season: Season,
): MobileLeagueConfig {
  return {
    slug: config.slug,
    displayName: config.displayName,
    shortName: config.shortName,
    description: config.description,
    logoUrl: config.logoStoragePath,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    footballFormat: season.footballFormat,
    season: {
      startDate: season.startDate.toISOString(),
      endDate: season.endDate.toISOString(),
    },
  }
}

type MatchRow = {
  id: string
  scheduledAt: Date
  status: string
  homeScore: number
  awayScore: number
  venue: string | null
  regionName: string | null
  communeName: string | null
  footballFormat?: string
  weatherLabel?: string | null
  weatherTempC?: number | null
  weatherHumidityPct?: number | null
  weatherWindKmh?: number | null
  homeTeamId: string | null
  awayTeamId: string | null
}

export function serializeMobileMatchSummary(
  slug: string,
  match: MatchRow,
  home: SeasonTeamSnapshot,
  away: SeasonTeamSnapshot,
): MobileMatchSummary {
  return {
    id: match.id,
    scheduledAt: match.scheduledAt.toISOString(),
    status: match.status as MobileMatchSummary['status'],
    statusLabel: matchStatusLabel(match.status),
    home: serializeMobileTeamRef(slug, home),
    away: serializeMobileTeamRef(slug, away),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    venue: match.venue,
    locationLabel: formatChileLocation(match.regionName, match.communeName),
  }
}

export function serializeMobileMatchDetail(
  slug: string,
  match: MatchRow,
  home: SeasonTeamSnapshot,
  away: SeasonTeamSnapshot,
): MobileMatchDetail {
  const summary = serializeMobileMatchSummary(slug, match, home, away)
  const hasWeather =
    match.weatherLabel != null &&
    match.weatherTempC != null &&
    match.weatherHumidityPct != null &&
    match.weatherWindKmh != null

  return {
    ...summary,
    footballFormat: match.footballFormat ?? 'FUTBOL_11',
    weather: hasWeather
      ? {
          label: match.weatherLabel!,
          tempC: match.weatherTempC!,
          humidityPct: match.weatherHumidityPct!,
          windKmh: match.weatherWindKmh!,
        }
      : null,
  }
}

export function sanitizeMobileLiveSnapshot(snapshot: MobileLiveSnapshot): MobileLiveSnapshot {
  const json = JSON.stringify(snapshot)
  for (const forbidden of ['passwordHash', 'crestData', 'refereeId', 'logoStoragePath']) {
    if (json.includes(forbidden)) {
      throw new Error('mobile_snapshot_leak')
    }
  }
  return snapshot
}
