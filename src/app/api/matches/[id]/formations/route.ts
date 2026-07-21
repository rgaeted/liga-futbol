import { NextResponse } from 'next/server'
import { MatchType, Role } from '@prisma/client'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { upsertMatchFormationSchema } from '@/lib/validations/formation'
import {
  assertUniqueSlotAssignments,
  isValidScheme,
  isValidSlotKey,
} from '@/lib/formations'
import { buildMatchFormationSides } from '@/lib/match-formations'
import { minCallUpSize, resolveMatchFootballFormat } from '@/lib/football-format'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      formations: true,
      callUps: {
        include: {
          player: {
            include: {
              user: { select: { name: true } },
              team: { select: { id: true } },
            },
          },
        },
      },
      friendlyPlayers: {
        include: { friendlyPlayer: true },
      },
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
  })

  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  const sides = buildMatchFormationSides({
    matchType: match.matchType,
    footballFormat: match.footballFormat,
    sideAName: match.sideAName,
    sideBName: match.sideBName,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    formations: match.formations,
    callUps: match.callUps.map((c) => ({
      playerId: c.playerId,
      slotKey: c.slotKey,
      player: {
        teamId: c.player.teamId,
        user: c.player.user,
      },
    })),
    friendlyPlayers: match.friendlyPlayers.map((p) => ({
      friendlyPlayerId: p.friendlyPlayerId,
      side: p.side,
      slotKey: p.slotKey,
      friendlyPlayer: p.friendlyPlayer,
    })),
  })

  return NextResponse.json({ sides, footballFormat: match.footballFormat })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole([Role.COACH, Role.ADMIN])
  const { id: matchId } = await params

  const match = await db.match.findUnique({ where: { id: matchId } })
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  const parsed = upsertMatchFormationSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data
  const footballFormat = resolveMatchFootballFormat(match)

  if (!isValidScheme(data.scheme, footballFormat)) {
    return NextResponse.json({ error: 'Esquema inválido para este tipo de fútbol' }, { status: 400 })
  }

  for (const slot of data.slots) {
    if (!isValidSlotKey(data.scheme, slot.slotKey, footballFormat)) {
      return NextResponse.json(
        { error: `Slot inválido para ${data.scheme}: ${slot.slotKey}` },
        { status: 400 }
      )
    }
  }

  const uniqueness = assertUniqueSlotAssignments(
    data.slots.map((s) => ({
      slotKey: s.slotKey,
      playerId: 'playerId' in s ? s.playerId : s.friendlyPlayerId,
    }))
  )
  if (!uniqueness.ok) {
    return NextResponse.json({ error: 'Hay slots duplicados' }, { status: 400 })
  }

  if (match.matchType === MatchType.LEAGUE) {
    if (!data.teamId) {
      return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })
    }
    if (data.teamId !== match.homeTeamId && data.teamId !== match.awayTeamId) {
      return NextResponse.json({ error: 'Equipo no pertenece al partido' }, { status: 400 })
    }
    if (session.user.role === Role.COACH) {
      const team = await db.team.findUnique({ where: { coachId: session.user.id } })
      if (!team || team.id !== data.teamId) {
        return NextResponse.json({ error: 'Solo puedes editar tu equipo' }, { status: 403 })
      }
    }

    const slotPlayerIds = data.slots
      .filter((s): s is { slotKey: string; playerId: string } => 'playerId' in s)
      .map((s) => s.playerId)
    const benchIds = data.benchPlayerIds ?? []
    const allIds = [...new Set([...slotPlayerIds, ...benchIds])]

    const minSquad = minCallUpSize(footballFormat)
    if (allIds.length < minSquad) {
      return NextResponse.json(
        { error: `Debes citar al menos ${minSquad} jugadores` },
        { status: 400 }
      )
    }

    const teamPlayers = await db.player.findMany({
      where: { teamId: data.teamId, id: { in: allIds } },
    })
    if (teamPlayers.length !== allIds.length) {
      return NextResponse.json(
        { error: 'Jugadores inválidos para el equipo' },
        { status: 400 }
      )
    }

    await db.$transaction(async (tx) => {
      await tx.matchFormation.upsert({
        where: { matchId_teamId: { matchId, teamId: data.teamId! } },
        create: { matchId, teamId: data.teamId!, scheme: data.scheme },
        update: { scheme: data.scheme },
      })

      await tx.callUp.deleteMany({
        where: { matchId, player: { teamId: data.teamId! } },
      })

      const slotByPlayer = new Map(
        data.slots
          .filter((s): s is { slotKey: string; playerId: string } => 'playerId' in s)
          .map((s) => [s.playerId, s.slotKey])
      )

      for (const playerId of allIds) {
        const slotKey = slotByPlayer.get(playerId) ?? null
        await tx.callUp.create({
          data: {
            matchId,
            playerId,
            slotKey,
            isStarter: Boolean(slotKey),
          },
        })
      }
    })
  } else {
    if (!data.side) {
      return NextResponse.json({ error: 'side requerido' }, { status: 400 })
    }
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Solo admin edita formaciones amistosas' },
        { status: 403 }
      )
    }

    const slotFpIds = data.slots
      .filter(
        (s): s is { slotKey: string; friendlyPlayerId: string } =>
          'friendlyPlayerId' in s
      )
      .map((s) => s.friendlyPlayerId)
    const benchFp = data.benchFriendlyPlayerIds ?? []
    const allFp = [...new Set([...slotFpIds, ...benchFp])]

    if (allFp.length > 0) {
      const parts = await db.friendlyMatchPlayer.findMany({
        where: { matchId, side: data.side, friendlyPlayerId: { in: allFp } },
      })
      if (parts.length !== allFp.length) {
        return NextResponse.json(
          { error: 'Todos los jugadores deben estar en el plantel de ese lado' },
          { status: 400 }
        )
      }
    }

    await db.$transaction(async (tx) => {
      await tx.matchFormation.upsert({
        where: { matchId_side: { matchId, side: data.side! } },
        create: { matchId, side: data.side!, scheme: data.scheme },
        update: { scheme: data.scheme },
      })

      await tx.friendlyMatchPlayer.updateMany({
        where: { matchId, side: data.side! },
        data: { isStarter: false, slotKey: null },
      })

      const slotByFp = new Map(
        data.slots
          .filter(
            (s): s is { slotKey: string; friendlyPlayerId: string } =>
              'friendlyPlayerId' in s
          )
          .map((s) => [s.friendlyPlayerId, s.slotKey])
      )

      for (const friendlyPlayerId of allFp) {
        const slotKey = slotByFp.get(friendlyPlayerId) ?? null
        await tx.friendlyMatchPlayer.update({
          where: {
            matchId_friendlyPlayerId: { matchId, friendlyPlayerId },
          },
          data: {
            slotKey,
            isStarter: Boolean(slotKey),
          },
        })
      }
    })
  }

  return NextResponse.json({ ok: true })
}
