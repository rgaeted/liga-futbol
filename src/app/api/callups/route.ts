import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { minCallUpSize } from '@/lib/football-format'
import { Role } from '@prisma/client'

const callUpSchema = z.object({
  matchId: z.string().min(1),
  playerIds: z.array(z.string().min(1)).min(5).max(23),
  starters: z.array(z.string().min(1)),
  slots: z
    .array(z.object({ playerId: z.string().min(1), slotKey: z.string().min(1) }))
    .optional(),
})

export async function GET(req: Request) {
  await requireRole([Role.COACH, Role.ADMIN])
  const { searchParams } = new URL(req.url)
  const matchId = searchParams.get('matchId')
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 })
  }

  const callUps = await db.callUp.findMany({
    where: { matchId },
    include: { player: { include: { user: { select: { name: true } } } } },
  })
  return NextResponse.json(callUps)
}

export async function POST(req: Request) {
  const session = await requireRole([Role.COACH, Role.ADMIN])
  const parsed = callUpSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { matchId, playerIds, starters, slots } = parsed.data

  const match = await db.match.findUnique({ where: { id: matchId } })
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  const minPlayers = minCallUpSize(match.footballFormat)
  if (playerIds.length < minPlayers) {
    return NextResponse.json(
      { error: `Debes citar al menos ${minPlayers} jugadores` },
      { status: 400 }
    )
  }

  let teamIdFilter: string | undefined
  if (session.user.role === Role.COACH) {
    const team = await db.team.findUnique({ where: { coachId: session.user.id } })
    if (!team) {
      return NextResponse.json({ error: 'No tienes equipo asignado' }, { status: 403 })
    }
    teamIdFilter = team.id
    const teamPlayers = await db.player.findMany({
      where: { teamId: team.id, id: { in: playerIds } },
    })
    if (teamPlayers.length !== playerIds.length) {
      return NextResponse.json({ error: 'Jugadores inválidos para tu equipo' }, { status: 403 })
    }
  }

  await db.$transaction(async (tx) => {
    await tx.callUp.deleteMany({
      where: {
        matchId,
        ...(teamIdFilter
          ? { player: { teamId: teamIdFilter } }
          : { playerId: { in: playerIds } }),
      },
    })

    const slotByPlayer = new Map(
      (slots ?? []).map((s) => [s.playerId, s.slotKey])
    )

    for (const playerId of playerIds) {
      const slotKey = slotByPlayer.get(playerId) ?? null
      await tx.callUp.create({
        data: {
          matchId,
          playerId,
          isStarter: starters.includes(playerId) || Boolean(slotKey),
          slotKey,
        },
      })
    }
  })

  const callUps = await db.callUp.findMany({
    where: { matchId, playerId: { in: playerIds } },
    include: { player: { include: { user: { select: { name: true } } } } },
  })

  return NextResponse.json(callUps, { status: 201 })
}
