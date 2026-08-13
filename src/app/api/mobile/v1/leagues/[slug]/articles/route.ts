import { NextResponse } from 'next/server'
import { listPublishedArticles } from '@/lib/editorial/public-queries'
import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { parseMobileEditorialQuery } from '@/lib/validations/editorial-query'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const parsed = parseMobileEditorialQuery(new URL(request.url).searchParams)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros de consulta inválidos' }, { status: 400 })
  }

  return withPublishedLeague(slug, (league) => listPublishedArticles(league, parsed.data))
}
