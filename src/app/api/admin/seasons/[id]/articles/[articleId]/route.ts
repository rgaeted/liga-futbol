import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { deleteArticle, updateArticle } from '@/lib/editorial/articles'
import { bestEffortDeleteEditorialObjects } from '@/lib/editorial/storage'
import { mapPrismaError } from '@/lib/prisma-errors'
import { updateArticleSchema } from '@/lib/validations/editorial'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; articleId: string }> },
) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId, articleId } = await params
    const parsed = updateArticleSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const article = await updateArticle(seasonId, articleId, parsed.data)
    if (!article) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ article })
  } catch (error) {
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
    await requireRole([Role.ADMIN])
    const { id: seasonId, articleId } = await params
    const removed = await deleteArticle(seasonId, articleId)
    if (!removed) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }

    if (removed.coverStoragePath) {
      await bestEffortDeleteEditorialObjects([removed.coverStoragePath])
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
