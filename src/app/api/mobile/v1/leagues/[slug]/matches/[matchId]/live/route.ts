import { NextResponse } from 'next/server'
import { getMobileLiveSnapshot } from '@/lib/mobile/live'
import { withPublishedLeague } from '@/lib/mobile/route-handler'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; matchId: string }> },
) {
  const { slug, matchId } = await params
  return withPublishedLeague(slug, async (league) => {
    const snapshot = await getMobileLiveSnapshot(league, matchId)
    if (!snapshot) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }
    return snapshot
  })
}
