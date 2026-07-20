import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMatchMinute } from '@/lib/match-clock'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await db.match.findUnique({ where: { id } })

  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    minute: getMatchMinute(match),
    status: match.status,
    clockStartedAt: match.clockStartedAt,
    secondHalfStartedAt: match.secondHalfStartedAt,
    halftimeAt: match.halftimeAt,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  })
}
