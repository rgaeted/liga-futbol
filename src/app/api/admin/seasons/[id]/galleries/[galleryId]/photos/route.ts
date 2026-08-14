import { NextResponse } from 'next/server'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import {
  addGalleryPhoto,
  galleryPhotoStoragePath,
  listGalleryPhotos,
  newGalleryPhotoId,
} from '@/lib/editorial/gallery-photos'
import { editorialImageExtension, validateEditorialImage } from '@/lib/editorial/image'
import { editorialStoragePath, uploadEditorialObject } from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'
import { createGalleryPhotoSchema } from '@/lib/validations/editorial'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; galleryId: string }> },
) {
  try {
    const { id: seasonId, galleryId } = await params
    await requireAdminSeason(seasonId)
    const photos = await listGalleryPhotos(galleryId, seasonId)
    if (!photos) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ photos })
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; galleryId: string }> },
) {
  try {
    const { id: seasonId, galleryId } = await params
    await requireAdminSeason(seasonId)
    const form = await req.formData()
    const file = form.get('photo')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Debes enviar un archivo photo' }, { status: 400 })
    }

    const altText = form.get('altText')
    const caption = form.get('caption')
    const parsed = createGalleryPhotoSchema.safeParse({
      altText: typeof altText === 'string' ? altText : undefined,
      caption: typeof caption === 'string' ? caption : undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const validation = validateEditorialImage(buffer, mimeType)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const photoId = newGalleryPhotoId()
    const ext = editorialImageExtension(mimeType)
    const storagePath = editorialStoragePath(
      galleryPhotoStoragePath(seasonId, galleryId, photoId, ext).split('/'),
    )

    await uploadEditorialObject(storagePath, buffer, mimeType)
    const photo = await addGalleryPhoto(galleryId, seasonId, parsed.data, storagePath, mimeType)
    if (!photo) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ photo }, { status: 201 })
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
