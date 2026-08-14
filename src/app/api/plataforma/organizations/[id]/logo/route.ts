import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { editorialImageExtension, validateEditorialImage } from '@/lib/editorial/image'
import {
  bestEffortDeleteEditorialObjects,
  editorialStoragePath,
  uploadEditorialObject,
} from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'

function organizationLogoStoragePath(orgId: string, ext: string) {
  return editorialStoragePath(['orgs', orgId, `logo.${ext}`])
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlatformAdmin()
    const { id } = await params

    const organization = await db.organization.findUnique({ where: { id } })
    if (!organization) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
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
    const storagePath = organizationLogoStoragePath(id, ext)
    const previousPath = organization.logoStoragePath

    await uploadEditorialObject(storagePath, buffer, mimeType)
    await db.organization.update({
      where: { id },
      data: { logoStoragePath: storagePath },
    })

    if (previousPath && previousPath !== storagePath) {
      await bestEffortDeleteEditorialObjects([previousPath])
    }

    return NextResponse.json({ ok: true, logoStoragePath: storagePath })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
