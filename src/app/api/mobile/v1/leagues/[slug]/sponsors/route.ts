import { SponsorPlacement } from '@prisma/client'
import { listPublishedSponsors } from '@/lib/editorial/public-queries'
import { withPublishedLeague } from '@/lib/mobile/route-handler'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const placementParam = new URL(request.url).searchParams.get('placement')
  const placement =
    placementParam && placementParam in SponsorPlacement
      ? (placementParam as SponsorPlacement)
      : undefined

  return withPublishedLeague(slug, (league) => listPublishedSponsors(league, placement))
}
