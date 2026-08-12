import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { serializeMobileLeagueConfig } from '@/lib/mobile/serializers'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  return withPublishedLeague(slug, (league) =>
    Promise.resolve(serializeMobileLeagueConfig(league.config, league.season)),
  )
}
