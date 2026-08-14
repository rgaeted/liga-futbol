import { NextResponse } from 'next/server'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { db } from '@/lib/db'
import { editorialImageExtension, validateEditorialImage } from '@/lib/editorial/image'
import {
  bestEffortDeleteEditorialObjects,
  editorialStoragePath,
  uploadEditorialObject,
} from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'

function mobileLogoStoragePath(seasonId: string, ext: string) {
  return `seasons/${seasonId}/mobile/logo.${ext}`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: seasonId } = await params
    await requireAdminSeason(seasonId)

    const config = await db.seasonMobileConfig.findUnique({ where: { seasonId } })
    if (!config) {
      return NextResponse.json({ error: 'Configuración móvil no encontrada' }, { status: 404 })
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
    const storagePath = editorialStoragePath(mobileLogoStoragePath(seasonId, ext).split('/'))
    const previousPath = config.logoStoragePath

    await uploadEditorialObject(storagePath, buffer, mimeType)
    await db.seasonMobileConfig.update({
      where: { seasonId },
      data: { logoStoragePath: storagePath },
    })

    if (previousPath && previousPath !== storagePath) {
      await bestEffortDeleteEditorialObjects([previousPath])
    }

    return NextResponse.json({ ok: true, logoStoragePath: storagePath })
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: seasonId } = await params
    await requireAdminSeason(seasonId)

    const config = await db.seasonMobileConfig.findUnique({ where: { seasonId } })
    if (!config) {
      return NextResponse.json({ error: 'Configuración móvil no encontrada' }, { status: 404 })
    }

    const previousPath = config.logoStoragePath
    await db.seasonMobileConfig.update({
      where: { seasonId },
      data: { logoStoragePath: null },
    })

    if (previousPath) {
      await bestEffortDeleteEditorialObjects([previousPath])
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
