import { NextResponse } from 'next/server'
import { getMobileMatch } from '@/lib/mobile/matches'
import { withPublishedLeague } from '@/lib/mobile/route-handler'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; matchId: string }> },
) {
  const { slug, matchId } = await params
  return withPublishedLeague(slug, async (league) => {
    const match = await getMobileMatch(league, matchId)
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }
    return match
  })
}
