import { NextResponse } from 'next/server'
import { MatchType, MatchStatus, Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { aggregateFriendlyEvents } from '@/lib/friendly-stats'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const friendlyPlayer = await db.friendlyPlayer.findUnique({ where: { id } })
  if (!friendlyPlayer) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }

  const isAdmin = session.user.role === Role.ADMIN
  const isOwner = friendlyPlayer.userId === session.user.id
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const events = await db.matchEvent.findMany({
    where: {
      friendlyPlayerId: id,
      match: { matchType: MatchType.FRIENDLY },
    },
    select: { type: true },
  })

  const mvps = await db.matchTeamMvp.count({
    where: {
      friendlyPlayerId: id,
      match: { status: MatchStatus.FINISHED },
    },
  })

  return NextResponse.json({ ...aggregateFriendlyEvents(events), mvps })
}
