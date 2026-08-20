import { NextResponse } from 'next/server'
import { MatchStatus, MatchType } from '@prisma/client'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  assertMvpInMatchRoster,
  buildMatchTeamMvps,
  buildTeamMvpView,
  MATCH_MVP_INCLUDE,
} from '@/lib/match-mvp'
import { setMatchMvpSchema } from '@/lib/validations/mvp'
import { matchSideNames } from '@/lib/match-label'
import { publishMatchInvalidation } from '@/lib/supabase-realtime-server'
import { MembershipRole } from '@/lib/membership-role'
import type { MembershipRole as MembershipRoleType } from '@/lib/membership-role'

async function canEditMvp(
  userId: string,
  role: MembershipRoleType,
  match: { refereeId: string | null }
) {
  if (role === MembershipRole.ORG_ADMIN) return true
  if (role === MembershipRole.REFEREE && match.refereeId === userId) return true
  return false
}

function sidePayload(input: { playerId?: string | null }) {
  return {
    playerId: input.playerId ?? null,
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let authContext: Awaited<ReturnType<typeof requireOrgRole>>
  try {
    authContext = await requireOrgRole([
      MembershipRole.ORG_ADMIN,
      MembershipRole.REFEREE,
    ])
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { organizationId, role, session } = authContext

  const { id } = await params
  const parsed = setMatchMvpSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const match = await db.match.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
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
  assertSameOrganization(match.organizationId, organizationId)

  if (!(await canEditMvp(session.user.id, role, match))) {
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

  const playerFields = sidePayload(parsed.data)
  const hasPlayer = Boolean(playerFields.playerId)

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

  await publishMatchInvalidation(id)

  return NextResponse.json({ side: updatedSide, teamMvps })
}
