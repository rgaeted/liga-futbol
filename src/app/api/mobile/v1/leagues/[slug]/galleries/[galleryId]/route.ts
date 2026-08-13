import { NextResponse } from 'next/server'
import { getPublishedGallery } from '@/lib/editorial/public-queries'
import { withPublishedLeague } from '@/lib/mobile/route-handler'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; galleryId: string }> },
) {
  const { slug, galleryId } = await params
  return withPublishedLeague(slug, async (league) => {
    const gallery = await getPublishedGallery(league, galleryId)
    if (!gallery) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }
    return gallery
  })
}
