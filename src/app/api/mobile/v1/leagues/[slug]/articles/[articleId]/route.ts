import { NextResponse } from 'next/server'
import { getPublishedArticle } from '@/lib/editorial/public-queries'
import { withPublishedLeague } from '@/lib/mobile/route-handler'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; articleId: string }> },
) {
  const { slug, articleId } = await params
  return withPublishedLeague(slug, async (league) => {
    const article = await getPublishedArticle(league, articleId)
    if (!article) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }
    return article
  })
}
