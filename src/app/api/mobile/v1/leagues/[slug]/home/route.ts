import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { getMobileHome } from '@/lib/mobile/home'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  return withPublishedLeague(slug, (league) => getMobileHome(league))
}
