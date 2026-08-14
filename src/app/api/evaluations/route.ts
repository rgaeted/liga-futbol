import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'

const evaluationSchema = z.object({
  playerId: z.string().cuid(),
  matchId: z.string().cuid().optional(),
  rating: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const { organizationId, session } = await requireOrgRole([
    MembershipRole.COACH,
    MembershipRole.ORG_ADMIN,
  ])
  const parsed = evaluationSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const player = await db.player.findUnique({
    where: { id: parsed.data.playerId },
    include: { team: { select: { organizationId: true } } },
  })
  if (!player?.team) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(player.team.organizationId, organizationId)

  const evaluation = await db.playerEvaluation.create({
    data: {
      ...parsed.data,
      coachId: session.user.id,
    },
  })
  return NextResponse.json(evaluation, { status: 201 })
}

export async function GET(req: Request) {
  const { organizationId } = await requireOrgRole([
    MembershipRole.COACH,
    MembershipRole.ORG_ADMIN,
    MembershipRole.PLAYER,
  ])
  const { searchParams } = new URL(req.url)
  const playerId = searchParams.get('playerId')
  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { team: { select: { organizationId: true } } },
  })
  if (!player?.team) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(player.team.organizationId, organizationId)

  const evaluations = await db.playerEvaluation.findMany({
    where: { playerId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(evaluations)
}
