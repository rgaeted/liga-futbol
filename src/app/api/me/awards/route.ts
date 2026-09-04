import { NextResponse } from 'next/server'
import { auth, requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { findPlayerInOrganization } from '@/lib/player-org-profile'
import { serializePlayerAwardBadge } from '@/lib/player-awards'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { organizationId } = await requireOrgRole([
    MembershipRole.ORG_ADMIN,
    MembershipRole.PLAYER,
    MembershipRole.COACH,
    MembershipRole.REFEREE,
    MembershipRole.FRIENDLY_COACH,
  ])

  const player = await findPlayerInOrganization(session.user.id, organizationId)
  if (!player) {
    return NextResponse.json([])
  }

  const awards = await db.playerAward.findMany({
    where: { playerId: player.id, organizationId },
    include: {
      orgAward: true,
      season: { select: { id: true, name: true } },
    },
    orderBy: { awardedAt: 'desc' },
  })

  return NextResponse.json(awards.map(serializePlayerAwardBadge))
}
