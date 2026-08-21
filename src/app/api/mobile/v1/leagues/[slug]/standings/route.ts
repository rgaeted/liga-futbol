import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { listFinishedLeagueMatches } from '@/lib/mobile/matches'
import { buildMobileStandingsResponse } from '@/lib/mobile/standings'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function mapCrestUrl(slug: string, seasonTeamId: string, crestMimeType: string | null) {
  return crestMimeType ? `/api/mobile/v1/leagues/${slug}/teams/${seasonTeamId}/crest` : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  return withPublishedLeague(slug, async (league) => {
    const [matches, seasonCategories, seasonTeams] = await Promise.all([
      listFinishedLeagueMatches(league),
      db.seasonCategory.findMany({
        where: { seasonId: league.season.id },
        orderBy: { sortOrder: 'asc' },
        include: { category: { select: { id: true, name: true } } },
      }),
      db.seasonTeam.findMany({
        where: { seasonId: league.season.id, status: 'REGISTERED' },
        select: {
          id: true,
          teamId: true,
          seasonCategoryId: true,
          displayName: true,
          color: true,
          crestMimeType: true,
        },
      }),
    ])

    const crestBySeasonTeamId = new Map(seasonTeams.map((st) => [st.id, st.crestMimeType]))

    const response = buildMobileStandingsResponse({
      categories: seasonCategories.map((sc) => ({
        categoryId: sc.category.id,
        name: sc.category.name,
        seasonCategoryId: sc.id,
      })),
      matches,
      seasonTeams: seasonTeams.map((st) => ({
        seasonTeamId: st.id,
        teamId: st.teamId,
        seasonCategoryId: st.seasonCategoryId,
        displayName: st.displayName,
        color: st.color,
        crestMimeType: st.crestMimeType,
      })),
    })

    const mapRows = (rows: typeof response.rows) =>
      rows.map((row) => ({
        ...row,
        crestUrl: mapCrestUrl(slug, row.seasonTeamId, crestBySeasonTeamId.get(row.seasonTeamId) ?? null),
      }))

    return {
      categories: response.categories.map((category) => ({
        ...category,
        rows: mapRows(category.rows),
      })),
      rows: mapRows(response.rows),
    }
  })
}
