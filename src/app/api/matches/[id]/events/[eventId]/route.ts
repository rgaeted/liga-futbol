import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateMatchEventSchema } from '@/lib/validations/match-event'
import { reconcileMatchState } from '@/lib/match-reconcile'
import { Role } from '@prisma/client'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id: matchId, eventId } = await params

  const existing = await db.matchEvent.findFirst({
    where: { id: eventId, matchId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  }

  const parsed = updateMatchEventSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const event = await db.matchEvent.update({
    where: { id: eventId },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.minute !== undefined ? { minute: data.minute } : {}),
      ...(data.playerId !== undefined ? { playerId: data.playerId } : {}),
      ...(data.teamId !== undefined ? { teamId: data.teamId } : {}),
      ...(data.friendlyPlayerId !== undefined ? { friendlyPlayerId: data.friendlyPlayerId } : {}),
      ...(data.side !== undefined ? { side: data.side } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
    include: {
      player: { include: { user: { select: { name: true } } } },
      friendlyPlayer: { select: { firstName: true, lastName: true } },
    },
  })

  const affectedPlayerIds = [existing.playerId, event.playerId].filter(
    (id): id is string => Boolean(id)
  )

  const match = await reconcileMatchState(matchId, affectedPlayerIds)

  return NextResponse.json({ event, match })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  await requireRole([Role.ADMIN])
  const { id: matchId, eventId } = await params

  const existing = await db.matchEvent.findFirst({
    where: { id: eventId, matchId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  }

  await db.matchEvent.delete({ where: { id: eventId } })

  const affectedPlayerIds = existing.playerId ? [existing.playerId] : []
  const match = await reconcileMatchState(matchId, affectedPlayerIds)

  return NextResponse.json({ ok: true, match })
}
