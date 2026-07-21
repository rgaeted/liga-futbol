import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { formatApiError } from '@/lib/api-error'
import { createMatchSchema } from '@/lib/validations/match'
import { assertPlayersBelongToCategory } from '@/lib/friendly-category-guards'
import { Role } from '@prisma/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const teamId = searchParams.get('teamId')

  const matches = await db.match.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(teamId
        ? { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] }
        : {}),
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      referee: { select: { id: true, name: true } },
      season: true,
      friendlyCategory: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })
  return NextResponse.json(matches)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatApiError(parsed.error.flatten()) },
      { status: 400 }
    )
  }

  const data = parsed.data

  if (data.matchType === 'LEAGUE') {
    if (data.homeTeamId === data.awayTeamId) {
      return NextResponse.json({ error: 'Home and away team must differ' }, { status: 400 })
    }
    const season = await db.season.findUnique({ where: { id: data.seasonId } })
    if (!season) {
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 400 })
    }
    const match = await db.match.create({
      data: {
        matchType: 'LEAGUE',
        seasonId: data.seasonId,
        footballFormat: season.footballFormat,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        refereeId: data.refereeId,
        venue: data.venue,
        scheduledAt: new Date(data.scheduledAt),
      },
      include: { homeTeam: true, awayTeam: true },
    })
    return NextResponse.json(match, { status: 201 })
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

  const playerIds = data.players.map((p) => p.friendlyPlayerId)
  const rosterPlayers = await db.friendlyPlayer.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, friendlyCategoryId: true },
  })
  if (rosterPlayers.length !== playerIds.length) {
    return NextResponse.json({ error: 'Uno o más jugadores no existen' }, { status: 400 })
  }

  const membership = assertPlayersBelongToCategory(data.friendlyCategoryId, rosterPlayers)
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
        matchType: 'FRIENDLY',
        friendlyCategoryId: data.friendlyCategoryId,
        footballFormat: data.footballFormat,
        sideAName: data.sideAName,
        sideBName: data.sideBName,
        refereeId: data.refereeId,
        venue: data.venue,
        scheduledAt: new Date(data.scheduledAt),
      },
    })
    await tx.friendlyMatchPlayer.createMany({
      data: data.players.map((p) => ({
        matchId: created.id,
        friendlyPlayerId: p.friendlyPlayerId,
        side: p.side,
      })),
    })
    return tx.match.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        friendlyCategory: { select: { id: true, name: true } },
        friendlyPlayers: { include: { friendlyPlayer: true } },
        referee: { select: { id: true, name: true } },
      },
    })
  })

  return NextResponse.json(match, { status: 201 })
}
