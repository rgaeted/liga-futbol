import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateFriendlyPaidSchema } from '@/lib/validations/match'
import { Role } from '@prisma/client'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; participationId: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id: matchId, participationId } = await params
  const parsed = updateFriendlyPaidSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const participation = await db.friendlyMatchPlayer.findFirst({
    where: { id: participationId, matchId },
  })
  if (!participation) {
    return NextResponse.json({ error: 'Participación no encontrada' }, { status: 404 })
  }

  const updated = await db.friendlyMatchPlayer.update({
    where: { id: participationId },
    data: { paid: parsed.data.paid },
    include: { friendlyPlayer: true },
  })
  return NextResponse.json(updated)
}