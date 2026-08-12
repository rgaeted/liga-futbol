import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolvePublishedLeagueBySlug } from '@/lib/mobile/league-context'
import { teamHasCrest } from '@/lib/team-crest'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; seasonTeamId: string }> },
) {
  const { slug, seasonTeamId } = await params
  const league = await resolvePublishedLeagueBySlug(slug)
  if (!league) {
    return NextResponse.json({ error: 'Edición no encontrada' }, { status: 404 })
  }

  const seasonTeam = await db.seasonTeam.findFirst({
    where: { id: seasonTeamId, seasonId: league.season.id, status: 'REGISTERED' },
    select: { crestMimeType: true, crestData: true },
  })
  if (!seasonTeam || !teamHasCrest(seasonTeam)) {
    return NextResponse.json({ error: 'Escudo no encontrado' }, { status: 404 })
  }

  return new Response(seasonTeam.crestData, {
    headers: {
      'Content-Type': seasonTeam.crestMimeType!,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
