import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { editorialImageExtension, validateEditorialImage } from '@/lib/editorial/image'
import {
  bestEffortDeleteEditorialObjects,
  editorialStoragePath,
  uploadEditorialObject,
} from '@/lib/editorial/storage'
import { sponsorLogoStoragePath } from '@/lib/editorial/sponsors'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; sponsorId: string }> },
) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId, sponsorId } = await params

    const sponsor = await db.sponsor.findFirst({
      where: { id: sponsorId, seasonId },
    })
    if (!sponsor) {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 })
    }

    const form = await req.formData()
    const file = form.get('logo')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Debes enviar un archivo logo' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const validation = validateEditorialImage(buffer, mimeType)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const ext = editorialImageExtension(mimeType)
    const storagePath = editorialStoragePath(
      sponsorLogoStoragePath(seasonId, sponsorId, ext).split('/'),
    )
    const previousPath = sponsor.logoStoragePath

    await uploadEditorialObject(storagePath, buffer, mimeType)
    await db.sponsor.update({
      where: { id: sponsorId },
      data: { logoStoragePath: storagePath, logoMimeType: mimeType },
    })

    if (previousPath && previousPath !== storagePath) {
      await bestEffortDeleteEditorialObjects([previousPath])
    }

    return NextResponse.json({ ok: true, storagePath })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sponsorId: string }> },
) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId, sponsorId } = await params
    const sponsor = await db.sponsor.findFirst({
      where: { id: sponsorId, seasonId },
    })
    if (!sponsor) {
      return NextResponse.json({ error: 'Patrocinador no encontrado' }, { status: 404 })
    }

    const previousPath = sponsor.logoStoragePath
    await db.sponsor.update({
      where: { id: sponsorId },
      data: { logoStoragePath: null, logoMimeType: null },
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
