import { NextResponse } from 'next/server'
import { mapAdminSeasonRouteError, requireAdminSeason } from '@/lib/admin-season-route'
import { db } from '@/lib/db'
import { articleCoverStoragePath } from '@/lib/editorial/articles'
import { editorialImageExtension, validateEditorialImage } from '@/lib/editorial/image'
import {
  bestEffortDeleteEditorialObjects,
  editorialStoragePath,
  uploadEditorialObject,
} from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; articleId: string }> },
) {
  try {
    const { id: seasonId, articleId } = await params
    await requireAdminSeason(seasonId)

    const article = await db.article.findFirst({
      where: { id: articleId, seasonId },
    })
    if (!article) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
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
      articleCoverStoragePath(seasonId, articleId, ext).split('/'),
    )
    const previousPath = article.coverStoragePath

    await uploadEditorialObject(storagePath, buffer, mimeType)
    await db.article.update({
      where: { id: articleId },
      data: { coverStoragePath: storagePath, coverMimeType: mimeType },
    })

    if (previousPath && previousPath !== storagePath) {
      await bestEffortDeleteEditorialObjects([previousPath])
    }

    return NextResponse.json({ ok: true, coverStoragePath: storagePath })
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
  { params }: { params: Promise<{ id: string; articleId: string }> },
) {
  try {
    const { id: seasonId, articleId } = await params
    await requireAdminSeason(seasonId)

    const article = await db.article.findFirst({
      where: { id: articleId, seasonId },
    })
    if (!article) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }

    const previousPath = article.coverStoragePath
    await db.article.update({
      where: { id: articleId },
      data: { coverStoragePath: null, coverMimeType: null },
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
