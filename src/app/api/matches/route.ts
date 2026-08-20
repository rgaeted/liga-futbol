import { NextResponse } from 'next/server'
import { ChallengeStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { formatApiError } from '@/lib/api-error'
import {
  createMatchSchema,
  createFriendlyChallengeSchema,
} from '@/lib/validations/match'
import { assertPlayersBelongToCategory } from '@/lib/friendly-category-guards'
import { deriveTeamColor } from '@/lib/team-color'
import { MembershipRole } from '@/lib/membership-role'
import { DEFAULT_REFEREE_EVENT_TYPES, normalizeRefereeEventTypes } from '@/lib/match-referee-events'
import { buildMatchLocationFields } from '@/lib/match-location'
import { assertChallengeCreate } from '@/lib/match-challenge'

export async function GET(req: Request) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const teamId = searchParams.get('teamId')

    const matches = await db.match.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                organizationId,
                NOT: {
                  challengeStatus: {
                    in: [ChallengeStatus.DECLINED, ChallengeStatus.CANCELLED],
                  },
                },
              },
              {
                guestOrganizationId: organizationId,
                challengeStatus: {
                  in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED],
                },
              },
            ],
          },
          ...(status ? [{ status: status as never }] : []),
          ...(teamId
            ? [{ OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] }]
            : []),
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        referee: { select: { id: true, name: true } },
        season: true,
        friendlyCategory: { select: { id: true, name: true } },
        guestOrganization: { select: { id: true, slug: true, name: true } },
        organization: { select: { id: true, slug: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })
    return NextResponse.json(matches)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('GET /api/matches failed', error)
    return NextResponse.json({ error: 'Error al listar partidos' }, { status: 500 })
  }
}

const playerSummarySelect = {
  id: true,
  primaryPosition: true,
  person: {
    select: {
      firstName: true,
      lastName: true,
      photoMimeType: true,
    },
  },
} as const

async function createFriendlyMatch(
  organizationId: string,
  data: Extract<
    Awaited<ReturnType<typeof createMatchSchema.safeParse>>['data'],
    { matchType: 'FRIENDLY' }
  >
) {
  const locationFields = buildMatchLocationFields({
    regionCode: data.regionCode,
    communeCode: data.communeCode,
  })
  if ('error' in locationFields) {
    return NextResponse.json({ error: locationFields.error }, { status: 400 })
  }

  const category = await db.friendlyCategory.findUnique({
    where: { id: data.friendlyCategoryId },
  })
  if (!category) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 })
  }
  if (!category.isActive) {
    return NextResponse.json({ error: 'La categoría no está activa' }, { status: 400 })
  }
  if (category.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Categoría no válida para esta organización' }, { status: 400 })
  }

  const playerIds = data.players.map((player) => player.playerId)
  const rosterPlayers = await db.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      organizationId: true,
      categories: { select: { friendlyCategoryId: true } },
    },
  })
  if (rosterPlayers.length !== playerIds.length) {
    return NextResponse.json({ error: 'Uno o más jugadores no existen' }, { status: 400 })
  }

  if (rosterPlayers.some((player) => player.organizationId !== organizationId)) {
    return NextResponse.json(
      { error: 'Los jugadores deben pertenecer a tu organización' },
      { status: 400 }
    )
  }

  const membership = assertPlayersBelongToCategory(
    data.friendlyCategoryId,
    rosterPlayers.map((player) => ({
      id: player.id,
      categoryIds: player.categories.map((categoryRow) => categoryRow.friendlyCategoryId),
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

  const match = await db.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        organizationId,
        matchType: 'FRIENDLY',
        friendlyCategoryId: data.friendlyCategoryId,
        footballFormat: data.footballFormat,
        sideAName: data.sideAName,
        sideBName: data.sideBName,
        sideAColor: deriveTeamColor(data.sideAName),
        sideBColor: deriveTeamColor(data.sideBName),
        refereeId: data.refereeId,
        refereeEventTypes: normalizeRefereeEventTypes(
          data.refereeEventTypes ?? DEFAULT_REFEREE_EVENT_TYPES
        ),
        venue: data.venue,
        scheduledAt: new Date(data.scheduledAt),
        ...locationFields,
      },
    })
    await tx.friendlyMatchPlayer.createMany({
      data: data.players.map((player) => ({
        matchId: created.id,
        playerId: player.playerId,
        side: player.side,
        isCaptain: player.isCaptain ?? false,
        isCoach: player.isCoach ?? false,
      })),
    })
    return tx.match.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        friendlyCategory: { select: { id: true, name: true } },
        friendlyPlayers: {
          include: { player: { select: playerSummarySelect } },
        },
        referee: { select: { id: true, name: true } },
        guestOrganization: { select: { id: true, slug: true, name: true } },
      },
    })
  })

  return NextResponse.json(match, { status: 201 })
}

