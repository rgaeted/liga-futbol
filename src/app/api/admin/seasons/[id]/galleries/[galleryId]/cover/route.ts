import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { galleryCoverStoragePath } from '@/lib/editorial/galleries'
import { editorialImageExtension, validateEditorialImage } from '@/lib/editorial/image'
import {
  bestEffortDeleteEditorialObjects,
  editorialStoragePath,
  uploadEditorialObject,
} from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; galleryId: string }> },
) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId, galleryId } = await params

    const gallery = await db.gallery.findFirst({
      where: { id: galleryId, seasonId },
    })
    if (!gallery) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }

    const form = await req.formData()
    const file = form.get('cover')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Debes enviar un archivo cover' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const validation = validateEditorialImage(buffer, mimeType)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const ext = editorialImageExtension(mimeType)
    const storagePath = editorialStoragePath(
      galleryCoverStoragePath(seasonId, galleryId, ext).split('/'),
    )
    const previousPath = gallery.coverStoragePath

    await uploadEditorialObject(storagePath, buffer, mimeType)
    await db.gallery.update({
      where: { id: galleryId },
      data: { coverStoragePath: storagePath, coverMimeType: mimeType },
    })

    if (previousPath && previousPath !== storagePath) {
      await bestEffortDeleteEditorialObjects([previousPath])
    }

    return NextResponse.json({ ok: true, coverStoragePath: storagePath })
  } catch (error) {
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
    await requireRole([Role.ADMIN])
    const { id: seasonId, galleryId } = await params

    const gallery = await db.gallery.findFirst({
      where: { id: galleryId, seasonId },
    })
    if (!gallery) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }

    const previousPath = gallery.coverStoragePath
    await db.gallery.update({
      where: { id: galleryId },
      data: { coverStoragePath: null, coverMimeType: null },
    })

    if (previousPath) {
      await bestEffortDeleteEditorialObjects([previousPath])
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
