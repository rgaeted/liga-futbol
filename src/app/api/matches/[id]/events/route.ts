import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createMatchEventSchema } from '@/lib/validations/match-event'
import { GAME_EVENT_TYPES, registerMatchEvent } from '@/lib/match-events'
import { EventType, MatchStatus, MatchType, Role } from '@prisma/client'

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

function isGameEvent(type: EventType) {
  return GAME_EVENT_TYPES.includes(type)
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
    return NextResponse.json({ error: 'No eres el árbitro asignado' }, { status: 403 })
  }

  const parsed = createMatchEventSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const isAdmin = session.user.role === Role.ADMIN

  if (
    session.user.role === Role.REFEREE &&
    isGameEvent(data.type) &&
    match.status !== MatchStatus.LIVE
  ) {
    return NextResponse.json({ error: 'El partido no está en juego' }, { status: 400 })
  }

  if (match.matchType === MatchType.FRIENDLY) {
    if (eventNeedsPlayer(data.type) && (!data.friendlyPlayerId || !data.side)) {
      return NextResponse.json(
        {
          error: 'Los eventos con jugador en partidos amistosos requieren friendlyPlayerId y side',
        },
        { status: 400 }
      )
    }
    if (data.assistPlayerId) {
      return NextResponse.json(
        { error: 'assistPlayerId no aplica en partidos amistosos' },
        { status: 400 }
      )
    }
    if (data.assistFriendlyPlayerId && data.type !== EventType.GOAL) {
      return NextResponse.json(
        { error: 'La asistencia solo aplica en goles' },
        { status: 400 }
      )
    }

    if (data.friendlyPlayerId) {
      const participation = await db.friendlyMatchPlayer.findUnique({
        where: {
          matchId_friendlyPlayerId: {
            matchId,
            friendlyPlayerId: data.friendlyPlayerId,
          },
        },
      })
      if (!participation) {
        return NextResponse.json(
          { error: 'El jugador no está en el plantel de este partido' },
          { status: 400 }
        )
      }
      if (data.side && participation.side !== data.side) {
        return NextResponse.json(
          { error: 'El lado no coincide con la participación del jugador' },
          { status: 400 }
        )
      }
    }

    if (data.assistFriendlyPlayerId) {
      const assistPart = await db.friendlyMatchPlayer.findUnique({
        where: {
          matchId_friendlyPlayerId: {
            matchId,
            friendlyPlayerId: data.assistFriendlyPlayerId,
          },
        },
      })
      if (!assistPart) {
        return NextResponse.json(
          { error: 'El asistente no está en el plantel de este partido' },
          { status: 400 }
        )
      }
    }
  } else if (data.friendlyPlayerId) {
    return NextResponse.json(
      { error: 'friendlyPlayerId no aplica en partidos de liga' },
      { status: 400 }
    )
  } else {
    if (data.assistFriendlyPlayerId) {
      return NextResponse.json(
        { error: 'assistFriendlyPlayerId no aplica en partidos de liga' },
        { status: 400 }
      )
    }
    if (data.assistPlayerId && data.type !== EventType.GOAL) {
      return NextResponse.json(
        { error: 'La asistencia solo aplica en goles' },
        { status: 400 }
      )
    }
  }

  const minuteOverride = isAdmin && data.minute !== undefined ? data.minute : undefined
  const { minute: _minute, ...eventInput } = data

  const result = await registerMatchEvent(matchId, eventInput, { minuteOverride })
  return NextResponse.json(result, { status: 201 })
}
