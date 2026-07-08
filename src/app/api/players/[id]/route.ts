import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updatePlayerSchema } from '@/lib/validations/player'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updatePlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const player = await db.player.update({
    where: { id },
    data: parsed.data,
    include: { user: { select: { name: true, email: true } }, team: true },
  })
  return NextResponse.json(player)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const player = await db.player.findUnique({ where: { id } })
  if (!player) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }

  await db.$transaction([
    db.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: null } }),
    db.callUp.deleteMany({ where: { playerId: id } }),
    db.playerEvaluation.deleteMany({ where: { playerId: id } }),
    db.player.delete({ where: { id } }),
    db.user.delete({ where: { id: player.userId } }),
  ])
  return NextResponse.json({ ok: true })
}
