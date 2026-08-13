import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { createArticle, listAdminArticles } from '@/lib/editorial/articles'
import { mapPrismaError } from '@/lib/prisma-errors'
import { createArticleSchema } from '@/lib/validations/editorial'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([Role.ADMIN])
    const { id: seasonId } = await params
    const articles = await listAdminArticles(seasonId)
    return NextResponse.json({ articles })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole([Role.ADMIN])
    const { id: seasonId } = await params
    const parsed = createArticleSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const article = await createArticle(seasonId, session.user.id!, parsed.data)
    return NextResponse.json({ article }, { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
}
