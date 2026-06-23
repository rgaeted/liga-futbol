import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createMatchSchema } from '@/lib/validations/match'
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
    },
    orderBy: { scheduledAt: 'asc' },
  })
  return NextResponse.json(matches)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createMatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.homeTeamId === parsed.data.awayTeamId) {
    return NextResponse.json({ error: 'Home and away team must differ' }, { status: 400 })
  }

  const match = await db.match.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
    include: { homeTeam: true, awayTeam: true },
  })
  return NextResponse.json(match, { status: 201 })
}
