import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { primaryMembershipRole } from '@/lib/membership-role'
import { syncPlayerDerivedMemberships } from '@/lib/player-memberships'
import { listAccessibleMemberships } from '@/lib/tenant-access'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  await syncPlayerDerivedMemberships(session.user.id)

  const memberships = await listAccessibleMemberships(
    session.user.id,
    session.user.isPlatformAdmin,
  )

  return NextResponse.json(
    memberships.map((m) => ({
      organizationId: m.organizationId,
      slug: m.slug,
      name: m.name,
      roles: m.roles,
      role: primaryMembershipRole(m.roles),
    })),
  )
}
