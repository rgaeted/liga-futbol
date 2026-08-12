import type { MobileLiveSnapshot } from '@liga/mobile-contracts'
import { getLiveMatchSnapshot } from '@/lib/live-match-snapshot'
import type { ResolvedMobileLeague } from '@/lib/mobile/league-context'
import { assertLeagueMatch } from '@/lib/mobile/league-context'
import { serializeMobileTeamRef } from '@/lib/mobile/serializers'
import { db } from '@/lib/db'

export async function getMobileLiveSnapshot(
  league: ResolvedMobileLeague,
  matchId: string,
): Promise<MobileLiveSnapshot | null> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      seasonId: true,
      matchType: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  })
  if (!match) return null

  assertLeagueMatch(match, league)

  const snapshot = await getLiveMatchSnapshot(matchId)
  if (!snapshot) return null

  const seasonTeams = await db.seasonTeam.findMany({
    where: { seasonId: league.season.id, status: 'REGISTERED' },
  })
  const byTeamId = new Map(seasonTeams.map((st) => [st.teamId, st]))
  const home = match.homeTeamId ? byTeamId.get(match.homeTeamId) : null
  const away = match.awayTeamId ? byTeamId.get(match.awayTeamId) : null
  if (!home || !away) return null

  return {
    id: snapshot.id,
    status: snapshot.status as MobileLiveSnapshot['status'],
    home: serializeMobileTeamRef(league.config.slug, home),
    away: serializeMobileTeamRef(league.config.slug, away),
    homeScore: snapshot.homeScore,
    awayScore: snapshot.awayScore,
    clock: {
      status: snapshot.status as MobileLiveSnapshot['status'],
      clockStartedAt: snapshot.clock.clockStartedAt,
      secondHalfStartedAt: snapshot.clock.secondHalfStartedAt,
      halftimeAt: snapshot.clock.halftimeAt,
    },
    events: snapshot.events.map((event) => ({
      id: event.id,
      type: event.type,
      minute: event.minute,
      createdAt: event.createdAt,
      playerName: event.playerName,
      assistName: event.assistName,
      description: event.description,
      teamName: event.teamName,
      teamCrestUrl: event.teamCrestSrc,
      teamColor: event.teamColor,
    })),
    venue: snapshot.venue,
    locationLabel: snapshot.locationLabel,
    weather: snapshot.weather,
  }
}
