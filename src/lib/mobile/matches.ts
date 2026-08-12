import type { MobileMatchDetail, MobileMatchSummary, MobilePaginated } from '@liga/mobile-contracts'
import { MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import type { ResolvedMobileLeague } from '@/lib/mobile/league-context'
import { serializeMobileMatchDetail, serializeMobileMatchSummary } from '@/lib/mobile/serializers'
import {
  decodeMatchCursor,
  encodeMatchCursor,
  type MobileMatchesQuery,
} from '@/lib/validations/mobile-query'

const matchSelect = {
  id: true,
  scheduledAt: true,
  status: true,
  homeScore: true,
  awayScore: true,
  venue: true,
  regionName: true,
  communeName: true,
  footballFormat: true,
  weatherLabel: true,
  weatherTempC: true,
  weatherHumidityPct: true,
  weatherWindKmh: true,
  homeTeamId: true,
  awayTeamId: true,
} as const

async function loadSeasonTeams(league: ResolvedMobileLeague) {
  return db.seasonTeam.findMany({
    where: { seasonId: league.season.id, status: 'REGISTERED' },
  })
}

function seasonTeamMapByTeamId(
  seasonTeams: Awaited<ReturnType<typeof loadSeasonTeams>>,
) {
  return new Map(seasonTeams.map((st) => [st.teamId, st]))
}

function statusFilter(status: MobileMatchesQuery['status']) {
  if (status === 'upcoming') {
    return { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.HALFTIME] as MatchStatus[] }
  }
  if (status === 'results') return MatchStatus.FINISHED
  return undefined
}

export async function listMobileMatches(
  league: ResolvedMobileLeague,
  query: MobileMatchesQuery,
): Promise<MobilePaginated<MobileMatchSummary>> {
  const cursor = query.cursor ? decodeMatchCursor(query.cursor) : null
  const status = statusFilter(query.status)

  const matches = await db.match.findMany({
    where: {
      seasonId: league.season.id,
      matchType: MatchType.LEAGUE,
      ...(status ? { status } : {}),
      ...(cursor
        ? {
            OR: [
              { scheduledAt: { gt: cursor.scheduledAt } },
              { scheduledAt: cursor.scheduledAt, id: { gt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    take: query.limit + 1,
    select: matchSelect,
  })

  const seasonTeams = await loadSeasonTeams(league)
  const byTeamId = seasonTeamMapByTeamId(seasonTeams)
  const page = matches.slice(0, query.limit)
  const hasMore = matches.length > query.limit
  const last = page.at(-1)

  const items = page.flatMap((match) => {
    if (!match.homeTeamId || !match.awayTeamId) return []
    const home = byTeamId.get(match.homeTeamId)
    const away = byTeamId.get(match.awayTeamId)
    if (!home || !away) return []
    return [serializeMobileMatchSummary(league.config.slug, match, home, away)]
  })

  return {
    items,
    nextCursor: hasMore && last ? encodeMatchCursor(last.scheduledAt, last.id) : null,
  }
}

export async function getMobileMatch(
  league: ResolvedMobileLeague,
  matchId: string,
): Promise<MobileMatchDetail | null> {
  const match = await db.match.findFirst({
    where: {
      id: matchId,
      seasonId: league.season.id,
      matchType: MatchType.LEAGUE,
    },
    select: matchSelect,
  })
  if (!match?.homeTeamId || !match.awayTeamId) return null

  const seasonTeams = await loadSeasonTeams(league)
  const byTeamId = seasonTeamMapByTeamId(seasonTeams)
  const home = byTeamId.get(match.homeTeamId)
  const away = byTeamId.get(match.awayTeamId)
  if (!home || !away) return null

  return serializeMobileMatchDetail(league.config.slug, match, home, away)
}

export async function listFinishedLeagueMatches(league: ResolvedMobileLeague) {
  return db.match.findMany({
    where: {
      seasonId: league.season.id,
      matchType: MatchType.LEAGUE,
      status: MatchStatus.FINISHED,
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      homeTeam: { select: { id: true, name: true, color: true } },
      awayTeam: { select: { id: true, name: true, color: true } },
    },
  })
}

export async function listRecentAndUpcomingMatches(league: ResolvedMobileLeague) {
  const seasonTeams = await loadSeasonTeams(league)
  const byTeamId = seasonTeamMapByTeamId(seasonTeams)

  const [upcoming, recent] = await Promise.all([
    db.match.findMany({
      where: {
        seasonId: league.season.id,
        matchType: MatchType.LEAGUE,
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.HALFTIME] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      select: matchSelect,
    }),
    db.match.findMany({
      where: {
        seasonId: league.season.id,
        matchType: MatchType.LEAGUE,
        status: MatchStatus.FINISHED,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 5,
      select: matchSelect,
    }),
  ])

  function mapRows(rows: typeof upcoming) {
    return rows.flatMap((match) => {
      if (!match.homeTeamId || !match.awayTeamId) return []
      const home = byTeamId.get(match.homeTeamId)
      const away = byTeamId.get(match.awayTeamId)
      if (!home || !away) return []
      return [serializeMobileMatchSummary(league.config.slug, match, home, away)]
    })
  }

  return { upcoming: mapRows(upcoming), recent: mapRows(recent) }
}
