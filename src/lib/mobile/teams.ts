import type {
  MobilePlayerDetail,
  MobileTeamDetail,
  MobileTeamListItem,
} from '@liga/mobile-contracts'
import { MatchStatus, MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import type { ResolvedMobileLeague } from '@/lib/mobile/league-context'
import { listRecentAndUpcomingMatches } from '@/lib/mobile/matches'
import { aggregateSeasonPlayerStats, type RosterRow } from '@/lib/mobile/season-stats'
import { serializeMobileTeamRef } from '@/lib/mobile/serializers'

export async function listMobileTeams(league: ResolvedMobileLeague): Promise<MobileTeamListItem[]> {
  const seasonTeams = await db.seasonTeam.findMany({
    where: { seasonId: league.season.id, status: 'REGISTERED' },
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
  })

  const nextMatches = await db.match.findMany({
    where: {
      seasonId: league.season.id,
      matchType: MatchType.LEAGUE,
      status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.HALFTIME] },
    },
    orderBy: { scheduledAt: 'asc' },
    select: { scheduledAt: true, homeTeamId: true, awayTeamId: true },
  })

  const nextByTeamId = new Map<string, Date>()
  for (const match of nextMatches) {
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (!teamId || nextByTeamId.has(teamId)) continue
      nextByTeamId.set(teamId, match.scheduledAt)
    }
  }

  return seasonTeams.map((st) => ({
    ...serializeMobileTeamRef(league.config.slug, st),
    nextMatchAt: nextByTeamId.get(st.teamId)?.toISOString() ?? null,
  }))
}

async function buildRosterStats(league: ResolvedMobileLeague, seasonTeamId: string) {
  const rosterEntries = await db.seasonRosterEntry.findMany({
    where: { seasonTeamId, status: 'ACTIVE' },
    include: { player: { include: { user: { select: { name: true } } } }, seasonTeam: true },
  })

  const roster: RosterRow[] = rosterEntries.map((entry) => ({
    rosterEntryId: entry.id,
    playerId: entry.playerId,
    playerName: entry.player.user.name,
    teamName: entry.seasonTeam.displayName,
    jerseyNumber: entry.jerseyNumber,
    position: entry.position,
  }))

  const [events, mvps] = await Promise.all([
    db.matchEvent.findMany({
      where: { match: { seasonId: league.season.id, matchType: MatchType.LEAGUE } },
      select: {
        type: true,
        playerId: true,
        assistPlayerId: true,
        match: { select: { seasonId: true } },
      },
    }),
    db.matchTeamMvp.findMany({
      where: { match: { seasonId: league.season.id, matchType: MatchType.LEAGUE } },
      select: { playerId: true, match: { select: { seasonId: true } } },
    }),
  ])

  const stats = aggregateSeasonPlayerStats(events, mvps, roster, league.season.id)
  const statsByRosterId = new Map<string, (typeof stats.scorers)[number]['stats']>()
  for (const bucket of [stats.scorers, stats.assists, stats.yellowCards, stats.redCards, stats.mvps]) {
    for (const row of bucket) {
      statsByRosterId.set(row.rosterEntryId, row.stats)
    }
  }

  return rosterEntries.map((entry) => ({
    rosterEntryId: entry.id,
    playerId: entry.playerId,
    name: entry.player.user.name,
    jerseyNumber: entry.jerseyNumber,
    position: entry.position,
    stats: statsByRosterId.get(entry.id) ?? {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      mvpCount: 0,
    },
  }))
}

export async function getMobileTeam(
  league: ResolvedMobileLeague,
  seasonTeamId: string,
): Promise<MobileTeamDetail | null> {
  const seasonTeam = await db.seasonTeam.findFirst({
    where: { id: seasonTeamId, seasonId: league.season.id, status: 'REGISTERED' },
  })
  if (!seasonTeam) return null

  const roster = await buildRosterStats(league, seasonTeamId)
  const { upcoming, recent } = await listRecentAndUpcomingMatches(league)
  const teamId = seasonTeam.teamId

  return {
    ...serializeMobileTeamRef(league.config.slug, seasonTeam),
    roster,
    upcomingMatches: upcoming.filter(
      (m) => m.home.teamId === teamId || m.away.teamId === teamId,
    ),
    recentResults: recent.filter(
      (m) => m.home.teamId === teamId || m.away.teamId === teamId,
    ),
  }
}

export async function getMobilePlayer(
  league: ResolvedMobileLeague,
  rosterEntryId: string,
): Promise<MobilePlayerDetail | null> {
  const entry = await db.seasonRosterEntry.findFirst({
    where: {
      id: rosterEntryId,
      seasonTeam: { seasonId: league.season.id },
    },
    include: {
      player: { include: { user: { select: { name: true } } } },
      seasonTeam: true,
    },
  })
  if (!entry) return null

  const roster: RosterRow[] = [
    {
      rosterEntryId: entry.id,
      playerId: entry.playerId,
      playerName: entry.player.user.name,
      teamName: entry.seasonTeam.displayName,
      jerseyNumber: entry.jerseyNumber,
      position: entry.position,
    },
  ]

  const [events, mvps] = await Promise.all([
    db.matchEvent.findMany({
      where: { match: { seasonId: league.season.id, matchType: MatchType.LEAGUE } },
      select: {
        type: true,
        playerId: true,
        assistPlayerId: true,
        match: { select: { seasonId: true } },
      },
    }),
    db.matchTeamMvp.findMany({
      where: { match: { seasonId: league.season.id, matchType: MatchType.LEAGUE } },
      select: { playerId: true, match: { select: { seasonId: true } } },
    }),
  ])

  const aggregated = aggregateSeasonPlayerStats(events, mvps, roster, league.season.id)
  const stats =
    aggregated.scorers.find((r) => r.rosterEntryId === entry.id)?.stats ??
    aggregated.assists.find((r) => r.rosterEntryId === entry.id)?.stats ?? {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      mvpCount: 0,
    }

  return {
    rosterEntryId: entry.id,
    playerId: entry.playerId,
    name: entry.player.user.name,
    teamName: entry.seasonTeam.displayName,
    seasonTeamId: entry.seasonTeamId,
    jerseyNumber: entry.jerseyNumber,
    position: entry.position,
    stats,
  }
}
