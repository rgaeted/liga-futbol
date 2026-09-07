import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasAnyMembershipRole, MembershipRole } from '@/lib/membership-role'

type PlayerPhotoRow = {
  id: string
  organizationId: string
  personId: string
}

export async function requirePlayerPhotoMutation(playerId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    } as const
  }

  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      organizationId: true,
      personId: true,
      person: { select: { userId: true } },
    },
  })
  if (!player) {
    return {
      error: NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 }),
    } as const
  }

  if (player.person.userId === session.user.id) {
    return { player: player satisfies PlayerPhotoRow } as const
  }

  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: player.organizationId,
        userId: session.user.id,
      },
    },
  })

  if (membership && hasAnyMembershipRole(membership.roles, [MembershipRole.ORG_ADMIN])) {
    return { player: player satisfies PlayerPhotoRow } as const
  }

  if (session.user.isPlatformAdmin) {
    const org = await db.organization.findUnique({
      where: { id: player.organizationId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (org) {
      return { player: player satisfies PlayerPhotoRow } as const
    }
  }

  return {
    error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }),
  } as const
}
