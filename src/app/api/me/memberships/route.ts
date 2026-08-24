import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { primaryMembershipRole } from '@/lib/membership-role'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const memberships = await db.organizationMembership.findMany({
    where: {
      userId: session.user.id,
      organization: { status: 'ACTIVE' },
    },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { organization: { name: 'asc' } },
  })

  return NextResponse.json(
    memberships.map((m) => ({
      organizationId: m.organizationId,
      slug: m.organization.slug,
      name: m.organization.name,
      roles: m.roles,
      role: primaryMembershipRole(m.roles),
    })),
  )
}
