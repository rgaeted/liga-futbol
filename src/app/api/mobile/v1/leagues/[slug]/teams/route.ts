import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { listMobileTeams } from '@/lib/mobile/teams'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  return withPublishedLeague(slug, (league) => listMobileTeams(league))
}
