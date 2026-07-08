import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateUserSchema } from '@/lib/validations/user'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { password, ...rest } = parsed.data
  const user = await db.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole([Role.ADMIN])
  const { id } = await params

  if (session.user.id === id) {
    return NextResponse.json({ error: 'No podés eliminar tu propio usuario' }, { status: 409 })
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { player: { select: { id: true } } },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  if (user.player) {
    return NextResponse.json(
      { error: 'Es un jugador: eliminalo desde la sección Jugadores' },
      { status: 409 }
    )
  }

  // Desvincular relaciones antes de borrar (sin onDelete cascade en el schema)
  await db.$transaction([
    db.team.updateMany({ where: { coachId: id }, data: { coachId: null } }),
    db.match.updateMany({ where: { refereeId: id }, data: { refereeId: null } }),
    db.user.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
