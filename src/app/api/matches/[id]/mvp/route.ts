import { NextResponse } from 'next/server'
import { MatchStatus, MatchType, Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assertMvpInMatchRoster,
  buildMatchTeamMvps,
  buildTeamMvpView,
  MATCH_MVP_INCLUDE,
} from '@/lib/match-mvp'
import { setMatchMvpSchema } from '@/lib/validations/mvp'
import { matchSideNames } from '@/lib/match-label'
import { emitMatchUpdate } from '@/server/socket'

async function canEditMvp(userId: string, role: Role, match: { refereeId: string | null }) {
  if (role === Role.ADMIN) return true
  if (role === Role.REFEREE && match.refereeId === userId) return true
  return false
}

function sidePayload(matchType: MatchType, input: { playerId?: string | null; friendlyPlayerId?: string | null }) {
  return matchType === MatchType.FRIENDLY
    ? {
        playerId: null,
        friendlyPlayerId: input.friendlyPlayerId ?? null,
      }
    : {
        playerId: input.playerId ?? null,
        friendlyPlayerId: null,
      }
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
      sideAName: true,
      sideBName: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
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

  const rosterError = await assertMvpInMatchRoster(db, match, parsed.data.side, parsed.data)
  if (rosterError) {
    return NextResponse.json({ error: rosterError }, { status: 400 })
  }

  const playerFields = sidePayload(match.matchType, parsed.data)
  const hasPlayer = Boolean(playerFields.playerId || playerFields.friendlyPlayerId)

  if (!hasPlayer) {
    await db.matchTeamMvp.deleteMany({
      where: { matchId: id, side: parsed.data.side },
    })
  } else {
    await db.matchTeamMvp.upsert({
      where: {
        matchId_side: { matchId: id, side: parsed.data.side },
      },
      create: {
        matchId: id,
        side: parsed.data.side,
        ...playerFields,
      },
      update: playerFields,
    })
  }

  const rows = await db.matchTeamMvp.findMany({
    where: { matchId: id },
    include: MATCH_MVP_INCLUDE,
  })

  const sides = matchSideNames(match)
  const teamMvps = buildMatchTeamMvps({
    matchId: id,
    homeLabel: sides.home,
    awayLabel: sides.away,
    rows,
  })

  const updatedSide = buildTeamMvpView(
    id,
    parsed.data.side,
    parsed.data.side === 'HOME' ? sides.home : sides.away,
    rows.find((row) => row.side === parsed.data.side)
  )

  const fullMatch = await db.match.findUnique({
    where: { id },
    select: { homeScore: true, awayScore: true, status: true },
  })

  if (fullMatch) {
    emitMatchUpdate({
      matchId: id,
      homeScore: fullMatch.homeScore,
      awayScore: fullMatch.awayScore,
      status: fullMatch.status,
      teamMvps,
    })
  }

  return NextResponse.json({ side: updatedSide, teamMvps })
}
