import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateMatchSchema } from '@/lib/validations/match'
import { assertPlayersBelongToCategory } from '@/lib/friendly-category-guards'
import { syncFriendlyMatchRoster } from '@/lib/friendly-match-roster'
import { MatchType, Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { scheduledAt, players, ...rest } = parsed.data

  const existing = await db.match.findUnique({
    where: { id },
    select: { id: true, matchType: true, friendlyCategoryId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

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

  const match = await db.$transaction(async (tx) => {
    if (players) {
      await syncFriendlyMatchRoster(tx, id, players)
    }

    return tx.match.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      },
      include: { homeTeam: true, awayTeam: true },
    })
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
