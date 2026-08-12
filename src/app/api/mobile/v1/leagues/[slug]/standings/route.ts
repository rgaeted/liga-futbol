import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { listFinishedLeagueMatches } from '@/lib/mobile/matches'
import { buildMobileStandings } from '@/lib/mobile/standings'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  return withPublishedLeague(slug, async (league) => {
    const matches = await listFinishedLeagueMatches(league)
    const seasonTeams = await db.seasonTeam.findMany({
      where: { seasonId: league.season.id, status: 'REGISTERED' },
      select: { id: true, teamId: true, displayName: true, color: true, crestMimeType: true },
    })
    const seasonTeamByTeamId = new Map(
      seasonTeams.map((st) => [
        st.teamId,
        {
          seasonTeamId: st.id,
          teamId: st.teamId,
          displayName: st.displayName,
          color: st.color,
          crestMimeType: st.crestMimeType,
        },
      ]),
    )
    const rows = buildMobileStandings(matches, seasonTeamByTeamId).map((row) => ({
      ...row,
      crestUrl: row.crestUrl
        ? `/api/mobile/v1/leagues/${slug}/teams/${row.seasonTeamId}/crest`
        : null,
    }))
    return rows
  })
}
