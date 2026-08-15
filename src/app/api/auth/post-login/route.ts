import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getDashboardPath } from '@/lib/membership-role'
import { orgCookieOptions } from '@/lib/org-cookie'
import { resolvePostLoginPath } from '@/lib/post-login-redirect'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const memberships = await db.organizationMembership.findMany({
    where: { userId: session.user.id },
    include: {
      organization: { select: { slug: true, status: true } },
    },
  })

  const activeMemberships = memberships.filter((m) => m.organization.status === 'ACTIVE')

  const path = resolvePostLoginPath({
    isPlatformAdmin: session.user.isPlatformAdmin,
    memberships: activeMemberships.map((m) => ({
      slug: m.organization.slug,
      role: m.role,
      status: m.organization.status,
    })),
  })

  const response = NextResponse.json({ path })

  if (activeMemberships.length === 1) {
    response.cookies.set(orgCookieOptions(activeMemberships[0].organizationId))
  }

  return response
}
