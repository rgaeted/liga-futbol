import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateMatchSchema } from '@/lib/validations/match'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { scheduledAt, ...rest } = parsed.data
  const match = await db.match.update({
    where: { id },
    data: {
      ...rest,
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
    },
    include: { homeTeam: true, awayTeam: true },
  })
  return NextResponse.json(match)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  await db.$transaction([
    db.matchEvent.deleteMany({ where: { matchId: id } }),
    db.callUp.deleteMany({ where: { matchId: id } }),
    db.playerEvaluation.deleteMany({ where: { matchId: id } }),
    db.match.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
