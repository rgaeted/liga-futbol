import { NextResponse } from 'next/server'
import { MatchStatus, MatchType, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireMatchOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { setMatchJerseySchema } from '@/lib/validations/match-jersey'

/** Asigna (o borra) el dorsal de un jugador para este partido. Solo antes del inicio. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params

  let authContext: Awaited<ReturnType<typeof requireMatchOrgRole>>
  try {
    authContext = await requireMatchOrgRole(matchId, [MembershipRole.REFEREE, MembershipRole.ORG_ADMIN])
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    throw error
  }
  const { role, session, match } = authContext

  if (role === MembershipRole.REFEREE && match.refereeId !== session.user.id) {
    return NextResponse.json({ error: 'No eres el árbitro asignado' }, { status: 403 })
  }

  const parsed = setMatchJerseySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dorsal no válido: usa un número entre 0 y 99' }, { status: 400 })
  }
  const { playerId, number } = parsed.data

  if (match.status !== MatchStatus.SCHEDULED) {
    return NextResponse.json(
      { error: 'El dorsal solo se puede cambiar antes de que comience el partido' },
      { status: 400 },
    )
  }

  let teamKey: string | null = null
  if (match.matchType === MatchType.FRIENDLY) {
    const participation = await db.friendlyMatchPlayer.findUnique({
      where: { matchId_playerId: { matchId, playerId } },
      select: { side: true },
    })
    teamKey = participation?.side ?? null
  } else {
    const player = await db.player.findUnique({ where: { id: playerId }, select: { teamId: true } })
    if (player?.teamId && (player.teamId === match.homeTeamId || player.teamId === match.awayTeamId)) {
      teamKey = player.teamId
    }
  }
  if (!teamKey) {
    return NextResponse.json({ error: 'El jugador no pertenece a este partido' }, { status: 400 })
  }

  if (number === null) {
    await db.matchPlayerJersey.deleteMany({ where: { matchId, playerId } })
    return NextResponse.json({ playerId, number: null })
  }

  const duplicateMessage = `El dorsal ${number} ya lo usa otro jugador de este equipo`
  const taken = await db.matchPlayerJersey.findFirst({
    where: { matchId, teamKey, number, playerId: { not: playerId } },
    select: { id: true },
  })
  if (taken) return NextResponse.json({ error: duplicateMessage }, { status: 409 })

  try {
    await db.matchPlayerJersey.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      create: { matchId, playerId, teamKey, number },
      update: { teamKey, number },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: duplicateMessage }, { status: 409 })
    }
    throw error
  }
  return NextResponse.json({ playerId, number })
}
