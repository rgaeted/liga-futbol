import { NextResponse } from 'next/server'
import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { getMobileTeam } from '@/lib/mobile/teams'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; seasonTeamId: string }> },
) {
  const { slug, seasonTeamId } = await params
  return withPublishedLeague(slug, async (league) => {
    const team = await getMobileTeam(league, seasonTeamId)
    if (!team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }
    return team
  })
}
