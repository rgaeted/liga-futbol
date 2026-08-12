import { NextResponse } from 'next/server'
import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { getMobilePlayer } from '@/lib/mobile/teams'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; rosterEntryId: string }> },
) {
  const { slug, rosterEntryId } = await params
  return withPublishedLeague(slug, async (league) => {
    const player = await getMobilePlayer(league, rosterEntryId)
    if (!player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }
    return player
  })
}
