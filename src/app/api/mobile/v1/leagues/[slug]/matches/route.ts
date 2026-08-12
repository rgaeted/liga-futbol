import { NextResponse } from 'next/server'
import { listMobileMatches } from '@/lib/mobile/matches'
import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { parseMobileMatchesQuery } from '@/lib/validations/mobile-query'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const parsed = parseMobileMatchesQuery(new URL(request.url).searchParams)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros de consulta inválidos' }, { status: 400 })
  }

  return withPublishedLeague(slug, (league) => listMobileMatches(league, parsed.data))
}
