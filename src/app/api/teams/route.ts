import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createTeamSchema } from '@/lib/validations/team'
import { Role } from '@prisma/client'

export async function GET() {
  await requireRole([Role.ADMIN, Role.COACH, Role.PLAYER, Role.REFEREE])
  const teams = await db.team.findMany({
    include: {
      coach: { select: { id: true, name: true } },
      _count: { select: { players: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const body = await req.json()
  const parsed = createTeamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = {
    name: parsed.data.name,
    logoUrl: parsed.data.logoUrl || null,
    coachId: parsed.data.coachId,
  }

  const team = await db.team.create({ data })
  return NextResponse.json(team, { status: 201 })
}
