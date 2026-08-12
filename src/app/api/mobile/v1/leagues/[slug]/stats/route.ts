import { MatchType } from '@prisma/client'
import { db } from '@/lib/db'
import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { aggregateSeasonPlayerStats, type RosterRow } from '@/lib/mobile/season-stats'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  return withPublishedLeague(slug, async (league) => {
    const rosterEntries = await db.seasonRosterEntry.findMany({
      where: {
        status: 'ACTIVE',
        seasonTeam: { seasonId: league.season.id, status: 'REGISTERED' },
      },
      include: {
        player: { include: { user: { select: { name: true } } } },
        seasonTeam: { select: { displayName: true } },
      },
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

    return aggregateSeasonPlayerStats(events, mvps, roster, league.season.id)
  })
}
