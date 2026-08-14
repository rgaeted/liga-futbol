import { NextResponse } from 'next/server'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { deleteGallery, updateGallery } from '@/lib/editorial/galleries'
import { bestEffortDeleteEditorialObjects } from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'
import { updateGallerySchema } from '@/lib/validations/editorial'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; galleryId: string }> },
) {
  try {
    const { id: seasonId, galleryId } = await params
    await requireAdminSeason(seasonId)
    const parsed = updateGallerySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const gallery = await updateGallery(seasonId, galleryId, parsed.data)
    if (!gallery) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ gallery })
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; galleryId: string }> },
) {
  try {
    const { id: seasonId, galleryId } = await params
    await requireAdminSeason(seasonId)
    const removed = await deleteGallery(seasonId, galleryId)
    if (!removed) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }

    await bestEffortDeleteEditorialObjects(removed.storagePaths)
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
