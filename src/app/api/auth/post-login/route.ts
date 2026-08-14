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

  const path = resolvePostLoginPath({
    isPlatformAdmin: session.user.isPlatformAdmin,
    memberships: memberships.map((m) => ({
      slug: m.organization.slug,
      role: m.role,
      status: m.organization.status,
    })),
  })

  const response = NextResponse.json({ path })

  if (memberships.length === 1 && memberships[0].organization.status === 'ACTIVE') {
    response.cookies.set(orgCookieOptions(memberships[0].organizationId))
  }

  return response
}
