import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { updateMatchSchema, updateGuestChallengeRosterSchema } from '@/lib/validations/match'
import { syncFriendlyMatchRoster } from '@/lib/friendly-match-roster'
import { buildMatchLocationFields, clearMatchWeatherFields } from '@/lib/match-location'
import { safeEnqueueMatchNotification } from '@/lib/mobile/notifications/enqueue'
import { triggerNotificationProcessing } from '@/lib/mobile/notifications/trigger-process'
import { MatchStatus, MatchType, NotificationKind } from '@prisma/client'
import { MembershipRole } from '@/lib/membership-role'
import {
  assertCanEditFriendlySide,
  assertCanGoLive,
  computeFriendlySideReady,
  isChallengeGuest,
  isChallengeHost,
  isChallengeParticipant,
} from '@/lib/match-challenge'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { id } = await params
    const rawBody = await req.json()

    const existing = await db.match.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        guestOrganizationId: true,
        challengeStatus: true,
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
        friendlyPlayers: {
          select: { side: true, isCaptain: true, isCoach: true, playerId: true },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    const isGuest = isChallengeGuest(existing, organizationId)
    const isHost = isChallengeHost(existing, organizationId)
    const isParticipant = isChallengeParticipant(existing, organizationId)

    const parsed = isGuest && existing.guestOrganizationId
      ? updateGuestChallengeRosterSchema.safeParse(rawBody)
      : updateMatchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const guestPayload = isGuest && existing.guestOrganizationId
      ? (parsed.data as { players: NonNullable<ReturnType<typeof updateGuestChallengeRosterSchema.parse>['players']> })
      : null
    const hostPayload = guestPayload ? null : parsed.data
    const { scheduledAt, players, regionCode, communeCode, ...rest } = (hostPayload ?? {
      scheduledAt: undefined,
      players: guestPayload!.players,
      regionCode: undefined,
      communeCode: undefined,
    }) as {
      scheduledAt?: Date | string
      players?: Array<{
        playerId: string
        side: 'A' | 'B'
        isCaptain?: boolean
        isCoach?: boolean
      }>
      regionCode?: string | null
      communeCode?: string | null
      status?: MatchStatus
    }

    if (existing.guestOrganizationId) {
      if (!isParticipant) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      if (isGuest) {
        if (!players) {
          return NextResponse.json({ error: 'Debes enviar el plantel de tu lado' }, { status: 400 })
        }
      }
    } else if (!isHost) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (players && existing.matchType !== MatchType.FRIENDLY) {
      return NextResponse.json(
        { error: 'Solo se puede editar el roster en partidos amistosos' },
        { status: 400 }
      )
    }

    let mergedPlayers = players
    if (players) {
      if (!existing.friendlyCategoryId) {
        return NextResponse.json({ error: 'Partido sin categoría amistosa' }, { status: 400 })
      }

      if (isGuest && existing.guestOrganizationId) {
        const sideAPlayers = existing.friendlyPlayers
          .filter((row) => row.side === 'A')
          .map((row) => ({
            playerId: row.playerId,
            side: 'A' as const,
            isCaptain: row.isCaptain,
            isCoach: row.isCoach,
          }))
        const sideBPlayers = players.filter((player) => player.side === 'B')
        if (players.some((player) => player.side === 'A')) {
          return NextResponse.json(
            { error: 'No puedes editar el plantel del anfitrión' },
            { status: 403 }
          )
        }
        mergedPlayers = [...sideAPlayers, ...sideBPlayers]
      }

      const playersToAuthorize =
        isGuest && existing.guestOrganizationId
          ? players.filter((player) => player.side === 'B')
          : mergedPlayers!

      for (const player of playersToAuthorize) {
        if (
          !assertCanEditFriendlySide({
            actorOrganizationId: organizationId,
            match: existing,
            side: player.side,
          })
        ) {
          return NextResponse.json(
            { error: `No puedes editar jugadores del lado ${player.side}` },
            { status: 403 }
          )
        }
      }

      const playerIds = mergedPlayers!.map((player) => player.playerId)
      const rosterPlayers = await db.player.findMany({
        where: { id: { in: playerIds } },
        select: {
          id: true,
          organizationId: true,
        },
      })
      if (rosterPlayers.length !== playerIds.length) {
        return NextResponse.json({ error: 'Uno o más jugadores no existen' }, { status: 400 })
      }

      for (const player of mergedPlayers!) {
        const rosterPlayer = rosterPlayers.find((row) => row.id === player.playerId)
        if (!rosterPlayer) continue
        const expectedOrgId =
          player.side === 'A' ? existing.organizationId : existing.guestOrganizationId
        if (expectedOrgId && rosterPlayer.organizationId !== expectedOrgId) {
          return NextResponse.json(
            { error: 'Un jugador no pertenece a la organización de su lado' },
            { status: 400 }
          )
        }
      }
    }

    if (rest.status === MatchStatus.LIVE && existing.matchType === MatchType.FRIENDLY) {
      const rosterForReady = mergedPlayers
        ? mergedPlayers.map((player) => ({
            side: player.side,
            isCaptain: player.isCaptain ?? false,
            isCoach: player.isCoach ?? false,
          }))
        : existing.friendlyPlayers.map((player) => ({
            side: player.side,
            isCaptain: player.isCaptain,
            isCoach: player.isCoach,
          }))

      const { sideAReady, sideBReady } = computeFriendlySideReady(rosterForReady)
      const liveCheck = assertCanGoLive({
        matchType: existing.matchType,
        challengeStatus: existing.challengeStatus,
        sideAReady,
        sideBReady,
      })
      if (!liveCheck.ok) {
        return NextResponse.json({ error: liveCheck.error }, { status: 400 })
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
      if (mergedPlayers) {
        await syncFriendlyMatchRoster(tx, id, mergedPlayers)
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
  if (existing.organizationId !== organizationId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await db.$transaction([
    db.matchEvent.deleteMany({ where: { matchId: id } }),
    db.callUp.deleteMany({ where: { matchId: id } }),
    db.playerEvaluation.deleteMany({ where: { matchId: id } }),
    db.match.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
