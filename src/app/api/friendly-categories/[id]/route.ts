import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateFriendlyCategorySchema } from '@/lib/validations/friendly-category'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateFriendlyCategorySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await db.friendlyCategory.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }

  const category = await db.friendlyCategory.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  })
  return NextResponse.json(category)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const existing = await db.friendlyCategory.findUnique({
    where: { id },
    include: { _count: { select: { players: true, matches: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }
  if (existing._count.players > 0 || existing._count.matches > 0) {
    return NextResponse.json(
      {
        error:
          'No se puede eliminar: la categoría tiene jugadores o partidos. Desactívala en su lugar.',
      },
      { status: 400 }
    )
  }

  await db.friendlyCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
