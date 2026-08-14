import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { editorialImageExtension, validateEditorialImage } from '@/lib/editorial/image'
import {
  bestEffortDeleteEditorialObjects,
  editorialStoragePath,
  uploadEditorialObject,
} from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'

function refereePhotoStoragePath(userId: string, ext: string) {
  return editorialStoragePath(['referees', userId, `photo.${ext}`])
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { userId } = await params

    const membership = await db.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    })
    if (!membership || membership.role !== MembershipRole.REFEREE) {
      return NextResponse.json({ error: 'Árbitro no encontrado' }, { status: 404 })
    }

    const form = await req.formData()
    const file = form.get('photo')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Debes enviar un archivo photo' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const validation = validateEditorialImage(buffer, mimeType)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const ext = editorialImageExtension(mimeType)
    const storagePath = refereePhotoStoragePath(userId, ext)

    const profile = await db.refereeProfile.findUnique({
      where: { userId },
      select: { photoStoragePath: true },
    })
    const previousPath = profile?.photoStoragePath

    await uploadEditorialObject(storagePath, buffer, mimeType)
    await db.refereeProfile.upsert({
      where: { userId },
      create: { userId, photoStoragePath: storagePath },
      update: { photoStoragePath: storagePath },
    })

    if (previousPath && previousPath !== storagePath) {
      await bestEffortDeleteEditorialObjects([previousPath])
    }

    return NextResponse.json({ ok: true, photoStoragePath: storagePath })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
