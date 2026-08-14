import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { updateMatchSchema } from '@/lib/validations/match'
import { assertPlayersBelongToCategory } from '@/lib/friendly-category-guards'
import { syncFriendlyMatchRoster } from '@/lib/friendly-match-roster'
import { buildMatchLocationFields, clearMatchWeatherFields } from '@/lib/match-location'
import { safeEnqueueMatchNotification } from '@/lib/mobile/notifications/enqueue'
import { triggerNotificationProcessing } from '@/lib/mobile/notifications/trigger-process'
import { MatchStatus, MatchType, NotificationKind } from '@prisma/client'
import { MembershipRole } from '@/lib/membership-role'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params
  const parsed = updateMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { scheduledAt, players, regionCode, communeCode, ...rest } = parsed.data

  const existing = await db.match.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      matchType: true,
      status: true,
      seasonId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      friendlyCategoryId: true,
      regionCode: true,
      communeCode: true,
      scheduledAt: true,
    },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  if (players && existing.matchType !== MatchType.FRIENDLY) {
    return NextResponse.json(
      { error: 'Solo se puede editar el roster en partidos amistosos' },
      { status: 400 }
    )
  }

  if (players) {
    if (!existing.friendlyCategoryId) {
      return NextResponse.json({ error: 'Partido sin categoría amistosa' }, { status: 400 })
    }

    const playerIds = players.map((p) => p.friendlyPlayerId)
    const rosterPlayers = await db.friendlyPlayer.findMany({
      where: { id: { in: playerIds } },
      select: {
        id: true,
        categories: { select: { friendlyCategoryId: true } },
      },
    })
    if (rosterPlayers.length !== playerIds.length) {
      return NextResponse.json({ error: 'Uno o más jugadores no existen' }, { status: 400 })
    }

    const membership = assertPlayersBelongToCategory(
      existing.friendlyCategoryId,
      rosterPlayers.map((p) => ({
        id: p.id,
        categoryIds: p.categories.map((c) => c.friendlyCategoryId),
      }))
    )
    if (!membership.ok) {
      return NextResponse.json(
        {
          error: 'Todos los jugadores deben pertenecer a la categoría del partido',
          foreignPlayerIds: membership.foreignPlayerIds,
        },
        { status: 400 }
      )
    }
  }

  let locationUpdate: Record<string, unknown> = {}
  if ('regionCode' in parsed.data || 'communeCode' in parsed.data) {
    const locationFields = buildMatchLocationFields({ regionCode, communeCode })
    if ('error' in locationFields) {
      return NextResponse.json({ error: locationFields.error }, { status: 400 })
    }
    locationUpdate = locationFields
  }

  const scheduleChanged =
    scheduledAt !== undefined &&
    new Date(scheduledAt).getTime() !== existing.scheduledAt.getTime()

  const match = await db.$transaction(async (tx) => {
    if (players) {
      await syncFriendlyMatchRoster(tx, id, players)
    }

    return tx.match.update({
      where: { id },
      data: {
        ...rest,
        ...locationUpdate,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(scheduleChanged ? clearMatchWeatherFields() : {}),
      },
      include: { homeTeam: true, awayTeam: true },
    })
  })

  if (
    match.matchType === MatchType.LEAGUE &&
    match.seasonId &&
    rest.status &&
    rest.status !== existing.status
  ) {
    if (existing.status === MatchStatus.SCHEDULED && match.status === MatchStatus.LIVE) {
      await safeEnqueueMatchNotification({
        kind: NotificationKind.MATCH_START,
        match,
      })
    } else if (
      existing.status !== MatchStatus.FINISHED &&
      match.status === MatchStatus.FINISHED
    ) {
      await safeEnqueueMatchNotification({
        kind: NotificationKind.MATCH_FINISH,
        match,
      })
    }
  }

  if (match.matchType === MatchType.LEAGUE) {
    triggerNotificationProcessing()
  }

  return NextResponse.json(match)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('PUT /api/matches/[id] failed', error)
    return NextResponse.json({ error: 'Error al guardar el partido' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.match.findUnique({
    where: { id },
    select: { organizationId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  await db.$transaction([
    db.matchEvent.deleteMany({ where: { matchId: id } }),
    db.callUp.deleteMany({ where: { matchId: id } }),
    db.playerEvaluation.deleteMany({ where: { matchId: id } }),
    db.match.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
