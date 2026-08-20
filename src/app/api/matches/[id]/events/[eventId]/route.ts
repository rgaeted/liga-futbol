import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { updateMatchEventSchema } from '@/lib/validations/match-event'
import { reconcileMatchState } from '@/lib/match-reconcile'
import { EventType } from '@prisma/client'
import { MembershipRole } from '@/lib/membership-role'
import { PLAYER_PERSON_NAME_INCLUDE } from '@/lib/person-name'

async function assertMatchInOrganization(matchId: string, organizationId: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { organizationId: true },
  })
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  assertSameOrganization(match.organizationId, organizationId)
  return null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: matchId, eventId } = await params

  const orgError = await assertMatchInOrganization(matchId, organizationId)
  if (orgError) return orgError

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

  const matchRecord = await db.match.findUniqueOrThrow({ where: { id: matchId } })
  const effectiveType = data.type ?? existing.type

  if (data.assistPlayerId && effectiveType !== EventType.GOAL) {
    return NextResponse.json(
      { error: 'La asistencia solo aplica en goles' },
      { status: 400 }
    )
  }

  const clearAssists = data.type !== undefined && data.type !== EventType.GOAL

  const event = await db.matchEvent.update({
    where: { id: eventId },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.minute !== undefined ? { minute: data.minute } : {}),
      ...(data.playerId !== undefined ? { playerId: data.playerId } : {}),
      ...(data.teamId !== undefined ? { teamId: data.teamId } : {}),
      ...(clearAssists
        ? { assistPlayerId: null }
        : {
            ...(data.assistPlayerId !== undefined ? { assistPlayerId: data.assistPlayerId } : {}),
          }),
      ...(data.side !== undefined ? { side: data.side } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
    include: {
      player: { include: PLAYER_PERSON_NAME_INCLUDE },
      assistPlayer: { include: PLAYER_PERSON_NAME_INCLUDE },
    },
  })

  const affectedPlayerIds = [
    existing.playerId,
    event.playerId,
    existing.assistPlayerId,
    event.assistPlayerId,
  ].filter((id): id is string => Boolean(id))

  const updatedMatch = await reconcileMatchState(matchId, affectedPlayerIds)

  return NextResponse.json({ event, match: updatedMatch })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: matchId, eventId } = await params

  const orgError = await assertMatchInOrganization(matchId, organizationId)
  if (orgError) return orgError

  const existing = await db.matchEvent.findFirst({
    where: { id: eventId, matchId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  }

  await db.matchEvent.delete({ where: { id: eventId } })

  const affectedPlayerIds = [
    ...(existing.playerId ? [existing.playerId] : []),
    ...(existing.assistPlayerId ? [existing.assistPlayerId] : []),
  ]
  const match = await reconcileMatchState(matchId, affectedPlayerIds)

  return NextResponse.json({ ok: true, match })
}
