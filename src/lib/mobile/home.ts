import type { MobileHomeResponse } from '@liga/mobile-contracts'
import { MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import type { ResolvedMobileLeague } from '@/lib/mobile/league-context'
import { listRecentAndUpcomingMatches } from '@/lib/mobile/matches'
import { serializeMobileLeagueConfig, serializeMobileMatchSummary } from '@/lib/mobile/serializers'

export async function getMobileHome(league: ResolvedMobileLeague): Promise<MobileHomeResponse> {
  const { upcoming, recent } = await listRecentAndUpcomingMatches(league)

  const liveMatch = await db.match.findFirst({
    where: {
      seasonId: league.season.id,
      matchType: MatchType.LEAGUE,
      status: { in: [MatchStatus.LIVE, MatchStatus.HALFTIME] },
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      venue: true,
      regionName: true,
      communeName: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  })

  const seasonTeams = await db.seasonTeam.findMany({
    where: { seasonId: league.season.id, status: 'REGISTERED' },
  })
  const byTeamId = new Map(seasonTeams.map((st) => [st.teamId, st]))

  let featuredLiveMatch = null
  if (liveMatch?.homeTeamId && liveMatch.awayTeamId) {
    const home = byTeamId.get(liveMatch.homeTeamId)
    const away = byTeamId.get(liveMatch.awayTeamId)
    if (home && away) {
      featuredLiveMatch = serializeMobileMatchSummary(league.config.slug, liveMatch, home, away)
    }
  }

  return {
    league: serializeMobileLeagueConfig(league.config, league.season),
    featuredLiveMatch,
    upcomingMatches: upcoming,
    recentResults: recent,
    recentArticles: [],
    sponsors: [],
  }
}
