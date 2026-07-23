import { NextResponse } from 'next/server'
import { MatchStatus, MatchType, Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { assertMvpInMatchRoster, resolveMvpLabel } from '@/lib/match-mvp'
import { setMatchMvpSchema } from '@/lib/validations/mvp'

async function canEditMvp(userId: string, role: Role, match: { refereeId: string | null }) {
  if (role === Role.ADMIN) return true
  if (role === Role.REFEREE && match.refereeId === userId) return true
  return false
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const parsed = setMatchMvpSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const match = await db.match.findUnique({
    where: { id },
    select: {
      id: true,
      matchType: true,
      status: true,
      refereeId: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  })

  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  if (!(await canEditMvp(session.user.id, session.user.role as Role, match))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (match.status !== MatchStatus.FINISHED) {
    return NextResponse.json(
      { error: 'Solo se puede asignar MVP en partidos finalizados' },
      { status: 400 }
    )
  }

  const rosterError = await assertMvpInMatchRoster(db, match, parsed.data)
  if (rosterError) {
    return NextResponse.json({ error: rosterError }, { status: 400 })
  }

  const data =
    match.matchType === MatchType.FRIENDLY
      ? {
          mvpFriendlyPlayerId: parsed.data.friendlyPlayerId ?? null,
          mvpPlayerId: null,
        }
      : {
          mvpPlayerId: parsed.data.playerId ?? null,
          mvpFriendlyPlayerId: null,
        }

  const updated = await db.match.update({
    where: { id },
    data,
    include: {
      mvpPlayer: { include: { user: { select: { name: true } } } },
      mvpFriendlyPlayer: { select: { firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({
    mvpPlayerId: updated.mvpPlayerId,
    mvpFriendlyPlayerId: updated.mvpFriendlyPlayerId,
    mvpLabel: resolveMvpLabel(updated),
  })
}
