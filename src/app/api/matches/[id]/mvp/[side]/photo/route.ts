import { NextResponse } from 'next/server'
import { MatchStatus, Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  buildMatchTeamMvps,
  MATCH_MVP_INCLUDE,
} from '@/lib/match-mvp'
import {
  matchTeamMvpHasPhoto,
  parseMatchMvpSideParam,
  validateMatchMvpPhoto,
  matchMvpPhotoUrl,
} from '@/lib/match-mvp-photo'
import { matchSideNames } from '@/lib/match-label'
import { emitMatchUpdate } from '@/server/socket'

async function canEditMvp(userId: string, role: Role, match: { refereeId: string | null }) {
  if (role === Role.ADMIN) return true
  if (role === Role.REFEREE && match.refereeId === userId) return true
  return false
}

type RouteParams = { params: Promise<{ id: string; side: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const { id, side: sideParam } = await params
  const side = parseMatchMvpSideParam(sideParam)
  if (!side) {
    return NextResponse.json({ error: 'Lado inválido' }, { status: 400 })
  }

  const row = await db.matchTeamMvp.findUnique({
    where: { matchId_side: { matchId: id, side } },
    select: { photoMimeType: true, photoData: true },
  })

  if (!row || !matchTeamMvpHasPhoto(row)) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(row.photoData, {
    headers: {
      'Content-Type': row.photoMimeType!,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id, side: sideParam } = await params
  const side = parseMatchMvpSideParam(sideParam)
  if (!side) {
    return NextResponse.json({ error: 'Lado inválido' }, { status: 400 })
  }

  const match = await db.match.findUnique({
    where: { id },
    select: {
      id: true,
      matchType: true,
      status: true,
      refereeId: true,
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
      { error: 'Solo se puede subir foto MVP en partidos finalizados' },
      { status: 400 }
    )
  }

  const existing = await db.matchTeamMvp.findUnique({
    where: { matchId_side: { matchId: id, side } },
    select: { id: true, playerId: true, friendlyPlayerId: true },
  })

  if (!existing || (!existing.playerId && !existing.friendlyPlayerId)) {
    return NextResponse.json(
      { error: 'Primero elige y guarda un jugador MVP para este equipo' },
      { status: 400 }
    )
  }

  const form = await req.formData()
  const file = form.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Debes enviar un archivo photo' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'application/octet-stream'
  const validation = validateMatchMvpPhoto(buffer, mimeType)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  await db.matchTeamMvp.update({
    where: { matchId_side: { matchId: id, side } },
    data: { photoMimeType: mimeType, photoData: buffer },
  })

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

  return NextResponse.json({
    ok: true,
    photoUrl: matchMvpPhotoUrl(id, side),
    teamMvps,
  })
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id, side: sideParam } = await params
  const side = parseMatchMvpSideParam(sideParam)
  if (!side) {
    return NextResponse.json({ error: 'Lado inválido' }, { status: 400 })
  }

  const match = await db.match.findUnique({
    where: { id },
    select: {
      id: true,
      matchType: true,
      status: true,
      refereeId: true,
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

  await db.matchTeamMvp.updateMany({
    where: { matchId: id, side },
    data: { photoMimeType: null, photoData: null },
  })

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

  return NextResponse.json({ ok: true, teamMvps })
}
