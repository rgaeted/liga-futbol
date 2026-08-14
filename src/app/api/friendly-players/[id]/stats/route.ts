import { NextResponse } from 'next/server'
import { MatchType, MatchStatus } from '@prisma/client'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { db } from '@/lib/db'
import { aggregateFriendlyEvents } from '@/lib/friendly-stats'
import { MembershipRole } from '@/lib/membership-role'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let authContext: Awaited<ReturnType<typeof requireOrgRole>>
  try {
    authContext = await requireOrgRole([
      MembershipRole.ORG_ADMIN,
      MembershipRole.PLAYER,
      MembershipRole.FRIENDLY_COACH,
    ])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { organizationId, role, session } = authContext

  const { id } = await params
  const friendlyPlayer = await db.friendlyPlayer.findUnique({ where: { id } })
  if (!friendlyPlayer) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(friendlyPlayer.organizationId, organizationId)

  const isAdmin = role === MembershipRole.ORG_ADMIN
  const person = await db.person.findUnique({
    where: { id: friendlyPlayer.personId },
    select: { userId: true },
  })
  const isOwner = person?.userId === session.user.id
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