async function createFriendlyChallenge(
  organizationId: string,
  data: Extract<
    Awaited<ReturnType<typeof createFriendlyChallengeSchema.safeParse>>['data'],
    { matchType: 'FRIENDLY' }
  >
) {
  const locationFields = buildMatchLocationFields({
    regionCode: data.regionCode,
    communeCode: data.communeCode,
  })
  if ('error' in locationFields) {
    return NextResponse.json({ error: locationFields.error }, { status: 400 })
  }

  const guestOrg = await db.organization.findUnique({
    where: { slug: data.guestOrganizationSlug },
    select: { id: true, name: true, status: true, slug: true },
  })
  if (!guestOrg) {
    return NextResponse.json({ error: 'Organización visitante no encontrada' }, { status: 400 })
  }
  if (guestOrg.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'La organización visitante no está activa' }, { status: 400 })
  }
  if (guestOrg.id === organizationId) {
    return NextResponse.json(
      { error: 'No puedes desafiar a tu propia organización' },
      { status: 400 }
    )
  }

  try {
    assertChallengeCreate({
      hostOrganizationId: organizationId,
      guestOrganizationId: guestOrg.id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Desafío inválido' },
      { status: 400 }
    )
  }

  const category = await db.friendlyCategory.findUnique({
    where: { id: data.friendlyCategoryId },
  })
  if (!category) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 })
  }
  if (!category.isActive) {
    return NextResponse.json({ error: 'La categoría no está activa' }, { status: 400 })
  }
  if (category.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Categoría no válida para esta organización' }, { status: 400 })
  }

  const playerIds = data.players.map((player) => player.playerId)
  const rosterPlayers = await db.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      organizationId: true,
      categories: { select: { friendlyCategoryId: true } },
    },
  })
  if (rosterPlayers.length !== playerIds.length) {
    return NextResponse.json({ error: 'Uno o más jugadores no existen' }, { status: 400 })
  }

  if (rosterPlayers.some((player) => player.organizationId !== organizationId)) {
    return NextResponse.json(
      { error: 'Los jugadores del anfitrión deben pertenecer a tu organización' },
      { status: 400 }
    )
  }

  const membership = assertPlayersBelongToCategory(
    data.friendlyCategoryId,
    rosterPlayers.map((player) => ({
      id: player.id,
      categoryIds: player.categories.map((categoryRow) => categoryRow.friendlyCategoryId),
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

  const sideBName = data.sideBName?.trim() || guestOrg.name

  const match = await db.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        organizationId,
        matchType: 'FRIENDLY',
        guestOrganizationId: guestOrg.id,
        challengeStatus: ChallengeStatus.PENDING,
        friendlyCategoryId: data.friendlyCategoryId,
        footballFormat: data.footballFormat,
        sideAName: data.sideAName,
        sideBName,
        sideAColor: deriveTeamColor(data.sideAName),
        sideBColor: deriveTeamColor(sideBName),
        refereeId: data.refereeId,
        refereeEventTypes: normalizeRefereeEventTypes(
          data.refereeEventTypes ?? DEFAULT_REFEREE_EVENT_TYPES
        ),
        venue: data.venue,
        scheduledAt: new Date(data.scheduledAt),
        ...locationFields,
      },
    })
    await tx.friendlyMatchPlayer.createMany({
      data: data.players.map((player) => ({
        matchId: created.id,
        playerId: player.playerId,
        side: player.side,
        isCaptain: player.isCaptain ?? false,
        isCoach: player.isCoach ?? false,
      })),
    })
    return tx.match.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        friendlyCategory: { select: { id: true, name: true } },
        friendlyPlayers: {
          include: { player: { select: playerSummarySelect } },
        },
        referee: { select: { id: true, name: true } },
        guestOrganization: { select: { id: true, slug: true, name: true } },
      },
    })
  })

  return NextResponse.json(match, { status: 201 })
}

export async function POST(req: Request) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const rawBody = await req.json()

    if (
      rawBody &&
      typeof rawBody === 'object' &&
      'guestOrganizationSlug' in rawBody &&
      rawBody.guestOrganizationSlug
    ) {
      const parsed = createFriendlyChallengeSchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json(
          { error: formatApiError(parsed.error.flatten()) },
          { status: 400 }
        )
      }
      return createFriendlyChallenge(organizationId, parsed.data)
    }

    const parsed = createMatchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatApiError(parsed.error.flatten()) },
        { status: 400 }
      )
    }

    const data = parsed.data
    const locationFields = buildMatchLocationFields({
      regionCode: data.regionCode,
      communeCode: data.communeCode,
    })
    if ('error' in locationFields) {
      return NextResponse.json({ error: locationFields.error }, { status: 400 })
    }

    if (data.matchType === 'LEAGUE') {
      if (data.homeTeamId === data.awayTeamId) {
        return NextResponse.json({ error: 'Home and away team must differ' }, { status: 400 })
      }
      const season = await db.season.findUnique({ where: { id: data.seasonId } })
      if (!season) {
        return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 400 })
      }
      if (season.organizationId !== organizationId) {
        return NextResponse.json({ error: 'Temporada no válida para esta organización' }, { status: 400 })
      }
      const match = await db.match.create({
        data: {
          organizationId,
          matchType: 'LEAGUE',
          seasonId: data.seasonId,
          footballFormat: season.footballFormat,
          homeTeamId: data.homeTeamId,
          awayTeamId: data.awayTeamId,
          refereeId: data.refereeId,
          refereeEventTypes: normalizeRefereeEventTypes(
            data.refereeEventTypes ?? DEFAULT_REFEREE_EVENT_TYPES
          ),
          venue: data.venue,
          scheduledAt: new Date(data.scheduledAt),
          ...locationFields,
        },
        include: { homeTeam: true, awayTeam: true },
      })
      return NextResponse.json(match, { status: 201 })
    }

    return createFriendlyMatch(organizationId, data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('POST /api/matches failed', error)
    return NextResponse.json({ error: 'Error al crear el partido' }, { status: 500 })
  }
}
