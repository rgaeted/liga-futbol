import { NextResponse } from 'next/server'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { enforceCapability } from '@/lib/billing/enforce'
import { deleteGalleryPhoto, updateGalleryPhoto } from '@/lib/editorial/gallery-photos'
import { bestEffortDeleteEditorialObjects } from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'
import { updateGalleryPhotoSchema } from '@/lib/validations/editorial'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; galleryId: string; photoId: string }> },
) {
  try {
    const { id: seasonId, galleryId, photoId } = await params
    const { organizationId } = await requireAdminSeason(seasonId)
    const gate = await enforceCapability(organizationId, 'MANAGE_LEAGUE_CONTENT')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }
    const parsed = updateGalleryPhotoSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const photo = await updateGalleryPhoto(galleryId, seasonId, photoId, parsed.data)
    if (!photo) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ photo })
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
  { params }: { params: Promise<{ id: string; galleryId: string; photoId: string }> },
) {
  try {
    const { id: seasonId, galleryId, photoId } = await params
    const { organizationId } = await requireAdminSeason(seasonId)
    const gate = await enforceCapability(organizationId, 'MANAGE_LEAGUE_CONTENT')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }
    const removed = await deleteGalleryPhoto(galleryId, seasonId, photoId)
    if (!removed) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }

    await bestEffortDeleteEditorialObjects([removed.storagePath])
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
