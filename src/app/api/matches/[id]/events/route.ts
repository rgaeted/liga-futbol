import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMatchOrgRole } from '@/lib/auth'
import { createMatchEventSchema } from '@/lib/validations/match-event'
import { GAME_EVENT_TYPES, registerMatchEvent } from '@/lib/match-events'
import { isRefereeEventEnabled } from '@/lib/match-referee-events'
import { triggerNotificationProcessing } from '@/lib/mobile/notifications/trigger-process'
import { EventType, MatchStatus, MatchType } from '@prisma/client'
import { MembershipRole } from '@/lib/membership-role'
import { PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

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
      player: { include: PLAYER_PERSON_NAME_INCLUDE },
      assistPlayer: { include: PLAYER_PERSON_NAME_INCLUDE },
    },
    orderBy: { minute: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params

  let role: MembershipRole
  let session: Awaited<ReturnType<typeof requireMatchOrgRole>>['session']
  let match: Awaited<ReturnType<typeof requireMatchOrgRole>>['match']

  try {
    const authContext = await requireMatchOrgRole(matchId, [
      MembershipRole.REFEREE,
      MembershipRole.ORG_ADMIN,
    ])
    role = authContext.role
    session = authContext.session
    match = authContext.match
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    throw error
  }

  if (role === MembershipRole.REFEREE && match.refereeId !== session.user.id) {
    return NextResponse.json({ error: 'No eres el árbitro asignado' }, { status: 403 })
  }

  const parsed = createMatchEventSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const isAdmin = role === MembershipRole.ORG_ADMIN

  if (
    role === MembershipRole.REFEREE &&
    !isRefereeEventEnabled(match.refereeEventTypes, data.type)
  ) {
    return NextResponse.json(
      { error: 'Este evento no está habilitado para este partido' },
      { status: 403 }
    )
  }

  if (
    role === MembershipRole.REFEREE &&
    isGameEvent(data.type) &&
    match.status !== MatchStatus.LIVE
  ) {
    return NextResponse.json({ error: 'El partido no está en juego' }, { status: 400 })
  }

  if (match.matchType === MatchType.FRIENDLY) {
    if (eventNeedsPlayer(data.type) && (!data.playerId || !data.side)) {
      return NextResponse.json(
        {
          error: 'Los eventos con jugador en partidos amistosos requieren playerId y side',
        },
        { status: 400 }
      )
    }
    if (data.teamId) {
      return NextResponse.json(
        { error: 'teamId no aplica en partidos amistosos' },
        { status: 400 }
      )
    }
    if (data.assistPlayerId && data.type !== EventType.GOAL) {
      return NextResponse.json(
        { error: 'La asistencia solo aplica en goles' },
        { status: 400 }
      )
    }

    if (data.playerId) {
      const participation = await db.friendlyMatchPlayer.findUnique({
        where: {
          matchId_playerId: {
            matchId,
            playerId: data.playerId,
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

    if (data.assistPlayerId) {
      const assistPart = await db.friendlyMatchPlayer.findUnique({
        where: {
          matchId_playerId: {
            matchId,
            playerId: data.assistPlayerId,
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
  } else {
    if (data.side) {
      return NextResponse.json(
        { error: 'side no aplica en partidos de liga' },
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

  if (match.matchType === MatchType.LEAGUE) {
    triggerNotificationProcessing()
  }

  return NextResponse.json(result, { status: 201 })
}
