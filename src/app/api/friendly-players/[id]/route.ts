import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import { Role } from '@prisma/client'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateFriendlyPlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const player = await db.friendlyPlayer.update({
    where: { id },
    data: parsed.data,
    include: { user: { select: { id: true, email: true } } },
  })
  return NextResponse.json(player)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const participationCount = await db.friendlyMatchPlayer.count({
    where: { friendlyPlayerId: id },
  })
  if (participationCount > 0) {
    return NextResponse.json(
      {
        error: `El jugador tiene ${participationCount} participación(es) en amistosos. No se puede eliminar.`,
      },
      { status: 400 }
    )
  }

  await db.friendlyPlayer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}