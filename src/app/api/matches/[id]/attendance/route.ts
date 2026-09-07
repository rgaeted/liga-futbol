import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import {
  MATCH_ATTENDANCE_INCLUDE,
  attendanceClosedMessage,
  canOpenMatchAttendance,
  serializeMatchAttendance,
} from '@/lib/match-attendance'
import { upsertMatchAttendanceSchema } from '@/lib/validations/match-attendance'

async function loadMatch(id: string) {
  return db.match.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      matchType: true,
      status: true,
    },
  })
}

async function loadAttendees(matchId: string) {
  const rows = await db.matchAttendance.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
    include: MATCH_ATTENDANCE_INCLUDE,
  })
  return serializeMatchAttendance(rows)
}

function listPayload(
  match: { id: string; matchType: string; status: string },
  attendees: Awaited<ReturnType<typeof loadAttendees>>
) {
  return {
    matchId: match.id,
    open: canOpenMatchAttendance(match),
    attendees,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const match = await loadMatch(id)
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  return NextResponse.json(listPayload(match, await loadAttendees(match.id)))
}

async function requireSigner(matchId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Ingresa para anotar tu nombre.' }, { status: 401 }) }
  }
  const match = await loadMatch(matchId)
  if (!match) {
    return { error: NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 }) }
  }
  if (!canOpenMatchAttendance(match)) {
    return {
      error: NextResponse.json({ error: attendanceClosedMessage() }, { status: 409 }),
    }
  }
  const player = await findPlayerInOrganization(session.user.id, match.organizationId)
  if (!player) {
    return {
      error: NextResponse.json(
        { error: 'No tienes ficha de jugador en esta liga.' },
        { status: 403 }
      ),
    }
  }
  return { match, player }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const raw = await req.json().catch(() => ({}))
  const parsed = upsertMatchAttendanceSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const signed = await requireSigner(id)
  if ('error' in signed) return signed.error

  await db.matchAttendance.upsert({
    where: {
      matchId_playerId: { matchId: signed.match.id, playerId: signed.player.id },
    },
    create: { matchId: signed.match.id, playerId: signed.player.id },
    update: {},
  })

  return NextResponse.json(listPayload(signed.match, await loadAttendees(signed.match.id)))
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const signed = await requireSigner(id)
  if ('error' in signed) return signed.error

  await db.matchAttendance.deleteMany({
    where: { matchId: signed.match.id, playerId: signed.player.id },
  })

  return NextResponse.json(listPayload(signed.match, await loadAttendees(signed.match.id)))
}
