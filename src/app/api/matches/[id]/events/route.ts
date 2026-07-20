import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createMatchEventSchema } from '@/lib/validations/match-event'
import { registerMatchEvent } from '@/lib/match-events'
import { EventType, MatchType, Role } from '@prisma/client'

const PLAYER_EVENT_TYPES: EventType[] = [
  EventType.GOAL,
  EventType.OWN_GOAL,
  EventType.YELLOW_CARD,
  EventType.RED_CARD,
  EventType.SHOT_ON_TARGET,
  EventType.SHOT_OFF_TARGET,
  EventType.SUBSTITUTION,
]

function eventNeedsPlayer(type: EventType) {
  return PLAYER_EVENT_TYPES.includes(type)
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const events = await db.matchEvent.findMany({
    where: { matchId: id },
    include: {
      player: { include: { user: { select: { name: true } } } },
      friendlyPlayer: { select: { firstName: true, lastName: true } },
    },
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

  const data = parsed.data

  if (match.matchType === MatchType.FRIENDLY) {
    if (eventNeedsPlayer(data.type) && (!data.friendlyPlayerId || !data.side)) {
      return NextResponse.json(
        { error: 'Los eventos con jugador en partidos amistosos requieren friendlyPlayerId y side' },
        { status: 400 },
      )
    }
  } else if (data.friendlyPlayerId) {
    return NextResponse.json(
      { error: 'friendlyPlayerId no aplica en partidos de liga' },
      { status: 400 },
    )
  }

  const result = await registerMatchEvent(matchId, data)
  return NextResponse.json(result, { status: 201 })
}
