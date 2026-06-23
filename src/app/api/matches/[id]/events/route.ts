import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createMatchEventSchema } from '@/lib/validations/match-event'
import { registerMatchEvent } from '@/lib/match-events'
import { Role } from '@prisma/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const events = await db.matchEvent.findMany({
    where: { matchId: id },
    include: { player: { include: { user: { select: { name: true } } } } },
    orderBy: { minute: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole([Role.REFEREE, Role.ADMIN])
  const { id: matchId } = await params

  const match = await db.match.findUniqueOrThrow({ where: { id: matchId } })

  if (session.user.role === Role.REFEREE && match.refereeId !== session.user.id) {
    return NextResponse.json({ error: 'Not assigned referee' }, { status: 403 })
  }

  const parsed = createMatchEventSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const result = await registerMatchEvent(matchId, parsed.data)
  return NextResponse.json(result, { status: 201 })
}
