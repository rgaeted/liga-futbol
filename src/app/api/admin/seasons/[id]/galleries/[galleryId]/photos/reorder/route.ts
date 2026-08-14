import { NextResponse } from 'next/server'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { reorderGalleryPhotos } from '@/lib/editorial/gallery-photos'
import { mapPrismaError } from '@/lib/prisma-errors'
import { reorderGalleryPhotosSchema } from '@/lib/validations/editorial'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; galleryId: string }> },
) {
  try {
    const { id: seasonId, galleryId } = await params
    await requireAdminSeason(seasonId)
    const parsed = reorderGalleryPhotosSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const result = await reorderGalleryPhotos(galleryId, seasonId, parsed.data.photoIds)
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Orden de fotos inválido' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const mappedSeason = mapAdminSeasonRouteError(error)
    if (mappedSeason) {
      return NextResponse.json({ error: mappedSeason.message }, { status: mappedSeason.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
