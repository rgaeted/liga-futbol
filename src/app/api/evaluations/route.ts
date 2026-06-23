import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'

const evaluationSchema = z.object({
  playerId: z.string().cuid(),
  matchId: z.string().cuid().optional(),
  rating: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const session = await requireRole([Role.COACH, Role.ADMIN])
  const parsed = evaluationSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const evaluation = await db.playerEvaluation.create({
    data: {
      ...parsed.data,
      coachId: session.user.id,
    },
  })
  return NextResponse.json(evaluation, { status: 201 })
}

export async function GET(req: Request) {
  await requireRole([Role.COACH, Role.ADMIN, Role.PLAYER])
  const { searchParams } = new URL(req.url)
  const playerId = searchParams.get('playerId')
  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const evaluations = await db.playerEvaluation.findMany({
    where: { playerId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(evaluations)
}
