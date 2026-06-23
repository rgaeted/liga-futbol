import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'

const callUpSchema = z.object({
  matchId: z.string().cuid(),
  playerIds: z.array(z.string().cuid()).min(7).max(23),
  starters: z.array(z.string().cuid()),
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

  const { matchId, playerIds, starters } = parsed.data

  if (session.user.role === Role.COACH) {
    const team = await db.team.findUnique({ where: { coachId: session.user.id } })
    if (!team) {
      return NextResponse.json({ error: 'Coach has no team' }, { status: 403 })
    }
    const teamPlayers = await db.player.findMany({
      where: { teamId: team.id, id: { in: playerIds } },
    })
    if (teamPlayers.length !== playerIds.length) {
      return NextResponse.json({ error: 'Invalid players for team' }, { status: 403 })
    }
  }

  await db.callUp.deleteMany({ where: { matchId } })

  const callUps = await db.$transaction(
    playerIds.map((playerId) =>
      db.callUp.create({
        data: {
          matchId,
          playerId,
          isStarter: starters.includes(playerId),
        },
      })
    )
  )

  return NextResponse.json(callUps, { status: 201 })
}
